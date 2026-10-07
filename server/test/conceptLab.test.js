const test = require('node:test');
const assert = require('node:assert/strict');

test('browser demo uses real queues and is repeatable without shared state', async () => {
  const { eventLoopDemo } = await import('../../client/public/demos/javascript-concepts.mjs');
  const [first, second] = await Promise.all([eventLoopDemo(), eventLoopDemo()]);
  assert.deepEqual(first, ['sync:start', 'sync:end', 'microtask:promise', 'microtask:queued', 'timer']);
  assert.deepEqual(first, second);
  assert.notEqual(first, second);
});

test('browser hoisting comparison catches TDZ and shows initialized values', async () => {
  const { hoistingDemo } = await import('../../client/public/demos/javascript-concepts.mjs');
  const rows = hoistingDemo();
  assert.deepEqual(rows.map(row => row.before), ['Ready for review', 'undefined', 'ReferenceError', 'ReferenceError', 'ReferenceError']);
  assert.deepEqual(rows.map(row => row.after), ['Ready for review', '3', 'Review pull request', 'IN_REVIEW', 'Task label']);
});

test('Mongo model demo validates the sample without a database and has independent drafts', async () => {
  const { exampleRetrospective, validateMongoDraft } = await import('../../client/src/utils/mongoModelDemo.js');
  const first = exampleRetrospective();
  assert.equal(validateMongoDraft(JSON.stringify(first)).valid, true);
  first.actions[0].done = 'yes';
  assert.equal(exampleRetrospective().actions[0].done, false);
  assert.match(validateMongoDraft(JSON.stringify(first)).errors.join(' '), /actions\[0\].done: expected bool/);
});

test('Mongo draft checker rejects malformed, oversized and operator-shaped input', async () => {
  const { validateMongoDraft, exampleRetrospective } = await import('../../client/src/utils/mongoModelDemo.js');
  for (const text of ['{', 'null', '[]', '{}', '"text"', ' '.repeat(16001), '{"__proto__":{"polluted":true}}']) {
    assert.equal(validateMongoDraft(text).valid, false);
  }
  const sample = exampleRetrospective();
  for (const changes of [ { category: 'MAYBE' }, { title: '   ' }, { title: 'a'.repeat(121) },
    { summary: 'x'.repeat(3001) }, { teamId: { $ne: null } }, { authorId: 'invalid' },
    { tags: ['repeat', 'repeat'] }, { tags: Array.from({ length: 6 }, (_, i) => `${i}`) },
    { tags: ['x'.repeat(25)] }, { actions: Array(9).fill({ text: 'a', done: false }) },
    { actions: [{ text: '', done: true }] }, { actions: [{ text: 'ok', done: true, extra: 1 }] },
    { schemaVersion: 2 }, { unexpected: true }, { _id: '507f1f77bcf86cd799439011' },
  ]) assert.equal(validateMongoDraft(JSON.stringify({ ...sample, ...changes })).valid, false, JSON.stringify(changes));
  assert.equal({}.polluted, undefined);
});

test('MongoDB schema includes _id and native dates, bounded embedded fields and indexes', async () => {
  const { mongoCollectionSchema: schema, mongoDraftSchema, mongoSetupExample } = await import('../../client/src/utils/mongoModelDemo.js');
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.properties._id, { bsonType: 'objectId' });
  assert.deepEqual(schema.properties.createdAt, { bsonType: 'date' });
  assert.equal(mongoDraftSchema.properties._id, undefined);
  assert.equal(schema.properties.actions.maxItems, 8);
  assert.equal(schema.properties.tags.maxItems, 5);
  assert.equal(schema.properties.actions.items.additionalProperties, false);
  assert.match(mongoSetupExample, /validationAction: "error"/);
  assert.match(mongoSetupExample, /createIndex\(\{ teamId: 1, category: 1, _id: -1 \}\)/);
});
