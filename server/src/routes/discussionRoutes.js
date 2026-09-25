const express = require("express");
const rateLimit = require("express-rate-limit");
const { asyncHandler } = require("../utils/asyncHandler");
const { createDiscussionService } = require("../discussions/service");
const { listSchema, createSchema, readSchema, messageSchema, statusSchema, validateDiscussion } = require("../discussions/schemas");

function createDiscussionRoutes({ db, authenticate }) {
  const router = express.Router({ mergeParams: true });
  const service = createDiscussionService(db);
  router.use(authenticate);
  router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  const limiter = limit => rateLimit({ windowMs: 60000, limit, keyGenerator: req => req.user.id,
    standardHeaders: "draft-7", legacyHeaders: false, message: { message: "Please wait a minute before trying again." } });
  const readLimit = limiter(120);
  const writeLimit = limiter(30);
  const handle = method => asyncHandler(async (req, res) => {
    const { params, body, query } = req.discussionInput;
    let result;
    if (method === "list") result = await service.list(params.teamId, req.user.id, query);
    if (method === "create") result = await service.create(params.teamId, req.user.id, body);
    if (method === "read") result = await service.read(params.teamId, req.user.id, params.topicId, query);
    if (method === "message") result = await service.message(params.teamId, req.user.id, params.topicId, body);
    if (method === "status") result = await service.status(params.teamId, req.user.id, params.topicId, body);
    res.status(["create", "message"].includes(method) && !result.replayed ? 201 : 200).json(result);
  });
  router.get("/", readLimit, validateDiscussion(listSchema), handle("list"));
  router.post("/", writeLimit, validateDiscussion(createSchema), handle("create"));
  router.get("/:topicId", readLimit, validateDiscussion(readSchema), handle("read"));
  router.post("/:topicId/messages", writeLimit, validateDiscussion(messageSchema), handle("message"));
  router.patch("/:topicId/status", writeLimit, validateDiscussion(statusSchema), handle("status"));
  return router;
}
module.exports = { createDiscussionRoutes };
