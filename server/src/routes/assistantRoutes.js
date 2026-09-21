const express = require("express");
const rateLimit = require("express-rate-limit");
const { validate } = require("../middleware/validate");
const { asyncHandler } = require("../utils/asyncHandler");
const { contextSchema, chatSchema } = require("../assistant/schemas");
const { loadContext } = require("../assistant/context");
const { availability, createQuotaStore, respond } = require("../assistant/providers");

function createAssistantRoutes({ db, authenticate, env = process.env, fetchImpl = fetch }) {
  const router = express.Router({ mergeParams: true });
  router.use(authenticate);
  router.use(rateLimit({ windowMs: 60000, limit: 10, keyGenerator: req => req.user.id,
    standardHeaders: "draft-7", legacyHeaders: false,
    message: { message: "Please wait a minute before asking again." } }));
  router.get("/context", validate(contextSchema), asyncHandler(async (req, res) => {
    const context = await loadContext(db, req.params.teamId, req.user.id);
    res.set("Cache-Control", "no-store").json({ projects: context.projects, skills: context.skills,
      tasks: context.tasks.map(({ assignees, reviewers, ...task }) => task),
      memberCount: context.members.length, providers: availability(env) });
  }));
  router.post("/chat", validate(chatSchema), asyncHandler(async (req, res) => {
    const context = await loadContext(db, req.params.teamId, req.user.id, req.body);
    const result = await respond({ context, input: req.body, quota: createQuotaStore(db), env, fetchImpl });
    res.set("Cache-Control", "no-store").json(result);
  }));
  return router;
}

module.exports = { createAssistantRoutes };
