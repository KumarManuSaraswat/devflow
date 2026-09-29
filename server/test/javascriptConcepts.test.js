const test = require('node:test');
const assert = require('node:assert/strict');
const { createTaskCounter, eventLoopDemo, hoistingDemo } = require('../examples/javascript-concepts');

test('closures retain private independent state after the outer function returns', () => {
  const a = createTaskCounter(); const b = createTaskCounter(10);
  assert.equal(a.add(), 1); assert.equal(a.add(), 2);
  assert.equal(a.read(), 2); assert.equal(b.read(), 10);
  assert.equal(a.count, undefined);
});
test('synchronous work completes before FIFO microtasks and the zero-delay timer', async () => {
  assert.deepEqual(await eventLoopDemo(), ['sync:start', 'sync:end', 'microtask:promise', 'microtask:queued', 'timer']);
});
test('function declarations, var and let/const demonstrate different initialization rules', () => {
  const result = hoistingDemo();
  assert.match(result.declarationBeforeDefinition, /callable/);
  assert.equal(result.varBeforeAssignment, undefined); assert.equal(result.varAfterAssignment, 3);
  assert.equal(result.letBeforeDeclaration, 'ReferenceError');
  assert.equal(result.constBeforeDeclaration, 'ReferenceError');
  assert.equal(result.taskStatus, 'IN_REVIEW');
});
