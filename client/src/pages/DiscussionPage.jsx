import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getDiscussion, postDiscussionMessage, setDiscussionStatus } from "../api/discussionApi";
import { useAuth } from "../context/useAuth";
import usePollingResource from "../hooks/usePollingResource";
import { DISCUSSION_CATEGORIES, discussionTime, mergeDiscussion, mergeMessages } from "../utils/discussions";
import Button from "../components/common/Button";
import PageLoader from "../components/common/PageLoader";
import DiscussionStatus from "../components/discussions/DiscussionStatus";

function Discussion({ teamId, topicId }) {
  const { user } = useAuth();
  const load = useCallback((signal, previous) => getDiscussion(teamId, topicId,
    previous?.messages.length ? { after: previous.messages.at(-1).sequence } : {}, signal), [teamId, topicId]);
  const { data, error, refresh, mutate } = usePollingResource(load, { merge: mergeDiscussion });
  const [body, setBody] = useState("");
  const [action, setAction] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [olderBusy, setOlderBusy] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const writeRequest = useRef(null);
  const olderRequest = useRef(null);
  const messagesBox = useRef(null);
  const followLatest = useRef(true);
  const initialScroll = useRef(true);
  const [newMessages, setNewMessages] = useState(false);
  const newest = data?.messages.at(-1)?.sequence;
  useEffect(() => () => { writeRequest.current?.abort(); olderRequest.current?.abort(); }, []);
  useEffect(() => {
    const box = messagesBox.current;
    if (box && (initialScroll.current || followLatest.current)) {
      box.scrollTop = box.scrollHeight;
      initialScroll.current = false;
    }
  }, [newest]);

  async function send(event) {
    event.preventDefault();
    if (action || !body.trim()) return;
    setAction("message"); setActionError(""); setNotice("");
    const controller = new AbortController();
    writeRequest.current = controller;
    try {
      await postDiscussionMessage(teamId, topicId, { body: body.trim(), clientMessageId: requestId.current }, controller.signal);
      if (controller.signal.aborted) return;
      setBody(""); requestId.current = crypto.randomUUID(); followLatest.current = true;
      setNotice("Message sent.");
      // Fetch from the last seen sequence; appending just our reply could skip concurrent replies.
      await refresh();
    } catch (err) {
      if (!controller.signal.aborted) {
        setActionError(err.response?.data?.message || "Could not confirm delivery. Your draft is saved here; retrying will not duplicate the same message.");
        if (err.response?.status === 409) await refresh();
      }
    } finally { if (!controller.signal.aborted) setAction(""); }
  }
  async function toggleStatus() {
    if (action) return;
    setAction("status"); setActionError(""); setNotice("");
    const controller = new AbortController();
    writeRequest.current = controller;
    try {
      const status = data.topic.status === "OPEN" ? "RESOLVED" : "OPEN";
      await setDiscussionStatus(teamId, topicId, { status, version: data.topic.version }, controller.signal);
      if (!controller.signal.aborted) { setNotice(status === "RESOLVED" ? "Discussion marked resolved." : "Discussion reopened."); await refresh(); }
    } catch (err) {
      if (!controller.signal.aborted) { setActionError(err.response?.data?.message || "Could not update this topic. Please try again."); await refresh(); }
    } finally { if (!controller.signal.aborted) setAction(""); }
  }
  async function loadOlder() {
    if (olderBusy || !data?.messages.length) return;
    setOlderBusy(true); setActionError("");
    const controller = new AbortController(); olderRequest.current = controller;
    const anchor = messagesBox.current;
    const oldHeight = anchor?.scrollHeight || 0;
    const oldTop = anchor?.scrollTop || 0;
    followLatest.current = false;
    try {
      const result = await getDiscussion(teamId, topicId, { before: data.messages[0].sequence }, controller.signal);
      if (controller.signal.aborted) return;
      mutate(current => current ? { ...current, messages: mergeMessages(result.messages, current.messages), hasOlder: result.hasOlder } : current);
      requestAnimationFrame(() => { if (anchor) anchor.scrollTop = oldTop + anchor.scrollHeight - oldHeight; });
    } catch (err) { if (!controller.signal.aborted) setActionError(err.response?.data?.message || "Unable to load earlier messages."); }
    finally { if (!controller.signal.aborted) setOlderBusy(false); }
  }
  function scrollToLatest() {
    const box = messagesBox.current;
    if (box) box.scrollTop = box.scrollHeight;
    followLatest.current = true; setNewMessages(false);
  }
  if (!data && !error) return <PageLoader text="Opening discussion…" />;
  return <div className="space-y-5">
    <Link to={`/teams/${teamId}/discussions`} className="text-sm font-semibold text-slate-500 hover:text-brand-700">← All team discussions</Link>
    {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error.message} <button type="button" onClick={refresh} className="ml-2 font-bold underline">Retry</button></div>}
    {data && <>
      <header className="rounded-2xl border border-slate-200 bg-white/85 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3"><DiscussionStatus status={data.topic.status} /><span className="text-xs font-semibold text-slate-500">{DISCUSSION_CATEGORIES[data.topic.category]}</span></div>
        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="min-w-0"><h1 className="break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{data.topic.title}</h1><p className="mt-2 text-xs leading-6 text-slate-500">Started by {data.topic.createdBy.name} · {discussionTime(data.topic.createdAt)} · {data.topic.messageCount} {data.topic.messageCount === 1 ? "message" : "messages"}</p></div>
          {data.canResolve && <Button variant={data.topic.status === "OPEN" ? "primary" : "secondary"} disabled={Boolean(action) || data.hasMore} onClick={toggleStatus} className="shrink-0">{action === "status" ? "Updating…" : data.hasMore ? "Syncing messages…" : data.topic.status === "OPEN" ? "✓ Mark resolved" : "↺ Reopen topic"}</Button>}
        </div>
        {data.topic.status === "RESOLVED" ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">✓ Resolved by {data.topic.resolvedBy?.name || "a team member"} on {discussionTime(data.topic.resolvedAt)}. This conversation is saved for everyone in the team.</p>
          : <p className="mt-3 text-xs text-slate-500">Anyone in the team can reply. Only the topic creator or team owner can mark it resolved.</p>}
      </header>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Discussion chat">
        <p role="status" className="sr-only">{data.topic.messageCount} messages. Topic {data.topic.status === "OPEN" ? "open" : "resolved"}.</p>
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3"><h2 className="text-sm font-bold text-slate-800">Conversation</h2><span className="text-xs text-slate-500">{error ? "Sync interrupted" : "Auto-refresh · 10s"}</span></div>
        <div ref={messagesBox} className="max-h-[60vh] min-h-64 overflow-y-auto overscroll-contain bg-slate-50/60 p-4 sm:p-6" onScroll={event => {
          const box = event.currentTarget;
          followLatest.current = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
          setNewMessages(!followLatest.current);
        }}>
          {data.hasOlder && <div className="mb-5 text-center"><Button variant="secondary" onClick={loadOlder} disabled={olderBusy}>{olderBusy ? "Loading…" : "Load earlier messages"}</Button></div>}
          <ol className="space-y-5" aria-label="Messages">{data.messages.map(message => {
            const own = message.author.id === user?.id;
            return <li key={message.id} className={`discussion-message flex gap-2 sm:gap-3 ${own ? "flex-row-reverse" : ""}`}>
              <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${own ? "bg-brand-100 text-brand-700" : "bg-violet-100 text-violet-700"}`}>{message.author.name.slice(0, 1).toUpperCase()}</span>
              <article className={`min-w-0 max-w-[85%] rounded-2xl border px-4 py-3 ${own ? "rounded-tr-sm border-brand-200 bg-brand-50" : "rounded-tl-sm border-slate-200 bg-white"}`}>
                <header className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs"><span className="break-words font-bold text-slate-800">{message.author.name}{own ? " (you)" : ""}</span><time dateTime={message.createdAt} className="text-slate-500">{discussionTime(message.createdAt)}</time></header>
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 [overflow-wrap:anywhere]">{message.body}</p>
              </article>
            </li>;
          })}</ol>
        </div>
        {newMessages && <div className="border-t border-slate-100 px-5 py-2"><button type="button" onClick={scrollToLatest} className="text-xs font-semibold text-brand-700">↓ Jump to latest messages</button></div>}
        <div className="border-t border-slate-200 p-4 sm:p-5">
          {actionError && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
          <p role="status" className="mb-2 text-xs text-emerald-700">{notice}</p>
          {data.topic.status === "OPEN" ? <form onSubmit={send} className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">Your message<textarea value={body} onChange={event => { setBody(event.target.value); requestId.current = crypto.randomUUID(); }} required maxLength={4000} rows={3} disabled={Boolean(action)} placeholder="Share your thoughts, a solution, or a question…" className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm font-normal leading-6 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" /></label>
            <div className="flex flex-wrap items-center gap-4"><Button type="submit" disabled={Boolean(action) || !body.trim()}>{action === "message" ? "Sending…" : "Send message ↗"}</Button><span className="text-xs text-slate-400">{body.length}/4,000 · Visible only to this team</span></div>
          </form> : <p className="text-sm leading-6 text-slate-500">This topic is complete and replies are closed. {data.canResolve ? "Reopen it above to continue the conversation." : "Ask the topic creator or team owner to reopen it if needed."}{body && " Your unsent draft is kept here while this page stays open."}</p>}
        </div>
      </section>
    </>}
  </div>;
}
export default function DiscussionPage() {
  const { teamId, topicId } = useParams();
  return <Discussion key={`${teamId}:${topicId}`} teamId={teamId} topicId={topicId} />;
}
