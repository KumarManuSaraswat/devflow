import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createDiscussion, listDiscussions } from "../api/discussionApi";
import usePollingResource from "../hooks/usePollingResource";
import { DISCUSSION_CATEGORIES, discussionTime } from "../utils/discussions";
import Button from "../components/common/Button";
import PageLoader from "../components/common/PageLoader";
import DiscussionStatus from "../components/discussions/DiscussionStatus";

const field = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

function NewTopic({ teamId, onCancel }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", body: "", category: "PROBLEM" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(null);
  const requestId = useRef(crypto.randomUUID());
  useEffect(() => () => request.current?.abort(), []);
  const change = event => {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }));
    requestId.current = crypto.randomUUID();
  };
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    request.current = controller;
    try {
      const { topic } = await createDiscussion(teamId, { ...form, title: form.title.trim(), body: form.body.trim(), clientTopicId: requestId.current }, controller.signal);
      if (!controller.signal.aborted) navigate(`/teams/${teamId}/discussions/${topic.id}`);
    } catch (err) { if (!controller.signal.aborted) setError(err.response?.data?.message || "Could not confirm creation. Your draft is safe; retry to check or create it without duplicating the topic."); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-4 rounded-2xl border border-brand-200 bg-white p-5 shadow-sm sm:p-6">
    <h2 className="text-lg font-bold text-slate-900">Start a conversation</h2>
    <p className="text-sm text-slate-500">Give your team enough context to help. Everyone in this workspace can read and reply.</p>
    <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
      <label className="text-sm font-semibold text-slate-700">Topic title<input autoFocus required minLength={3} maxLength={160} name="title" value={form.title} onChange={change} className={field} placeholder="e.g. How can we improve our review process?" /></label>
      <label className="text-sm font-semibold text-slate-700">Type<select name="category" value={form.category} onChange={change} className={field}>{Object.entries(DISCUSSION_CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-sm font-semibold text-slate-700 sm:col-span-2">First message<textarea required maxLength={4000} name="body" value={form.body} onChange={change} rows={5} className={`${field} resize-y font-normal`} placeholder="Describe the problem, idea, or feedback. What would a good outcome look like?" /></label>
    </fieldset>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy || !form.title.trim() || !form.body.trim()}>{busy ? "Creating topic…" : "Create topic"}</Button><Button variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button></div>
  </form>;
}

function TopicList({ teamId, status, category, cursor, onOlder, onNewest }) {
  const load = useCallback(signal => listDiscussions(teamId, { status, category, cursor: cursor || undefined }, signal), [teamId, status, category, cursor]);
  const { data, error, refresh } = usePollingResource(load, { interval: 15000 });
  if (!data && !error) return <PageLoader text="Loading team discussions…" />;
  return <div className="space-y-5">
    {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error.message} <button type="button" onClick={refresh} className="ml-2 font-bold underline">Retry</button></div>}
    {data && <>
      <div className="grid grid-cols-3 gap-3">
        {[["All topics", data.counts.total, "text-slate-950"], ["Open", data.counts.open, "text-amber-700"], ["Resolved", data.counts.resolved, "text-emerald-700"]].map(([label, count, color]) =>
          <div key={label} className="rounded-2xl border border-slate-200 bg-white/80 p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`mt-2 text-3xl font-bold ${color}`}>{count}</p></div>)}
      </div>
      <p className="text-xs text-slate-500">{data.team?.name} · Counts cover the whole team · {data.counts.total ? Math.round(data.counts.resolved / data.counts.total * 100) : 0}% resolved · updates every 15 seconds while visible.</p>
      <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-bold text-slate-900">{cursor ? "Earlier topics" : "Latest topics"}</h2>{cursor && <button type="button" onClick={onNewest} className="text-sm font-semibold text-brand-700 hover:underline">Back to newest</button>}</div>
      {!data.topics.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center"><p className="text-3xl text-brand-500" aria-hidden="true">◇</p><h3 className="mt-3 font-bold text-slate-900">{data.counts.total ? "No topics match this view" : "Your next solution starts here"}</h3><p className="mt-2 text-sm text-slate-500">{data.counts.total ? "Try another filter or start a new topic." : "Start a topic to discuss a problem or share feedback with your team."}</p></div>
        : <ul className="space-y-3">{data.topics.map(topic => <li key={topic.id}>
          <Link to={`/teams/${teamId}/discussions/${topic.id}`} className="group block rounded-2xl border border-slate-200 bg-white p-5 transition duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
            <div className="flex flex-wrap items-center gap-2"><DiscussionStatus status={topic.status} /><span className="text-xs font-semibold text-slate-500">{DISCUSSION_CATEGORIES[topic.category]}</span></div>
            <h3 className="mt-3 break-words text-lg font-bold text-slate-900 group-hover:text-brand-700">{topic.title}</h3>
            <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs leading-5 text-slate-500"><span>Started by {topic.createdBy.name} · {discussionTime(topic.createdAt)}</span><span>{topic.messageCount} {topic.messageCount === 1 ? "message" : "messages"} →</span></div>
            {topic.status === "RESOLVED" && <p className="mt-2 text-xs text-emerald-700">✓ Resolved by {topic.resolvedBy?.name || "a team member"} · {discussionTime(topic.resolvedAt)}</p>}
          </Link>
        </li>)}</ul>}
      {data.nextCursor && <Button variant="secondary" onClick={() => onOlder(data.nextCursor)}>Earlier topics →</Button>}
    </>}
  </div>;
}

function Discussions({ teamId }) {
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [cursor, setCursor] = useState(null);
  const createButton = useRef(null);
  return <div className="space-y-6">
    <Link to={`/teams/${teamId}`} className="text-sm font-semibold text-slate-500 hover:text-brand-700">← Back to workspace</Link>
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-widest text-brand-600">A shared space for better ideas</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Team discussions</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Work through problems, gather feedback, and celebrate the things you resolve together.</p></div>
      {!creating && <Button ref={createButton} onClick={() => setCreating(true)} className="shrink-0">+ Start a topic</Button>}
    </header>
    {creating && <NewTopic teamId={teamId} onCancel={() => { setCreating(false); window.setTimeout(() => createButton.current?.focus(), 0); }} />}
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1" role="group" aria-label="Filter topics by status">
        {[["ALL", "All topics"], ["OPEN", "Open"], ["RESOLVED", "Resolved"]].map(([value, label]) => <button key={value} type="button" aria-pressed={status === value} onClick={() => { setStatus(value); setCursor(null); }} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${status === value ? "bg-brand-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>{label}</button>)}
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-500">Type<select value={category} onChange={e => { setCategory(e.target.value); setCursor(null); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"><option value="ALL">All types</option>{Object.entries(DISCUSSION_CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <TopicList key={`${status}:${category}:${cursor}`} teamId={teamId} status={status} category={category} cursor={cursor} onOlder={setCursor} onNewest={() => setCursor(null)} />
  </div>;
}
export default function DiscussionsPage() {
  const { teamId } = useParams();
  return <Discussions key={teamId} teamId={teamId} />;
}
