const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const express = require("express");
const { advise } = require("../src/assistant/advisor");
const { SKILLS, chatSchema, profileSchema } = require("../src/assistant/schemas");
const { activeMembershipWhere, loadContext, canEditProfile } = require("../src/assistant/context");
const { configuration, createQuotaStore, cloudPayload, respond } = require("../src/assistant/providers");
const { createAssistantRoutes } = require("../src/routes/assistantRoutes");
const { createTaskSchema, updateTaskSchema } = require("../src/utils/taskSchemas");

const id = n => `c${String(n).padStart(24, "0")}`;
const member = (n, overrides = {}) => ({ id: id(n + 100), userId: id(n), role: "DEVELOPER", skills: ["React"], weeklyHours: 20, user: { name: `Person ${n}` }, ...overrides });
const task = (n, userId, overrides = {}) => ({ id: id(n), projectId: id(20), title: `Private task ${n}`, status: "IN_PROGRESS", requiredSkills: ["React"], estimatedHours: 8,
  assignees: [{ userId }], reviewers: [], ...overrides });
function fixture() {
  return { members: [member(1), member(2, { skills: ["Python"] }), member(3, { weeklyHours: 0 }), member(4, { role: "REVIEWER" })],
    projects: [{ id: id(20), name: "Private Project" }], tasks: [task(30, id(1)), task(31, id(2), { status: "COMPLETED" })], selectedTask: null, skills: SKILLS };
}
const input = { message: "Who should build the React interface?", intent: "assign", requiredSkills: [], allowCloud: true };
const env = { ASSISTANT_CLOUD_ENABLED: "true", ASSISTANT_FREE_TIER_CONFIRMED: "true", GEMINI_API_KEY: "test-gemini", GROQ_API_KEY: "test-groq" };
const mockQuota = () => ({ reserve: async () => true, block: async () => {} });
const ok = (source, text = "Plan your milestones and confirm availability.") => new Response(JSON.stringify(source === "gemini" ? { candidates: [{ content: { parts: [{ text }] } }] } : { choices: [{ message: { content: text } }] }), { status: 200 });

