// Run with `npm run demo:javascript` from server/. No network, database or credentials.
function createTaskCounter(initial = 0) {
  let count = initial;
  return {
    add() { count += 1; return count; },
    read() { return count; },
  };
}

function eventLoopDemo() {
  const events = ['sync:start'];
  return new Promise(resolve => {
    setTimeout(() => { events.push('timer'); resolve(events); }, 0);
    Promise.resolve().then(() => events.push('microtask:promise'));
    queueMicrotask(() => events.push('microtask:queued'));
    events.push('sync:end');
  });
}

function hoistingDemo() {
  const declarationBeforeDefinition = describeTask();
  function describeTask() { return 'Function declaration is callable before its definition'; }

  const varBeforeAssignment = taskCount; // var binding exists, but its value is undefined.
  var taskCount = 3;
  let letBeforeDeclaration;
  try { void taskTitle; } catch (error) { letBeforeDeclaration = error.name; }
  let taskTitle = 'Review pull request'; // The earlier access is in its temporal dead zone.
  let constBeforeDeclaration;
  try { void taskStatus; } catch (error) { constBeforeDeclaration = error.name; }
  const taskStatus = 'IN_REVIEW';
  return { declarationBeforeDefinition, varBeforeAssignment, varAfterAssignment: taskCount,
    letBeforeDeclaration, constBeforeDeclaration, taskTitle, taskStatus };
}

async function runDemo() {
  const teamA = createTaskCounter();
  const teamB = createTaskCounter(10);
  teamA.add(); teamA.add();
  console.log('Closures: independent counters:', { teamA: teamA.read(), teamB: teamB.read() });
  console.log('Event loop:', (await eventLoopDemo()).join(' → '));
  console.log('Hoisting and temporal dead zones:', hoistingDemo());
}

if (require.main === module) runDemo().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { createTaskCounter, eventLoopDemo, hoistingDemo };
