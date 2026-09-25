const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const express = require("express");
const { createDiscussionService } = require("../src/discussions/service");
const { createSchema, messageSchema, readSchema, statusSchema } = require("../src/discussions/schemas");
const { createDiscussionRoutes } = require("../src/routes/discussionRoutes");
const { memoryDiscussionDb, id } = require("../test-support/discussionDb");
const scope = { status: "ALL", category: "ALL" };
const topicInput = () => ({ title: "Improve the review workflow", body: "How can we get feedback sooner?", category: "FEEDBACK", clientTopicId: randomUUID() });
async function fixture() {
  const db = memoryDiscussionDb();
  const service = createDiscussionService(db);
  const { topic } = await service.create(id(10), id(2), topicInput());
  return { db, service, topic };
}

test("all active roles can start topics and the first message is saved atomically", async () => {
  const db = memoryDiscussionDb(); const service = createDiscussionService(db);
  for (const userId of [1, 2, 3, 4, 5].map(id)) {
    const { topic } = await service.create(id(10), userId, topicInput());
    const read = await service.read(id(10), userId, topic.id, {});
    assert.equal(read.topic.messageCount, 1);
    assert.equal(read.messages[0].sequence, 1);
    assert.equal(read.messages[0].author.id, userId);
  }
});
test("inactive, future, expired and foreign-team memberships cannot read or write", async () => {
  const { db, service, topic } = await fixture();
  for (const change of [m => { m.isActive = false; }, m => { m.startsAt = new Date("2100-01-01"); }, m => { m.expiresAt = new Date("2020-01-01"); }]) {
    const m = db.state().memberships.find(m => m.userId === id(4));
    Object.assign(m, { isActive: true, startsAt: new Date("2020-01-01"), expiresAt: null }); change(m);
    await assert.rejects(service.list(id(10), id(4), scope), { statusCode: 403 });
    await assert.rejects(service.message(id(10), id(4), topic.id, { body: "Hi", clientMessageId: randomUUID() }), { statusCode: 403 });
  }
  await assert.rejects(service.read(id(11), id(2), topic.id, {}), { statusCode: 403 });
  await assert.rejects(service.create(id(10), id(6), topicInput()), { statusCode: 403 });
});
test("a membership in both teams still cannot cross-read, post or resolve topics", async () => {
  const { db, service, topic } = await fixture();
  db.state().memberships.push({ ...db.state().memberships[0], teamId: id(11) });
  for (const operation of [
    () => service.read(id(11), id(1), topic.id, {}),
    () => service.message(id(11), id(1), topic.id, { body: "Hi", clientMessageId: randomUUID() }),
    () => service.status(id(11), id(1), topic.id, { status: "RESOLVED", version: topic.version }),
    () => service.list(id(11), id(1), { ...scope, cursor: topic.id }),
  ]) await assert.rejects(operation(), { statusCode: 404 });
});
test("every active member may reply, but only creator/owner may resolve or reopen", async () => {
  const { service, topic } = await fixture();
  for (const userId of [3, 4, 5].map(id)) {
    await service.message(id(10), userId, topic.id, { body: "I can help", clientMessageId: randomUUID() });
    await assert.rejects(service.status(id(10), userId, topic.id, { status: "RESOLVED", version: 4 }), { statusCode: 403 });
  }
  const closed = await service.status(id(10), id(2), topic.id, { status: "RESOLVED", version: 4 });
  assert.equal(closed.topic.status, "RESOLVED"); assert.equal(closed.topic.resolvedBy.id, id(2)); assert.ok(closed.topic.resolvedAt);
  const reopened = await service.status(id(10), id(1), topic.id, { status: "OPEN", version: closed.topic.version });
  assert.equal(reopened.topic.status, "OPEN"); assert.equal(reopened.topic.resolvedAt, null); assert.equal(reopened.topic.resolvedBy, null);
});
test("resolved topics stay readable, reject new messages, and can be resumed after reopening", async () => {
  const { service, topic } = await fixture();
  const closed = await service.status(id(10), id(1), topic.id, { status: "RESOLVED", version: 1 });
  const input = { body: "Follow-up", clientMessageId: randomUUID() };
  await assert.rejects(service.message(id(10), id(4), topic.id, input), { statusCode: 409 });
  assert.equal((await service.read(id(10), id(4), topic.id, {})).messages.length, 1);
  await service.status(id(10), id(1), topic.id, { status: "OPEN", version: closed.topic.version });
  assert.equal((await service.message(id(10), id(4), topic.id, input)).message.sequence, 2);
});
test("stale resolution is rejected when a new message arrives", async () => {
  const { service, topic } = await fixture();
  await service.message(id(10), id(3), topic.id, { body: "Wait, another issue", clientMessageId: randomUUID() });
  await assert.rejects(service.status(id(10), id(2), topic.id, { status: "RESOLVED", version: 1 }), { statusCode: 409 });
  assert.equal((await service.read(id(10), id(2), topic.id, {})).topic.status, "OPEN");
});
test("simultaneous sends preserve a continuous sequence, message count and all authors", async () => {
  const { service, topic } = await fixture();
  await Promise.all(Array.from({ length: 15 }, (_, n) => service.message(id(10), id(n % 5 + 1), topic.id, { body: `Message ${n}`, clientMessageId: randomUUID() })));
  const read = await service.read(id(10), id(1), topic.id, {});
  assert.equal(read.topic.messageCount, 16);
  assert.deepEqual(read.messages.map(m => m.sequence), Array.from({ length: 16 }, (_, n) => n + 1));
});
test("lost-response retries do not duplicate topics or messages, including after resolution", async () => {
  const { service, topic } = await fixture();
  const create = topicInput();
  const created = await Promise.all([service.create(id(10), id(3), create), service.create(id(10), id(3), create)]);
  assert.equal(created[0].topic.id, created[1].topic.id);
  const input = { body: "One reply", clientMessageId: randomUUID() };
  const replies = await Promise.all([service.message(id(10), id(4), topic.id, input), service.message(id(10), id(4), topic.id, input)]);
  assert.equal(replies[0].message.id, replies[1].message.id);
  const closed = await service.status(id(10), id(1), topic.id, { status: "RESOLVED", version: 2 });
  const replay = await service.message(id(10), id(4), topic.id, input);
  assert.ok(replay.replayed); assert.equal(closed.topic.messageCount, 2);
  await assert.rejects(service.message(id(10), id(4), topic.id, { ...input, body: "Changed" }), { statusCode: 409 });
  await assert.rejects(service.create(id(10), id(3), { ...create, title: "Changed title" }), { statusCode: 409 });
});
test("message insert failures roll back topic counters", async () => {
  const { service, db, topic } = await fixture();
  const original = db.discussionMessage.create;
  db.discussionMessage.create = async () => { throw new Error("Storage failure"); };
  await assert.rejects(service.message(id(10), id(2), topic.id, { body: "Draft", clientMessageId: randomUUID() }), /Storage failure/);
  db.discussionMessage.create = original;
  assert.equal((await service.read(id(10), id(2), topic.id, {})).topic.messageCount, 1);
});
test("counts stay team-wide while status/category filters and cursors paginate topics", async () => {
  const { service, topic } = await fixture();
  for (let n = 0; n < 22; n++) await service.create(id(10), id(2), { ...topicInput(), category: "PROBLEM" });
  await service.status(id(10), id(2), topic.id, { status: "RESOLVED", version: 1 });
  const first = await service.list(id(10), id(2), scope);
  assert.deepEqual(first.counts, { total: 23, open: 22, resolved: 1 }); assert.equal(first.topics.length, 20);
  const second = await service.list(id(10), id(2), { ...scope, cursor: first.nextCursor });
  assert.equal(second.topics.length, 3); assert.equal(second.nextCursor, null);
  assert.equal(new Set([...first.topics, ...second.topics].map(t => t.id)).size, 23);
  const filtered = await service.list(id(10), id(2), { status: "RESOLVED", category: "FEEDBACK" });
  assert.equal(filtered.topics.length, 1); assert.deepEqual(filtered.counts, first.counts);
});
test("message history pages are ordered and incremental catch-up cannot skip a page", async () => {
  const { service, topic } = await fixture();
  for (let n = 0; n < 104; n++) await service.message(id(10), id(2), topic.id, { body: `Reply ${n}`, clientMessageId: randomUUID() });
  const latest = await service.read(id(10), id(2), topic.id, {});
  assert.equal(latest.messages[0].sequence, 56); assert.equal(latest.messages.at(-1).sequence, 105); assert.ok(latest.hasOlder);
  const older = await service.read(id(10), id(2), topic.id, { before: 56 });
  assert.equal(older.messages[0].sequence, 6); assert.equal(older.messages.at(-1).sequence, 55);
  const first = await service.read(id(10), id(2), topic.id, { after: 0 });
  assert.ok(first.hasMore); assert.equal(first.messages.at(-1).sequence, 50);
  const second = await service.read(id(10), id(2), topic.id, { after: 50 });
  assert.ok(second.hasMore); assert.equal(second.messages.at(-1).sequence, 100);
  const last = await service.read(id(10), id(2), topic.id, { after: 100 });
  assert.equal(last.messages.length, 5); assert.equal(last.hasMore, false);
});
test("input validation rejects empty text, oversized messages, bad cursors and identity injection", () => {
  const base = { params: { teamId: id(10), topicId: id(100) }, query: {}, body: {} };
  assert.ok(createSchema.safeParse({ ...base, body: topicInput() }).success);
  for (const body of [{ body: "  ", clientMessageId: randomUUID() }, { body: "x".repeat(4001), clientMessageId: randomUUID() }, { body: "Hi", clientMessageId: randomUUID(), authorId: id(1) }]) assert.ok(!messageSchema.safeParse({ ...base, body }).success);
  assert.ok(!readSchema.safeParse({ ...base, query: { after: "2", before: "8" } }).success);
  assert.ok(!readSchema.safeParse({ ...base, query: { after: "-1" } }).success);
  assert.equal(readSchema.parse({ ...base, query: { after: "2" } }).query.after, 2);
  assert.ok(!statusSchema.safeParse({ ...base, body: { status: "RESOLVED", version: 1, resolvedById: id(1) } }).success);
});
test("client message merging deduplicates overlapping polls and preserves older history", async () => {
  const { mergeDiscussion, mergeMessages } = await import("../../client/src/utils/discussions.js");
  const one = { id: "one", sequence: 1 }, two = { id: "two", sequence: 2 };
  assert.deepEqual(mergeMessages([two], [one, two]), [one, two]);
  assert.equal(mergeDiscussion({ messages: [one], hasOlder: true }, { messages: [two], hasOlder: false }).hasOlder, true);
});
test("HTTP flow applies parsed cursors, authentication, role checks, team isolation and no-store", async t => {
  const app = express(); app.use(express.json());
  const db = memoryDiscussionDb();
  app.use("/api/teams/:teamId/discussions", createDiscussionRoutes({ db,
    authenticate: (req, res, next) => req.headers["x-test-user"] ? (req.user = { id: req.headers["x-test-user"] }, next()) : res.sendStatus(401) }));
  app.use((err, req, res, next) => res.status(err.statusCode || 500).json({ message: err.message }));
  const server = app.listen(0, "127.0.0.1"); await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/teams/${id(10)}/discussions`;
  const request = (path = "", method = "GET", body, user = 2) => fetch(`${base}${path}`, { method, headers: { "Content-Type": "application/json", "x-test-user": id(user) }, body: body ? JSON.stringify(body) : undefined });
  assert.equal((await fetch(base)).status, 401);
  assert.equal((await request("", "GET", null, 6)).status, 403);
  const created = await request("", "POST", topicInput()); assert.equal(created.status, 201);
  const { topic } = await created.json();
  assert.equal((await request(`/${topic.id}/messages`, "POST", { body: "Useful feedback", clientMessageId: randomUUID() }, 4)).status, 201);
  const incremental = await request(`/${topic.id}?after=1`); assert.equal(incremental.headers.get("cache-control"), "no-store");
  assert.deepEqual((await incremental.json()).messages.map(m => m.sequence), [2]);
  assert.equal((await request(`/${topic.id}/status`, "PATCH", { status: "RESOLVED", version: 2 }, 3)).status, 403);
  assert.equal((await request(`/${topic.id}/status`, "PATCH", { status: "RESOLVED", version: 1 })).status, 409);
  assert.equal((await request(`/${topic.id}/status`, "PATCH", { status: "RESOLVED", version: 2 })).status, 200);
  assert.equal((await request(`/${id(999)}`)).status, 404);
  assert.equal((await request(`/${topic.id}?after=-1`)).status, 400);
  for (let n = 0; n < 30; n++) await request("", "POST", { title: "bad" });
  assert.equal((await request("", "POST", topicInput())).status, 429);
});
