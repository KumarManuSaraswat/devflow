import { useCallback } from "react";
import { Link } from "react-router-dom";
import { listDiscussions } from "../../api/discussionApi";
import usePollingResource from "../../hooks/usePollingResource";

export default function DiscussionOverview({ teamId }) {
  const load = useCallback(signal => listDiscussions(teamId, {}, signal), [teamId]);
  const { data, error } = usePollingResource(load, { interval: 20000 });
  return <section className="relative overflow-hidden rounded-2xl border border-brand-200/60 bg-gradient-to-br from-brand-50 via-white to-violet-50 p-5 sm:p-6">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
      <div><p className="text-xs font-bold uppercase tracking-widest text-brand-600">Talk it through. Move it forward.</p>
        <h2 className="mt-2 text-xl font-bold text-slate-950">Team discussions</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Raise a problem, share feedback, and keep a record of what your team resolves.</p>
      </div>
      <Link to={`/teams/${teamId}/discussions`} className="motion-button shrink-0 rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">Open discussions →</Link>
    </div>
    {data && <dl className="mt-5 flex flex-wrap gap-8 border-t border-brand-100 pt-4">
      {[["Topics", data.counts.total], ["Open", data.counts.open], ["Resolved", data.counts.resolved]].map(([label, count]) => <div key={label}><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className={`mt-1 text-2xl font-bold ${label === "Resolved" ? "text-emerald-700" : "text-slate-900"}`}>{count}</dd></div>)}
    </dl>}
    {error && <p className="mt-3 text-xs text-amber-800">Discussion counts are temporarily unavailable.</p>}
  </section>;
}
