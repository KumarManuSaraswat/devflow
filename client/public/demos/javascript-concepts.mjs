// Served unchanged as a local app asset, outside the bundler/minifier. Optimizers
// can remove deliberate TDZ reads as dead code and invalidate this demonstration.
// Fixed examples only: no eval, user-supplied code, API requests or busy loops.
export function eventLoopDemo() {
  const events = ['sync:start'];
  return new Promise(resolve => {
    setTimeout(() => { events.push('timer'); resolve(events); }, 0);
    Promise.resolve().then(() => events.push('microtask:promise'));
    queueMicrotask(() => events.push('microtask:queued'));
    events.push('sync:end');
  });
}

export function hoistingDemo() {
  const declaration = describeTask();
  function describeTask() { return 'Ready for review'; }

  const before = taskCount;
  var taskCount = 3; // Deliberate educational contrast; not an app coding pattern.
  let letResult;
  try { void taskTitle; } catch (error) { letResult = error.name; }
  let taskTitle = 'Review pull request';
  let constResult;
  try { void taskStatus; } catch (error) { constResult = error.name; }
  const taskStatus = 'IN_REVIEW';
  let expressionResult;
  try { taskLabel(); } catch (error) { expressionResult = error.name; }
  const taskLabel = () => 'Task label';

  return [
    { binding: 'Function declaration', before: declaration, after: describeTask(), why: 'The declaration is initialized before this scope runs.' },
    { binding: 'var', before: String(before), after: String(taskCount), why: 'The binding starts as undefined; its assignment is not moved.' },
    { binding: 'let', before: letResult, after: taskTitle, why: 'The binding is in the temporal dead zone until its declaration initializes it.' },
    { binding: 'const', before: constResult, after: taskStatus, why: 'Like let, it cannot be accessed before initialization.' },
    { binding: 'const arrow function', before: expressionResult, after: taskLabel(), why: 'A function expression follows the initialization rules of its variable.' },
  ];
}
