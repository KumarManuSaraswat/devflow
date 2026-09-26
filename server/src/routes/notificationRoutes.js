const express = require("express");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const { asyncHandler } = require("../utils/asyncHandler");
const { enabled, activeMember, LABELS } = require("../notifications/events");
const { configured } = require("../notifications/firebase");
const fail = (statusCode, message) => { throw { statusCode, message }; };
const identifier = z.string().cuid();
const tokenSchema = z.object({ token: z.string().min(20).max(4096).regex(/^[A-Za-z0-9_:.-]+$/) }).strict();
const select = { id: true, kind: true, href: true, createdAt: true, readAt: true };
const safeNote = note => ({ ...note, title: LABELS[note.kind] || "Team update" });

function createNotificationRoutes({ db, authenticate, isEnabled = enabled, pushConfigured = configured }) {
  const router = express.Router();
  router.use(authenticate);
  router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  router.use(rateLimit({ windowMs: 60000, limit: 90, keyGenerator: req => req.user.id,
    standardHeaders: "draft-7", legacyHeaders: false }));
  router.get("/settings", (_req, res) => res.json({ enabled: isEnabled(), pushAvailable: pushConfigured() }));
  router.use((_req, _res, next) => isEnabled() ? next() : next({ statusCode: 503, message: "Notifications are not enabled on this server yet." }));
  const visible = userId => ({ userId, team: { members: { some: { userId, ...activeMember() } } } });

  router.get("/", asyncHandler(async (req, res) => {
    const parsed = z.object({ before: identifier.optional() }).strict().safeParse(req.query);
    if (!parsed.success) fail(400, "Invalid notification cursor");
    const where = visible(req.user.id);
    if (parsed.data.before) {
      const cursor = await db.notification.findFirst({ where: { ...where, id: parsed.data.before }, select: { id: true, createdAt: true } });
      if (!cursor) fail(404, "Notification not found");
      where.OR = [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }];
    }
    const rows = await db.notification.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 31, select });
    const unread = await db.notification.count({ where: { ...visible(req.user.id), readAt: null } });
    res.json({ notifications: rows.slice(0, 30).map(safeNote), unread, nextCursor: rows.length > 30 ? rows[29].id : null });
  }));
  router.post("/devices", asyncHandler(async (req, res) => {
    if (!pushConfigured()) fail(503, "Phone notifications need Firebase setup on the server.");
    const input = tokenSchema.safeParse(req.body);
    if (!input.success) fail(400, "Invalid device registration");
    const device = await db.$transaction(async tx => {
      const previous = await tx.pushDevice.findUnique({ where: { token: input.data.token } });
      if (!previous || previous.userId !== req.user.id) {
        if (await tx.pushDevice.count({ where: { userId: req.user.id, expiresAt: { gt: new Date() } } }) >= 10) fail(400, "You can enable up to 10 devices. Disable an old device first.");
        // A shared phone must never receive the previous account's queued alerts.
        if (previous) await tx.pushDelivery.deleteMany({ where: { deviceId: previous.id } });
      }
      return tx.pushDevice.upsert({ where: { token: input.data.token },
        create: { userId: req.user.id, token: input.data.token, expiresAt: new Date(Date.now() + 90 * 86400000) },
        update: { userId: req.user.id, expiresAt: new Date(Date.now() + 90 * 86400000) }, select: { id: true } });
    });
    res.json({ device });
  }));
  router.delete("/devices/:id", asyncHandler(async (req, res) => {
    if (!identifier.safeParse(req.params.id).success) fail(400, "Invalid device");
    await db.pushDevice.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    res.sendStatus(204);
  }));
  router.get("/:id", asyncHandler(async (req, res) => {
    if (!identifier.safeParse(req.params.id).success) fail(400, "Invalid notification");
    const notification = await db.notification.findFirst({ where: { ...visible(req.user.id), id: req.params.id }, select });
    if (!notification) fail(404, "Notification not found or team access has ended");
    res.json({ notification: safeNote(notification) });
  }));
  router.patch("/:id/read", asyncHandler(async (req, res) => {
    if (!identifier.safeParse(req.params.id).success || !z.object({}).strict().safeParse(req.body).success) fail(400, "Invalid notification request");
    const updated = await db.notification.updateMany({ where: { ...visible(req.user.id), id: req.params.id }, data: { readAt: new Date() } });
    if (!updated.count) fail(404, "Notification not found");
    res.sendStatus(204);
  }));
  return router;
}
module.exports = { createNotificationRoutes, tokenSchema };
