const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const express = require('express');
const { deliveryQuery, loadDeliveryReport } = require('../src/reports/delivery');
const { createReportRoutes } = require('../src/routes/reportRoutes');
const id = n => `c${String(n).padStart(24, '0')}`;
const now = new Date('2026-09-29T12:00:00Z');
let pg;
const execute = async query => (await pg.query(query.text, query.values)).rows;
const db = {
  teamMember: { findFirst: async ({ where }) => {
    assert.equal(where.isActive, true);
    const result = await pg.query(`SELECT t.id, t.name FROM "TeamMember" m JOIN "Team" t ON t.id=m."teamId"
      WHERE m."teamId"=$1 AND m."userId"=$2 AND m."isActive"=true AND m."startsAt"<=$3
      AND (m."expiresAt" IS NULL OR m."expiresAt">$3)`, [where.teamId, where.userId, where.startsAt.lte]);
    return result.rows[0] ? { team: result.rows[0] } : null;
  } },
  $queryRaw: execute,
};

before(async () => {
  pg = new PGlite(); // In-memory PostgreSQL; no DATABASE_URL or production access.
  for (const migration of ['20260821084117_init', '20260921120000_team_assistant']) {
    await pg.exec(readFileSync(path.join(__dirname, '../prisma/migrations', migration, 'migration.sql'), 'utf8'));
  }
  for (let n = 1; n <= 5; n++) await pg.query('INSERT INTO "User" (id,name,email,"passwordHash","updatedAt") VALUES ($1,$2,$3,$4,$5)', [id(n), `Test ${n}`, `test${n}@example.invalid`, 'not-a-login', now]);
  for (const n of [10, 11]) await pg.query('INSERT INTO "Team" (id,name,"createdById","updatedAt") VALUES ($1,$2,$3,$4)', [id(n), `Team ${n}`, id(1), now]);
  for (let n = 1; n <= 5; n++) await pg.query('INSERT INTO "TeamMember" (id,"teamId","userId","isActive","startsAt","expiresAt") VALUES ($1,$2,$3,$4,$5,$6)',
    [id(100 + n), id(10), id(n), n !== 3, new Date(n === 4 ? '2099-01-01' : '2020-01-01'), n === 5 ? new Date('2021-01-01') : null]);
  for (const [n, team, name] of [[20, 10, 'A Shared work'], [21, 10, 'B Empty'], [22, 11, 'Private project']]) {
    await pg.query('INSERT INTO "Project" (id,"teamId",name,"updatedAt") VALUES ($1,$2,$3,$4)', [id(n), id(team), name, now]);
  }
  for (const [n, project, status, hours] of [[30, 20, 'IN_PROGRESS', 8], [31, 20, 'COMPLETED', 16], [32, 20, 'BLOCKED', null], [33, 20, 'BACKLOG', 4], [34, 20, 'BACKLOG', 2], [35, 22, 'IN_PROGRESS', 999]]) {
    await pg.query('INSERT INTO "Task" (id,"projectId",title,status,"estimatedHours","updatedAt") VALUES ($1,$2,$3,$4,$5,$6)', [id(n), id(project), `Test task ${n}`, status, hours, now]);
  }
  for (const [task, user] of [[30, 1], [30, 2], [31, 1], [33, 3], [33, 4], [34, 5]]) {
    await pg.query('INSERT INTO "TaskAssignee" ("taskId","userId") VALUES ($1,$2)', [id(task), id(user)]);
  }
});
after(async () => { await pg?.close(); });

test('real SQL JOIN report preserves empty projects and avoids shared-task/effort double counting', async () => {
  const report = await loadDeliveryReport(db, id(10), id(1), 1, now);
  assert.equal(report.projects.length, 2);
  assert.deepEqual(report.projects[0], { id: id(20), name: 'A Shared work', totalTasks: 5, completedTasks: 1,
    blockedTasks: 1, unassignedOpenTasks: 3, estimatedOpenHours: 14, missingEstimates: 1, activeAssignees: 2 });
  assert.equal(report.projects[1].totalTasks, 0); assert.equal(report.projects[1].activeAssignees, 0);
  assert.equal(report.projects[1].estimatedOpenHours, 0); assert.equal(report.hasMore, false);
  assert.equal(report.projects.some(p => p.id === id(22)), false);
});

test('membership gates report service and SQL independently, including expired, future and inactive members', async () => {
  for (const user of [3, 4, 5, 99]) {
    await assert.rejects(loadDeliveryReport(db, id(10), id(user), 1, now), { statusCode: 403 });
    assert.deepEqual(await execute(deliveryQuery(id(10), id(user), 1, now)), []);
  }
  await assert.rejects(loadDeliveryReport(db, id(11), id(1), 1, now), { statusCode: 403 });
  assert.deepEqual(await execute(deliveryQuery(id(11), id(1), 1, now)), []);
  const malicious = `${id(10)}' OR 1=1 --`;
  const query = deliveryQuery(malicious, id(1), 1, now);
  assert.ok(!query.text.includes(malicious)); assert.ok(query.values.includes(malicious));
  assert.deepEqual(await execute(query), []);
});

test('report pagination is bounded and ordered without duplicating projects', async () => {
  for (let n = 200; n < 221; n++) await pg.query('INSERT INTO "Project" (id,"teamId",name,"updatedAt") VALUES ($1,$2,$3,$4)', [id(n), id(10), `Z ${n}`, now]);
  const first = await loadDeliveryReport(db, id(10), id(1), 1, now);
  const second = await loadDeliveryReport(db, id(10), id(1), 2, now);
  assert.equal(first.projects.length, 20); assert.equal(first.hasMore, true);
  assert.equal(second.projects.length, 3); assert.equal(second.hasMore, false);
  assert.equal(new Set([...first.projects, ...second.projects].map(p => p.id)).size, 23);
  assert.equal((await loadDeliveryReport(db, id(10), id(1), 3, now)).projects.length, 0);
});

test('report HTTP route enforces authentication, input validation, team scope and no-store', async t => {
  const app = express(); app.use(express.json());
  app.use('/api/teams/:teamId/reports', createReportRoutes({ db,
    authenticate: (req, res, next) => req.headers['x-test-user'] ? (req.user = { id: req.headers['x-test-user'] }, next()) : res.sendStatus(401) }));
  app.use((err, req, res, next) => res.status(err.statusCode || 500).json({ message: err.statusCode ? err.message : 'Internal server error' }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/teams`;
  const headers = { 'x-test-user': id(1) };
  assert.equal((await fetch(`${base}/${id(10)}/reports/delivery`)).status, 401);
  for (const query of ['?page=0', '?page=1.5', '?page=10001', '?page=no', '?userId=other']) {
    assert.equal((await fetch(`${base}/${id(10)}/reports/delivery${query}`, { headers })).status, 400);
  }
  assert.equal((await fetch(`${base}/invalid/reports/delivery`, { headers })).status, 400);
  assert.equal((await fetch(`${base}/${id(11)}/reports/delivery`, { headers })).status, 403);
  const response = await fetch(`${base}/${id(10)}/reports/delivery`, { headers });
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).team.id, id(10));
});
