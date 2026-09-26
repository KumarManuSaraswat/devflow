const { activeMember } = require("./events");
const { configured, sendPush } = require("./firebase");
const terminalCodes = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token"]);
const errorCode = error => typeof error?.code === "string" && /^messaging\/[a-z-]+$/.test(error.code) ? error.code : "push/send-failed";

function createPushWorker({ db, send = sendPush, isConfigured = configured, now = () => new Date(), logger = console }) {
  let running = false;
  async function tick() {
    if (running || !isConfigured()) return;
    running = true;
    try {
      const due = { state: "PENDING", nextAttemptAt: { lte: now() }, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now() } }] };
      const rows = await db.pushDelivery.findMany({ where: due, orderBy: { nextAttemptAt: "asc" }, take: 20, select: { id: true } });
      for (const { id } of rows) {
        const lease = new Date(now().getTime() + 120000);
        const claim = await db.pushDelivery.updateMany({ where: { id, ...due }, data: { lockedUntil: lease, attempts: { increment: 1 } } });
        if (!claim.count) continue;
        const row = await db.pushDelivery.findUnique({ where: { id }, include: { notification: true, device: true } });
        if (!row) continue;
        const finish = data => db.pushDelivery.updateMany({ where: { id, lockedUntil: lease }, data: { ...data, lockedUntil: null } });
        if (row.attempts > 6) { await finish({ state: "FAILED" }); continue; }
        const note = row.notification;
        const member = await db.teamMember.findFirst({ where: { teamId: note.teamId, userId: note.userId, ...activeMember(now()) }, select: { id: true } });
        if (!member || note.readAt || row.device.userId !== note.userId || row.device.expiresAt <= now()
          || now() - note.createdAt > 7 * 86400000) {
          await finish({ state: "SKIPPED" }); continue;
        }
        try {
          await send(row.device, note);
          await finish({ state: "SENT", lastErrorCode: null });
        } catch (error) {
          const code = errorCode(error);
          if (terminalCodes.has(code)) {
            await db.pushDevice.deleteMany({ where: { id: row.device.id, token: row.device.token, userId: note.userId } });
          } else {
            await finish({ state: row.attempts >= 6 ? "FAILED" : "PENDING", lastErrorCode: code,
              nextAttemptAt: new Date(now().getTime() + Math.min(3600000, 30000 * 2 ** row.attempts)) });
          }
        }
      }
    } catch {
      // Never print provider errors, registration tokens or service-account contents.
      logger.error("Push delivery queue could not be processed; it will retry.");
    } finally { running = false; }
  }
  return { tick, start() { void tick(); const timer = setInterval(() => void tick(), 15000); timer.unref(); return () => clearInterval(timer); } };
}
module.exports = { createPushWorker, errorCode };
