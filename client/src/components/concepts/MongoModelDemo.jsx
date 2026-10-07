import { useState } from 'react';
import Button from '../common/Button';
import { exampleRetrospective, mongoSetupExample, validateMongoDraft } from '../../utils/mongoModelDemo';

export default function MongoModelDemo() {
  const [draft, setDraft] = useState(() => JSON.stringify(exampleRetrospective(), null, 2));
  const [result, setResult] = useState(null);
  const load = invalid => {
    const document = exampleRetrospective();
    if (invalid) { document.category = 'MAYBE'; document.actions[0].done = 'yes'; }
    setDraft(JSON.stringify(document, null, 2)); setResult(null);
  };
  return <div className="mt-5 min-w-0 space-y-4">
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Local schema demo — not a MongoDB connection.</strong> The sample uses synthetic IDs. Nothing is saved or sent to a server. Changes reset when you leave this page. Please don’t paste private team data.</div>
    <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => load(false)}>Load valid example</Button><Button variant="secondary" onClick={() => load(true)}>Load invalid example</Button></div>
    <div><label htmlFor="mongo-draft" className="text-sm font-semibold text-slate-900">Try a retrospective document (JSON)</label>
      <textarea id="mongo-draft" value={draft} onChange={event => { setDraft(event.target.value); setResult(null); }} maxLength={16000} rows={16} spellCheck={false}
        aria-describedby="mongo-draft-help" className="mt-2 w-full max-w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
      <p id="mongo-draft-help" className="mt-2 text-xs leading-5 text-slate-500">Required fields, category choices, ID format, five unique tags and eight embedded actions are checked locally. _id and BSON dates are excluded from drafts. This is a checker for this example’s rules, not a full MongoDB validator.</p>
    </div>
    <Button onClick={() => setResult(validateMongoDraft(draft))}>Validate document</Button>
    <div aria-live="polite">{result && <div className={`rounded-xl border p-4 text-sm ${result.valid ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
      <p className="font-semibold">{result.valid ? 'Valid draft — matches this example’s schema rules.' : 'Document needs changes'}</p>
      {result.errors.length > 0 && <ul className="mt-2 list-disc space-y-1 break-words pl-5">{result.errors.map(error => <li key={error}>{error}</li>)}</ul>}
      {result.valid && <p className="mt-1 text-xs">Local check only. No MongoDB write or server-side validation occurred.</p>}
    </div>}</div>
    <details><summary className="cursor-pointer text-sm font-semibold text-brand-700">Show MongoDB collection schema & indexes</summary>
      <pre className="mt-3 max-w-full overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-200"><code>{mongoSetupExample}</code></pre>
      <p className="mt-2 text-xs leading-5 text-slate-500">Reference commands for an isolated MongoDB practice database, not commands run by this app. BSON ObjectId and Date are not JSON strings. The application would set timestamps; MongoDB does not automatically add createdAt or updatedAt.</p>
    </details>
  </div>;
}
