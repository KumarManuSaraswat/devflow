const { test } = require('node:test');
const assert = require('node:assert/strict');
const modulePath = '../../client/src/utils/resourceCache.js';

test('cache is memory-only and scoped to the signed-in account', async () => {
  const { createResourceCache } = await import(modulePath);
  const cache = createResourceCache();
  cache.write('teams', ['private']);
  assert.equal(cache.read('teams'), null);
  cache.scope('alice'); cache.write('teams', ['alice-team']);
  assert.deepEqual(cache.read('teams'), ['alice-team']);
  cache.scope('alice'); assert.deepEqual(cache.read('teams'), ['alice-team']);
  cache.scope('bob'); assert.equal(cache.read('teams'), null);
  cache.write('teams', ['bob-team']); cache.scope(null);
  assert.equal(cache.read('teams'), null);
});

test('late reads cannot repopulate cache after mutation or account transition', async () => {
  const { createResourceCache } = await import(modulePath);
  const cache = createResourceCache(); cache.scope('alice');
  const ticket = cache.ticket();
  cache.write('task:1', { status: 'OPEN' }, ticket);
  cache.clear(); cache.write('task:1', { status: 'OPEN' }, ticket);
  assert.equal(cache.read('task:1'), null);
  const next = cache.ticket(); cache.scope('bob');
  cache.write('task:1', { secret: 'alice' }, next);
  assert.equal(cache.read('task:1'), null);
});

test('resource keys isolate filters, pages and teams; expired entries are discarded', async () => {
  const { createResourceCache } = await import(modulePath);
  let time = 0;
  const cache = createResourceCache({ now: () => time, ttl: 100 }); cache.scope('alice');
  cache.write('team:1', { name: 'one' }); cache.write('team:2', { name: 'two' });
  cache.write('inbox:latest', []);
  assert.equal(cache.read('team:1').name, 'one');
  assert.equal(cache.read('team:2').name, 'two');
  assert.deepEqual(cache.read('inbox:latest'), []);
  assert.equal(cache.read('inbox:older'), null);
  time = 100; assert.equal(cache.read('team:1'), null);
});

test('cache is bounded and evicts least recently read entries', async () => {
  const { createResourceCache } = await import(modulePath);
  const cache = createResourceCache({ maxEntries: 2 }); cache.scope('alice');
  cache.write('a', 1); cache.write('b', 2); cache.read('a'); cache.write('c', 3);
  assert.equal(cache.read('b'), null); assert.equal(cache.read('a'), 1);
  cache.write('a', null); assert.equal(cache.read('a'), null);
});
