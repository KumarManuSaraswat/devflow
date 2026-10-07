import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import MongoModelDemo from '../components/concepts/MongoModelDemo';

const steps = {
  'sync:start': ['Call stack', 'The current function starts immediately.'],
  'sync:end': ['Call stack', 'Scheduling callbacks does not interrupt synchronous work.'],
  'microtask:promise': ['Microtask queue', 'The already-fulfilled promise queues its callback first.'],
  'microtask:queued': ['Microtask queue', 'queueMicrotask follows in the same FIFO queue.'],
  timer: ['Task queue', 'The zero-delay timer waits for this stack and its microtasks to finish.'],
};
const codeClass = 'mt-4 max-w-full overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-200';

export default function ConceptLabPage() {
  const [events, setEvents] = useState([]);
  const [running, setRunning] = useState(false);
  const [hoisting, setHoisting] = useState(null);
  const [demos, setDemos] = useState(null);
  const [demoError, setDemoError] = useState(false);
  const mounted = useRef(false);
  const busy = useRef(false);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    // Public assets are copied byte-for-byte, preserving intentional TDZ errors.
    const demoUrl = `${import.meta.env.BASE_URL}demos/javascript-concepts.mjs`;
    import(/* @vite-ignore */ demoUrl).then(module => { if (active) setDemos(module); })
      .catch(() => { if (active) setDemoError(true); });
    return () => { active = false; mounted.current = false; };
  }, []);
  const runLoop = async () => {
    if (busy.current || !demos) return;
    busy.current = true;
    setRunning(true);
    setEvents([]);
    const result = await demos.eventLoopDemo();
    busy.current = false;
    if (mounted.current) { setEvents(result); setRunning(false); }
  };
  return <div className="space-y-6">
    <header className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-widest text-brand-600">Learn it. Run it. Explain it.</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">Concept lab</h1>
      <p className="mt-3 text-slate-600">An interview-ready tour of JavaScript execution and document modeling. These JavaScript demos run in your browser, without changing team data.</p>
    </header>
    {demoError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">The JavaScript demo asset could not load. Check your connection and reload this page.</p>}
    <nav aria-label="Concept sections" className="flex flex-wrap gap-2 text-sm font-semibold">
      {['event-loop', 'hoisting', 'mongo-model'].map((id, index) => <a key={id} href={`#${id}`} className="rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-brand-700">{index + 1}. {['Event loop', 'Hoisting', 'MongoDB model'][index]}</a>)}
    </nav>
    <section id="event-loop" className="scroll-mt-24"><Card className="p-5 sm:p-7">
      <p className="text-xs font-bold uppercase tracking-widest text-brand-600">01 / JavaScript</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-950">What runs first?</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">Predict the order, then run the actual code. A zero-delay timer is not immediate. Here, synchronous work finishes, microtasks drain, and then the timer runs. This is not a timing benchmark.</p>
      <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-brand-700">View the demo source code</summary><pre className={codeClass}><code>{demos?.eventLoopDemo.toString() || 'Loading demo source…'}</code></pre></details>
      <Button className="mt-5" disabled={running || !demos} onClick={() => void runLoop()}>{running ? 'Running…' : events.length ? 'Run event loop again' : 'Run event loop'}</Button>
      <ol aria-live="polite" aria-label="Execution order" className="mt-5 space-y-2">{events.map((event, index) => <li key={event} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-700">{index + 1}</span>
        <div className="min-w-0"><p className="break-words font-mono text-sm font-semibold text-slate-900">{event} <span className="font-sans text-xs font-normal text-slate-500">· {steps[event][0]}</span></p><p className="mt-1 text-xs leading-5 text-slate-600">{steps[event][1]}</p></div>
      </li>)}</ol>
      <p className="mt-5 rounded-xl bg-brand-50 p-4 text-sm leading-6 text-brand-900"><strong>In DevFlow:</strong> API requests wait without blocking scrolling; polling uses timers and async/await. Heavy synchronous work can still block the main thread. A promise does not create a JavaScript thread, and browser rendering has its own scheduling opportunities.</p>
    </Card></section>
    <section id="hoisting" className="scroll-mt-24"><Card className="p-5 sm:p-7">
      <p className="text-xs font-bold uppercase tracking-widest text-brand-600">02 / JavaScript</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-950">Before the declaration</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">Compare a function declaration, var, let, const and an arrow function. Expected errors are caught so the rest of the example can continue.</p>
      <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-brand-700">View the demo source code</summary><pre className={codeClass}><code>{demos?.hoistingDemo.toString() || 'Loading demo source…'}</code></pre></details>
      <Button className="mt-5" disabled={!demos} onClick={() => setHoisting(demos.hoistingDemo())}>Run hoisting comparison</Button>
      <div aria-live="polite" className="mt-5 grid gap-3 sm:grid-cols-2">{hoisting?.map(row => <div key={row.binding} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="font-semibold text-slate-900">{row.binding}</h3><dl className="mt-3 space-y-2 text-sm"><div><dt className="text-xs text-slate-500">Before declaration / assignment</dt><dd className="break-words font-mono text-brand-700">{row.before}</dd></div><div><dt className="text-xs text-slate-500">After initialization</dt><dd className="break-words font-mono text-slate-800">{row.after}</dd></div></dl><p className="mt-3 text-xs leading-5 text-slate-600">{row.why}</p>
      </div>)}</div>
      <p className="mt-5 text-sm leading-6 text-slate-600"><strong>Interview takeaway:</strong> “Hoisting” describes binding creation and initialization, not source code physically moving. let and const have a temporal dead zone. Production DevFlow uses declarations before use; this lab deliberately contrasts their behavior.</p>
    </Card></section>
    <section id="mongo-model" className="scroll-mt-24"><Card className="p-5 sm:p-7">
      <p className="text-xs font-bold uppercase tracking-widest text-brand-600">03 / NoSQL</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-950">One retrospective, one document</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">A retrospective is a useful document-modeling example: a win, improvement or decision with a small list of action items. Embed bounded actions because they are read with the note; keep accounts, membership and tasks in PostgreSQL.</p>
      <MongoModelDemo />
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="font-bold text-slate-900">Validation</dt><dd className="mt-1 leading-6 text-slate-600">A schema can require text, enum categories, bounded tags and action lists, and timestamps. Application validation and MongoDB collection validation are separate layers.</dd></div>
        <div><dt className="font-bold text-slate-900">References</dt><dd className="mt-1 leading-6 text-slate-600">teamId and authorId reference PostgreSQL IDs. There is no cross-database foreign key or automatic cascade; access must be checked in the application.</dd></div>
        <div><dt className="font-bold text-slate-900">Indexes & pagination</dt><dd className="mt-1 leading-6 text-slate-600">A compound index can start with teamId, then category where filtered, then descending _id for cursor paging. Indexes suit access patterns but cost storage and write work. ObjectId order is not a guaranteed global creation-time order.</dd></div>
        <div><dt className="font-bold text-slate-900">Atomic updates</dt><dd className="mt-1 leading-6 text-slate-600">An update to one embedded field in a single document is atomic. This is not a transaction spanning PostgreSQL and MongoDB.</dd></div>
      </dl>
    </Card></section>
    <Card className="p-5"><h2 className="font-bold text-slate-900">Your existing concepts are still here</h2><p className="mt-2 text-sm leading-6 text-slate-600">Ask DevFlow demonstrates AI integration and structured outputs. Workspace delivery reports demonstrate parameterized SQL JOINs. Authentication, middleware, relational modeling, client routing and asynchronous data fetching remain unchanged.</p>
      <Link to="/teams" className="mt-3 inline-block text-sm font-semibold text-brand-700">Back to your workspaces →</Link>
      <p className="mt-3 text-xs leading-6 text-slate-500">Read more: <a className="underline" href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model" target="_blank" rel="noreferrer">JavaScript execution</a> · <a className="underline" href="https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/" target="_blank" rel="noreferrer">MongoDB schema validation</a> · <a className="underline" href="https://www.mongodb.com/docs/manual/data-modeling/" target="_blank" rel="noreferrer">MongoDB data modeling</a></p>
    </Card>
  </div>;
}