test("skills outrank low workload; unavailable/reviewer-only members excluded; completed tasks ignored", () => {
  const result = advise(fixture(), input);
  assert.deepEqual(result.recommendations.map(m => m.userId), [id(1), id(2)]);
  assert.equal(result.recommendations[0].estimatedOpenHours, 8);
  assert.equal(result.recommendations[1].openTasks, 0);
  assert.equal(result.stats.openTasks, 1);
});
test("selected task is excluded from burden; review candidates exclude its authors", () => {
  const context = fixture();
  context.selectedTask = context.tasks[0];
  assert.equal(advise(context, input).recommendations[0].openTasks, 0);
  context.members[0].role = "OWNER";
  const result = advise(context, { ...input, message: "Which reviewer should review this?" });
  assert.deepEqual(result.recommendations.map(m => m.userId), [id(4)]);
});
test("team size is calculated from explicit estimates or asks for missing data", () => {
  const context = fixture();
  const result = advise(context, { ...input, intent: "team", totalHours: 200, weeks: 5, hoursPerMember: 10 });
  assert.deepEqual(result.teamSize, { baseline: 4, buffered: 5 });
  assert.match(advise(context, { ...input, intent: "team" }).answer, /won't invent/);
});
test("missing skills/availability and missing estimates are disclosed", () => {
  const context = fixture();
  context.members[0].skills = [];
  context.members[0].weeklyHours = null;
  context.tasks[0].estimatedHours = null;
  const result = advise(context, input);
  assert.ok(result.warnings.some(w => w.includes("missing")));
  assert.ok(result.warnings.some(w => w.includes("No available")));
  assert.ok(result.recommendations.find(m => m.userId === id(1)).reasons.some(r => r.includes("no effort estimate")));
});
test("cloud disabled or not consented never fetches or reserves", async () => {
  for (const [settings, question] of [[{}, input], [env, { ...input, allowCloud: false }], [{ ...env, ASSISTANT_FREE_TIER_CONFIRMED: "false" }, input]]) {
    const result = await respond({ context: fixture(), input: question, env: settings, quota: {}, fetchImpl: () => assert.fail("No cloud request allowed") });
    assert.equal(result.source, "builtin");
  }
});
test("Gemini success skips Groq and uses header key, bounded output and no tools", async () => {
  let count = 0;
  const result = await respond({ context: fixture(), input, env, quota: mockQuota(), fetchImpl: async (url, options) => {
    count++;
    assert.ok(url.includes("generativelanguage"));
    assert.ok(!url.includes(env.GEMINI_API_KEY));
    assert.equal(options.headers["x-goog-api-key"], env.GEMINI_API_KEY);
    const body = JSON.parse(options.body);
    assert.equal(body.generationConfig.maxOutputTokens, 700);
    assert.equal(body.tools, undefined);
    return ok("gemini");
  } });
  assert.equal(result.source, "gemini");
  assert.equal(count, 1);
});
test("Gemini 429 falls through to Groq and blocks Gemini conservatively for 24 hours", async () => {
  const blocked = [];
  const quota = { ...mockQuota(), block: async (...args) => blocked.push(args) };
  const result = await respond({ context: fixture(), input, env, quota, fetchImpl: async (url, options) => {
    if (url.includes("generativelanguage")) return new Response("quota", { status: 429 });
    assert.equal(options.headers.Authorization, "Bearer test-groq");
    assert.equal(JSON.parse(options.body).max_completion_tokens, 700);
    return ok("groq");
  } });
  assert.equal(result.source, "groq");
  assert.deepEqual(blocked, [["gemini", 86400000]]);
});
test("a spent Gemini request budget skips its network call and tries Groq", async () => {
  const result = await respond({ context: fixture(), input, env,
    quota: { ...mockQuota(), reserve: async provider => provider === "groq" },
    fetchImpl: async url => { assert.ok(url.includes("groq.com")); return ok("groq"); } });
  assert.equal(result.source, "groq");
});
test("both limits exhausted, absent Groq key, bad keys, timeouts and malformed responses fall back", async () => {
  const exhausted = await respond({ context: fixture(), input, env, quota: { reserve: async () => false }, fetchImpl: () => assert.fail() });
  assert.equal(exhausted.source, "builtin");
  for (const fetchImpl of [async () => new Response("bad key", { status: 401 }), async () => { throw new Error("timeout"); }, async () => new Response("broken JSON"), async () => ok("gemini", "")]) {
    const result = await respond({ context: fixture(), input, env: { ...env, GROQ_API_KEY: "" }, quota: mockQuota(), fetchImpl });
    assert.equal(result.source, "builtin");
    assert.equal(result.reason, "cloud_unavailable");
  }
});
test("quota database errors fail closed", async () => {
  const result = await respond({ context: fixture(), input, env, quota: { reserve: async () => { throw new Error("database unavailable"); } }, fetchImpl: () => assert.fail() });
  assert.equal(result.reason, "quota_store_unavailable");
});
test("cloud payload omits IDs and private DB labels, replaces known names, blocks likely keys", () => {
  const context = fixture();
  const question = { ...input, message: "Can Person 1 work on Private Project? Email me at x@example.com" };
  const payload = cloudPayload(context, question, advise(context, question));
  for (const value of ["Person 1", "Private Project", "Private task", "x@example.com", id(1)]) assert.ok(!payload.includes(value));
  assert.equal(cloudPayload(context, { ...input, message: `Here is my key gsk_${"x".repeat(25)}` }, advise(context, input)), null);
});
test("daily caps cannot be configured above hard ceilings or with invalid values", () => {
  assert.equal(configuration({ ...env, ASSISTANT_GEMINI_DAILY_REQUESTS: "1000000" }).gemini.limit, 100);
  assert.equal(configuration({ ...env, ASSISTANT_GROQ_DAILY_REQUESTS: "NaN" }).groq.limit, 0);
  assert.equal(configuration({ ...env, ASSISTANT_GROQ_DAILY_REQUESTS: "0" }).groq.limit, 0);
});

function quotaDb() {
  const rows = new Map();
  return { assistantQuota: {
    findUnique: async ({ where }) => rows.get(where.id),
    upsert: async ({ where, create }) => { if (!rows.has(where.id)) rows.set(where.id, { used: 0, ...create }); },
    updateMany: async ({ where, data }) => {
      const row = rows.get(where.id);
      if (!row || (where.used && row.used >= where.used.lt)) return { count: 0 };
      if (where.OR && row.blockedUntil && row.blockedUntil >= where.OR[1].blockedUntil.lt) return { count: 0 };
      if (data.used) row.used += data.used.increment;
      if (data.blockedUntil) row.blockedUntil = data.blockedUntil;
      return { count: 1 };
    },
  } };
}
test("shared quota survives new store instances, handles concurrent reservations and UTC rollover", async () => {
  const db = quotaDb();
  let time = new Date("2026-09-21T23:59:00Z");
  const a = createQuotaStore(db, () => time);
  const b = createQuotaStore(db, () => time);
  const reservations = await Promise.all(Array.from({ length: 20 }, (_, i) => (i % 2 ? a : b).reserve("gemini", 3)));
  assert.equal(reservations.filter(Boolean).length, 3);
  time = new Date("2026-09-22T00:01:00Z");
  assert.equal(await b.reserve("gemini", 3), true);
  await a.block("gemini", 86400000);
  await b.block("gemini", 60000);
  time = new Date("2026-09-22T00:03:00Z");
  assert.equal(await b.reserve("gemini", 3), false);
  time = new Date("2026-09-23T00:02:00Z");
  assert.equal(await b.reserve("gemini", 3), true);
});

function contextDb({ authorized = true } = {}) {
  const context = fixture();
  return {
    teamMember: {
      findFirst: async ({ where }) => {
        assert.equal(where.teamId, id(10)); assert.ok(where.startsAt.lte); assert.ok(where.OR[1].expiresAt.gt);
        return authorized ? { userId: id(1), role: "OWNER" } : null;
      },
      findMany: async ({ where }) => { assert.equal(where.teamId, id(10)); assert.equal(where.isActive, true); return context.members; },
    },
    project: { findMany: async ({ where }) => { assert.equal(where.teamId, id(10)); return context.projects; } },
    task: { findMany: async ({ where }) => { assert.equal(where.project.teamId, id(10)); return context.tasks.filter(t => t.status !== "COMPLETED"); } },
  };
}
test("context requires active membership and refuses foreign projects/tasks and mismatched selection", async () => {
  assert.ok(activeMembershipWhere(id(10)).startsAt.lte instanceof Date);
  await assert.rejects(loadContext(contextDb({ authorized: false }), id(10), id(1)), { statusCode: 403 });
  for (const selection of [{ projectId: id(99) }, { taskId: id(99) }, { taskId: id(31) }]) {
    await assert.rejects(loadContext(contextDb(), id(10), id(1), selection), { statusCode: 404 });
  }
  assert.equal((await loadContext(contextDb(), id(10), id(1), { projectId: id(20), taskId: id(30) })).selectedTask.id, id(30));
});
test("member profile permissions preserve role boundaries", () => {
  assert.ok(canEditProfile({ userId: "a", role: "DEVELOPER" }, { userId: "a" }));
  assert.ok(!canEditProfile({ userId: "a", role: "DEVELOPER" }, { userId: "b" }));
  assert.ok(!canEditProfile({ userId: "a", role: "ADMIN" }, { userId: "b", role: "OWNER" }));
  assert.ok(canEditProfile({ userId: "a", role: "OWNER" }, { userId: "b" }));
});
test("members endpoint returns the recorded planning fields", async () => {
  const { prisma } = require("../src/config/prisma");
  const { getTeamMembers } = require("../src/controllers/teamController");
  const original = prisma.teamMember.findMany;
  try {
    prisma.teamMember.findMany = async ({ where, select }) => {
      assert.equal(where.teamId, id(10));
      assert.equal(select.skills, true);
      assert.equal(select.weeklyHours, true);
      return [member(1)];
    };
    const res = { status() { return this; }, json(value) { assert.deepEqual(value.members[0].skills, ["React"]); } };
    await getTeamMembers({ params: { teamId: id(10) } }, res);
  } finally { prisma.teamMember.findMany = original; }
});
test("task creation persists required skills and effort", async () => {
  const { prisma } = require("../src/config/prisma");
  const { createTask } = require("../src/controllers/taskController");
  const originalProject = prisma.project.findUnique;
  const originalTransaction = prisma.$transaction;
  try {
    prisma.project.findUnique = async () => ({ id: id(20), teamId: id(10) });
    prisma.$transaction = async callback => callback({
      teamMember: { findMany: async () => [{ userId: id(1), role: "DEVELOPER" }] },
      task: { create: async ({ data }) => {
        assert.deepEqual(data.requiredSkills, ["React"]);
        assert.equal(data.estimatedHours, 8);
        return { id: id(30), ...data };
      } },
      taskActivity: { create: async () => ({}) },
    });
    await createTask({ params: { projectId: id(20) }, user: { id: id(1) }, body: {
      title: "Test task", assigneeIds: [id(1)], reviewerIds: [], priority: 2, requiredSkills: ["React"], estimatedHours: 8,
    } }, { status(code) { assert.equal(code, 201); return this; }, json(value) { assert.equal(value.task.estimatedHours, 8); } });
  } finally { prisma.project.findUnique = originalProject; prisma.$transaction = originalTransaction; }
});
test("validation bounds all inputs and rejects role/membership injection", () => {
  const req = { params: { teamId: id(10) }, query: {}, body: input };
  assert.ok(chatSchema.safeParse(req).success);
  for (const extra of [{ message: "x".repeat(2001) }, { totalHours: 0 }, { requiredSkills: ["untrusted custom skill"] }, { members: [] }, { allowCloud: "true" }]) {
    assert.ok(!chatSchema.safeParse({ ...req, body: { ...input, ...extra } }).success);
  }
  assert.ok(!profileSchema.safeParse({ ...req, params: { teamId: id(10), memberId: id(1) }, body: { skills: [], weeklyHours: 20, role: "OWNER" } }).success);
  assert.ok(updateTaskSchema.safeParse({ params: { taskId: id(30) }, query: {}, body: { requiredSkills: ["React"], estimatedHours: null } }).success);
  assert.ok(createTaskSchema.safeParse({ params: { projectId: id(20) }, query: {}, body: { title: "Test task", assigneeIds: [id(1)], estimatedHours: 2, requiredSkills: ["React"] } }).success);
});
test("client skill catalog matches the server catalog", () => {
  const source = readFileSync(path.join(__dirname, "../../client/src/utils/skills.js"), "utf8");
  const catalog = JSON.parse(source.match(/\[[\s\S]*?\]/)[0]);
  assert.deepEqual(catalog, SKILLS);
});

test("HTTP endpoints enforce authentication, scoping, validation, rate limits and no-store responses", async t => {
  const app = express();
  app.use(express.json());
  const db = contextDb();
  app.use("/api/teams/:teamId/assistant", createAssistantRoutes({ db, env: {},
    authenticate: (req, res, next) => req.headers["x-test-user"] ? (req.user = { id: req.headers["x-test-user"] }, next()) : res.sendStatus(401) }));
  app.use((err, req, res, next) => res.status(err.statusCode || 500).json({ message: err.message }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/teams/${id(10)}/assistant`;
  const headers = { "Content-Type": "application/json", "x-test-user": id(1) };
  assert.equal((await fetch(`${base}/context`)).status, 401);
  const response = await fetch(`${base}/chat`, { method: "POST", headers, body: JSON.stringify({ ...input, allowCloud: false }) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await response.json()).source, "builtin");
  assert.equal((await fetch(`${base}/chat`, { method: "POST", headers, body: JSON.stringify({ message: "Hi" }) })).status, 400);
  assert.equal((await fetch(`${base}/chat`, { method: "POST", headers, body: JSON.stringify({ ...input, projectId: id(99) }) })).status, 404);
  for (let i = 0; i < 7; i++) assert.equal((await fetch(`${base}/context`, { headers })).status, 200);
  assert.equal((await fetch(`${base}/context`, { headers })).status, 429);
});
