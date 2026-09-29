const test = require('node:test');
const assert = require('node:assert/strict');
const helpers = import('../../client/src/utils/scrolling.js');

test('discussion follows the native page viewport, not an inner message panel', async () => {
  const { discussionScrollContainer } = await helpers;
  const viewport = {};
  const messages = { closest(selector) { assert.equal(selector, '.native-app .app-scroll'); return viewport; } };
  assert.equal(discussionScrollContainer(messages), viewport);
});

test('web discussion keeps its own scroll panel and missing elements are safe', async () => {
  const { discussionScrollContainer } = await helpers;
  const messages = { closest() { return null; } };
  assert.equal(discussionScrollContainer(messages), messages);
  assert.equal(discussionScrollContainer(null), null);
});

test('following new messages stops when reading older history, including fractional offsets', async () => {
  const { isNearScrollEnd } = await helpers;
  assert.equal(isNearScrollEnd({ scrollHeight: 1500, clientHeight: 600, scrollTop: 0 }), false);
  assert.equal(isNearScrollEnd({ scrollHeight: 1500, clientHeight: 600, scrollTop: 820 }), false);
  assert.equal(isNearScrollEnd({ scrollHeight: 1500, clientHeight: 600, scrollTop: 820.5 }), true);
  assert.equal(isNearScrollEnd({ scrollHeight: 600, clientHeight: 600, scrollTop: 0 }), true);
});
