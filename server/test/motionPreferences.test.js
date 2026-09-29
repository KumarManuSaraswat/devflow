const test = require('node:test');
const assert = require('node:assert/strict');
const preferences = import('../../client/src/utils/motionPreferences.js');
const storage = values => ({ getItem: key => values[key] ?? null });

test('Android defaults to smooth mode while the website keeps animations', async () => {
  const { readMotionPaused } = await preferences;
  assert.equal(readMotionPaused(storage({}), true), true);
  assert.equal(readMotionPaused(storage({}), false), false);
});

test('Android and web choices are independent and both explicit choices persist', async () => {
  const { readMotionPaused, motionPreferenceKey } = await preferences;
  assert.notEqual(motionPreferenceKey(true), motionPreferenceKey(false));
  for (const android of [true, false]) {
    for (const paused of [true, false]) {
      assert.equal(readMotionPaused(storage({ [motionPreferenceKey(android)]: String(paused) }), android), paused);
    }
  }
  assert.equal(readMotionPaused(storage({ 'devflow-motion-paused': 'false' }), true), true);
  assert.equal(readMotionPaused(storage({ 'devflow-android-motion-paused': 'true' }), false), false);
});

test('Unavailable or invalid storage retains each platform default', async () => {
  const { readMotionPaused, motionPreferenceKey } = await preferences;
  for (const android of [true, false]) {
    assert.equal(readMotionPaused({ getItem() { throw new Error('Storage unavailable'); } }, android), android);
    assert.equal(readMotionPaused(storage({ [motionPreferenceKey(android)]: 'invalid' }), android), android);
    assert.equal(readMotionPaused(null, android), android);
  }
});
