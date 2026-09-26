const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const express = require('express');
const { memoryDiscussionDb, id } = require('../test-support/discussionDb');
const { enqueueNotifications } = require('../src/notifications/events');
const { configured, pushPayload } = require('../src/notifications/firebase');
const { createPushWorker, errorCode } = require('../src/notifications/worker');
const { createNotificationRoutes, tokenSchema } = require('../src/routes/notificationRoutes');
const { createDiscussionService } = require('../src/discussions/service');
const event = overrides => ({ teamId: id(10), actorId: id(2), kind: 'TASK_ASSIGNED', href: `/tasks/${id(40)}`, eventKey: 'task:40', ...overrides });
async function addDevice(db, user = 1, token = 'test-token-for-device-12345') {
  return db.pushDevice.upsert({ where: { token }, create: { token, userId: id(user), expiresAt: new Date(Date.now() + 86400000) }, update: {} });
}
async function queued() {
  const db = memoryDiscussionDb(); await addDevice(db);
  await enqueueNotifications(db, event({ recipientIds: [id(1)] }), true);
  return db;
}
const worker = (db, send) => createPushWorker({ db, send, isConfigured: () => true, logger: { error() {} } });

test('notifications default off and Firebase requires explicit flags and server credentials', async () => {
  await enqueueNotifications({}, event(), false);
  assert.equal(configured({}), false);
  assert.equal(configured({ NOTIFICATIONS_ENABLED: 'true', PUSH_ENABLED: 'true' }), false);
  assert.equal(configured({ NOTIFICATIONS_ENABLED: 'true', PUSH_ENABLED: 'true', GOOGLE_APPLICATION_CREDENTIALS: '/secret/firebase.json' }), true);
  await createPushWorker({ db: {}, isConfigured: () => false, send() { assert.fail(); } }).tick();
});
test('only current recipients are notified, never the actor, duplicates or inactive/future/expired members', async () => {
  const db = memoryDiscussionDb();
  db.state().memberships.find(m => m.userId === id(3)).expiresAt = new Date('2020-01-01');
  db.state().memberships.find(m => m.userId === id(4)).startsAt = new Date('2100-01-01');
  await addDevice(db, 1); await addDevice(db, 2, 'second-device-token-123456789');
  const input = event({ recipientIds: [id(1), id(1), id(2), id(3), id(4), id(6), id(999)] });
  await enqueueNotifications(db, input, true); await enqueueNotifications(db, input, true);
  assert.deepEqual(db.state().notifications.map(n => n.userId), [id(1)]);
  assert.equal(db.state().deliveries.length, 1);
  await assert.rejects(enqueueNotifications(db, event({ href: 'https://evil.example' }), true), /Invalid notification/);
});
test('discussion events are transactional, retries do not notify twice, and queue failure rolls back the message', async () => {
  const previous = process.env.NOTIFICATIONS_ENABLED; process.env.NOTIFICATIONS_ENABLED = 'true';
  try {
    const db = memoryDiscussionDb(); const service = createDiscussionService(db);
    const input = { title: 'Team feedback', category: 'FEEDBACK', body: 'A useful idea', clientTopicId: randomUUID() };
    const { topic } = await service.create(id(10), id(2), input);
    await service.create(id(10), id(2), input);
    assert.equal(db.state().notifications.length, 4);
    assert.ok(db.state().notifications.every(n => n.kind === 'FEEDBACK_CREATED'));
    const reply = { body: 'Thanks', clientMessageId: randomUUID() };
    await service.message(id(10), id(3), topic.id, reply);
    await service.message(id(10), id(3), topic.id, reply);
    assert.equal(db.state().notifications.length, 8);
    db.notification.createMany = async () => { throw new Error('Storage failure'); };
    await assert.rejects(service.message(id(10), id(3), topic.id, { ...reply, clientMessageId: randomUUID() }), /Storage failure/);
    assert.equal(db.state().messages.length, 2);
    assert.equal(db.state().topics[0].messageCount, 2);
  } finally { previous === undefined ? delete process.env.NOTIFICATIONS_ENABLED : process.env.NOTIFICATIONS_ENABLED = previous; }
});
test('provider payload keeps team/message/task contents private and uses stable notification tags', () => {
  const payload = pushPayload({ token: 'fake-token' }, { id: id(50), href: '/secret', message: 'Sensitive message', title: 'Private project' });
  assert.deepEqual(payload.data, { notificationId: id(50) });
  assert.equal(payload.android.notification.tag, id(50));
  assert.equal(payload.android.notification.visibility, 'private');
  assert.ok(!JSON.stringify(payload).includes('Sensitive'));
  assert.equal(errorCode(new Error('Secret key or token')), 'push/send-failed');
});
test('task creation, review submission and reviewer feedback enqueue the correct recipients inside their transactions', async () => {
  const { prisma } = require('../src/config/prisma');
  const { createTask, submitTaskForReview, reviewTask } = require('../src/controllers/taskController');
  const saved = { transaction: prisma.$transaction, project: prisma.project.findUnique, task: prisma.task.findUnique, flag: process.env.NOTIFICATIONS_ENABLED };
  process.env.NOTIFICATIONS_ENABLED = 'true';
  const db = memoryDiscussionDb();
  const current = { id: id(40), status: 'IN_PROGRESS', project: { teamId: id(10) }, assignees: [{ userId: id(2) }], reviewers: [{ userId: id(4) }] };
  db.task = { create: async ({ data }) => ({ id: id(40), ...data }), update: async ({ data }) => Object.assign(current, data) };
  let activity = 1000;
  db.taskActivity = { create: async () => ({ id: id(++activity) }) };
  db.taskReview = { create: async () => ({ id: id(++activity) }) };
  const response = { status() { return this; }, json() {} };
  try {
    prisma.$transaction = db.$transaction;
    prisma.project.findUnique = async () => ({ id: id(30), teamId: id(10) });
    prisma.task.findUnique = async () => current;
    await createTask({ params: { projectId: id(30) }, user: { id: id(1) }, body: {
      title: 'Mobile task', assigneeIds: [id(2)], reviewerIds: [id(4)], priority: 2,
    } }, response);
    await submitTaskForReview({ task: { id: id(40) }, user: { id: id(2) }, membership: { role: 'DEVELOPER' }, body: {} }, response);
    await reviewTask({ task: { id: id(40) }, user: { id: id(4) }, body: { decision: 'CHANGES_REQUESTED', comment: 'Please add tests' } }, response);
    assert.deepEqual(db.state().notifications.map(n => [n.kind, n.userId]), [
      ['TASK_ASSIGNED', id(2)], ['REVIEW_REQUESTED', id(4)], ['TASK_FEEDBACK', id(2)],
    ]);
  } finally {
    prisma.$transaction = saved.transaction; prisma.project.findUnique = saved.project; prisma.task.findUnique = saved.task;
    saved.flag === undefined ? delete process.env.NOTIFICATIONS_ENABLED : process.env.NOTIFICATIONS_ENABLED = saved.flag;
  }
});
test('outbox sends once, coordinates workers and skips read notifications and revoked membership', async () => {
  const db = await queued(); let sends = 0;
  await Promise.all([worker(db, async () => { sends++; }).tick(), worker(db, async () => { sends++; }).tick()]);
  assert.equal(sends, 1); assert.equal(db.state().deliveries[0].state, 'SENT');
  await worker(db, () => assert.fail()).tick();
  for (const mutate of [db => { db.state().notifications[0].readAt = new Date(); },
    db => { db.state().memberships[0].isActive = false; },
    db => { db.state().devices[0].userId = id(3); },
    db => { db.state().devices[0].expiresAt = new Date('2020-01-01'); }]) {
    const isolated = await queued(); mutate(isolated);
    await worker(isolated, () => assert.fail('Must not send')).tick();
    assert.equal(isolated.state().deliveries[0].state, 'SKIPPED');
  }
});
test('outbox retries transient failures with backoff and removes invalid registration tokens', async () => {
  const db = await queued();
  await worker(db, async () => { throw { code: 'messaging/server-unavailable' }; }).tick();
  assert.equal(db.state().deliveries[0].state, 'PENDING');
  assert.ok(db.state().deliveries[0].nextAttemptAt > new Date());
  db.state().deliveries[0].nextAttemptAt = new Date(0);
  await worker(db, async () => { throw { code: 'messaging/registration-token-not-registered' }; }).tick();
  assert.equal(db.state().devices.length, 0); assert.equal(db.state().deliveries.length, 0);
  const exhausted = await queued(); exhausted.state().deliveries[0].attempts = 5;
  await worker(exhausted, async () => { throw new Error('temporary'); }).tick();
  assert.equal(exhausted.state().deliveries[0].state, 'FAILED');
});
test('HTTP inbox and device routes enforce authentication, ownership, membership and input limits', async t => {
  const db = await queued();
  const app = express(); app.use(express.json());
  app.use('/api/notifications', createNotificationRoutes({ db, isEnabled: () => true, pushConfigured: () => true,
    authenticate: (req, res, next) => req.headers['x-test-user'] ? (req.user = { id: req.headers['x-test-user'] }, next()) : res.sendStatus(401) }));
  app.use((err, _req, res, _next) => res.status(err.statusCode || 500).json({ message: err.message }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/notifications`;
  const request = (url = '', method = 'GET', body, user = 1) => fetch(base + url, { method,
    headers: { 'Content-Type': 'application/json', 'x-test-user': id(user) }, body: body ? JSON.stringify(body) : undefined });
  assert.equal((await fetch(base)).status, 401);
  const note = db.state().notifications[0]; const device = db.state().devices[0];
  assert.equal((await request(`/${note.id}`, 'GET', null, 2)).status, 404);
  assert.equal((await request(`/${note.id}/read`, 'PATCH', {}, 2)).status, 404);
  assert.equal((await request('/devices/' + device.id, 'DELETE', null, 2)).status, 204);
  assert.equal(db.state().devices.length, 1);
  const inbox = await request(); assert.equal(inbox.headers.get('cache-control'), 'no-store');
  assert.equal((await inbox.json()).unread, 1);
  await request(`/${note.id}/read`, 'PATCH', {});
  assert.equal((await (await request()).json()).unread, 0);
  db.state().memberships[0].isActive = false;
  assert.equal((await request(`/${note.id}`)).status, 404);
  assert.equal((await (await request()).json()).notifications.length, 0);
  assert.equal((await request('/devices', 'POST', { token: 'invalid' })).status, 400);
  assert.equal((await request('/devices', 'POST', { token: 'long-valid-test-token-123456', userId: id(2) })).status, 400);
  // Token refresh and shared-phone account switch remove the previous account's deliveries.
  await request('/devices', 'POST', { token: device.token }, 2);
  assert.equal(db.state().devices[0].userId, id(2)); assert.equal(db.state().deliveries.length, 0);
  assert.ok(!tokenSchema.safeParse({ token: 'x'.repeat(4097) }).success);
});
test('notification deep links only allow local task and discussion destinations', async () => {
  const { safeNotificationPath, isNotificationId } = await import('../../client/src/utils/notifications.js');
  for (const href of ['https://evil.example', '//evil.example', '/tasks/../admin', '/login?redirect=evil', 'javascript:alert(1)']) {
    assert.equal(safeNotificationPath(href), '/notifications');
  }
  assert.equal(safeNotificationPath(`/tasks/${id(20)}`), `/tasks/${id(20)}`);
  assert.ok(isNotificationId(id(20))); assert.ok(!isNotificationId('../evil'));
});
