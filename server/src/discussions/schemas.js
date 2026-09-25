const { z } = require("zod");
const id = z.string().cuid();
const params = z.object({ teamId: id });
const topicParams = params.extend({ topicId: id });
const category = z.enum(["PROBLEM", "FEEDBACK", "DISCUSSION"]);
const bodyText = z.string().trim().min(1, "Write a message first").max(4000);
const empty = z.object({}).strict();
const listSchema = z.object({ params, body: empty, query: z.object({
  status: z.enum(["ALL", "OPEN", "RESOLVED"]).default("ALL"),
  category: z.enum(["ALL", "PROBLEM", "FEEDBACK", "DISCUSSION"]).default("ALL"),
  cursor: id.optional(),
}).strict() });
const createSchema = z.object({ params, query: empty, body: z.object({
  title: z.string().trim().min(3).max(160), category: category.default("DISCUSSION"),
  body: bodyText, clientTopicId: z.string().uuid(),
}).strict() });
const readSchema = z.object({ params: topicParams, body: empty, query: z.object({
  after: z.coerce.number().int().min(0).max(2147483647).optional(),
  before: z.coerce.number().int().min(1).max(2147483647).optional(),
}).strict().refine(q => q.after === undefined || q.before === undefined, "Use only one message cursor") });
const messageSchema = z.object({ params: topicParams, query: empty, body: z.object({
  body: bodyText, clientMessageId: z.string().uuid(),
}).strict() });
const statusSchema = z.object({ params: topicParams, query: empty, body: z.object({
  status: z.enum(["OPEN", "RESOLVED"]), version: z.number().int().min(0).max(2147483647),
}).strict() });

// Express 5's req.query is a getter: keep the parsed/coerced input separately.
const validateDiscussion = schema => (req, res, next) => {
  const result = schema.safeParse({ params: req.params, query: req.query, body: req.body || {} });
  if (!result.success) return res.status(400).json({ message: "Check the discussion fields and try again.", errors: result.error.flatten() });
  req.discussionInput = result.data;
  next();
};
module.exports = { listSchema, createSchema, readSchema, messageSchema, statusSchema, validateDiscussion };
