import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { askAssistant, getAssistantContext } from "../api/assistantApi";
import Button from "../components/common/Button";
import PageLoader from "../components/common/PageLoader";
import SkillPicker from "../components/assistant/SkillPicker";

const field = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 disabled:opacity-60";
const starters = [
  { icon: "↗", label: "Find the right person", message: "Who should I assign this task to?", intent: "assign" },
  { icon: "◷", label: "Plan my team size", message: "How many members are needed for this project?", intent: "team" },
  { icon: "⤴", label: "Break down the work", message: "How should we divide this project into tasks?", intent: "breakdown" },
  { icon: "≋", label: "Balance the workload", message: "How can we balance our current workload?", intent: "workload" },
];
const fallbackLabels = {
  local_choice: "Answered using your team's data. No external AI request.",
  cloud_not_configured: "Cloud is not configured. Your built-in advisor is still available.",
  privacy_guard: "Cloud was skipped by the privacy guard. Remove secrets from your question.",
  quota_store_unavailable: "Cloud usage could not be verified, so the built-in advisor answered.",
  cloud_unavailable: "Cloud limits were reached or providers were unavailable. Built-in advice is ready.",
};

function Answer({ result }) {
  return <div className="assistant-answer rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
      <span className="text-brand-700">✦ DevFlow</span>
      <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{result.source === "builtin" ? "Built-in advisor" : result.source === "gemini" ? "Gemini" : "Groq"}</span>
    </div>
    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{result.answer}</p>
    {!!result.recommendations?.length && <div className="mt-5 border-t border-slate-100 pt-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Skill & workload matches · calculated by DevFlow</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {result.recommendations.map((member, index) => <div key={member.userId} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
          <p className="break-words text-sm font-semibold text-slate-900"><span className="mr-2 text-brand-500">{String(index + 1).padStart(2, "0")}</span>{member.name}</p>
          <p className="mt-1 text-xs text-slate-500">{member.role.toLowerCase()} · {member.estimatedOpenHours}h estimated other open effort</p>
          <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600">{member.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
        </div>)}
      </div>
    </div>}
    <details className="mt-4 text-xs leading-6 text-slate-500"><summary className="cursor-pointer font-semibold">Assumptions & limitations</summary>
      <ul className="mt-2 list-disc pl-4">{result.warnings.map(w => <li key={w}>{w}</li>)}</ul>
    </details>
    <p className="mt-3 text-xs leading-5 text-slate-500">{fallbackLabels[result.reason] || "Cloud-generated advice can be wrong. Confirm it with your team."}</p>
  </div>;
}

function Chat({ team, context, initialProject, initialTask }) {
  const [projectId, setProjectId] = useState(context.projects.some(p => p.id === initialProject) ? initialProject : "");
  const [taskId, setTaskId] = useState(context.tasks.some(t => t.id === initialTask && (!initialProject || t.projectId === initialProject)) ? initialTask : "");
  const [skills, setSkills] = useState([]);
  const [planning, setPlanning] = useState({ totalHours: "", weeks: "", hoursPerMember: "" });
  const [message, setMessage] = useState("");
  const [intent, setIntent] = useState("auto");
  const [messages, setMessages] = useState([]);
  const [allowCloud, setAllowCloud] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(null);
  const conversation = useRef(null);
  const composer = useRef(null);
  const cloudReady = context.providers.gemini || context.providers.groq;
  const tasks = context.tasks.filter(t => !projectId || t.projectId === projectId);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (messages.length) conversation.current?.lastElementChild?.scrollIntoView({ behavior: "auto", block: "start" });
  }, [messages]);

  async function send(event) {
    event.preventDefault();
    if (busy || message.trim().length < 3) return;
    setBusy(true);
    setError("");
    const question = message.trim();
    const controller = new AbortController();
    request.current = controller;
    const inputs = Object.fromEntries(Object.entries(planning).filter(([, value]) => value !== "").map(([key, value]) => [key, Number(value)]));
    try {
      const result = await askAssistant(team.id, { message: question, intent, projectId: projectId || undefined,
        taskId: taskId || undefined, requiredSkills: skills, allowCloud, ...inputs }, controller.signal);
      if (controller.signal.aborted) return;
      const scope = context.projects.find(p => p.id === projectId)?.name || "Whole team";
      const taskTitle = context.tasks.find(t => t.id === taskId)?.title;
      setMessages(current => [...current.slice(-9), { question, scope: taskTitle ? `${scope} · ${taskTitle}` : scope, result, id: crypto.randomUUID() }]);
      setMessage("");
      setIntent("auto");
      setAllowCloud(false);
      composer.current?.focus({ preventScroll: true });
    } catch (err) {
      if (!controller.signal.aborted) setError(err.response?.data?.message || "Could not reach the advisor. Your question is saved below; please try again.");
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }

  return <form id="assistant-question" onSubmit={send} className="grid items-start gap-5 xl:grid-cols-[290px_minmax(0,1fr)]">
    <aside className="space-y-5 rounded-2xl border border-slate-200 bg-white/85 p-5">
      <div><p className="text-xs font-bold uppercase tracking-widest text-brand-600">Grounded in your workspace</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">{context.memberCount} active members · {context.tasks.length} open tasks. Workload is refreshed with every question.</p></div>
      <label className="block text-sm font-semibold text-slate-700">Project
        <select className={field} value={projectId} disabled={busy} onChange={e => { setProjectId(e.target.value); setTaskId(""); }}>
          <option value="">Whole team</option>{context.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold text-slate-700">Task to discuss
        <select className={field} value={taskId} disabled={busy} onChange={e => setTaskId(e.target.value)}>
          <option value="">No specific task</option>{tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </label>
      <details><summary className="cursor-pointer text-sm font-semibold text-slate-700">Planning inputs & skills</summary>
        <div className="mt-4 space-y-4">
          {[['totalHours', 'Total project effort (hours)', 100000], ['weeks', 'Delivery time (weeks)', 104], ['hoursPerMember', 'Dedicated hours/person/week', 80]].map(([key, label, max]) =>
            <label key={key} className="block text-xs font-semibold text-slate-600">{label}
              <input type="number" min="0.25" step="0.25" max={max} disabled={busy} value={planning[key]} placeholder="Not yet estimated"
                onChange={e => setPlanning(current => ({ ...current, [key]: e.target.value }))} className={field} />
            </label>)}
          <SkillPicker label="Additional required skills" value={skills} onChange={setSkills} disabled={busy} />
        </div>
      </details>
      <div className="rounded-xl bg-brand-50/70 p-3 text-xs leading-6 text-brand-800">Better inputs, better matches.
        <Link to={`/teams/${team.id}/members`} className="block font-bold underline underline-offset-4">Update member skills & availability →</Link>
      </div>
    </aside>

    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-5 py-4">
        <div className="flex items-center gap-3"><span aria-hidden="true" className="assistant-spark flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-xl text-white">✦</span>
          <div><h2 className="font-bold text-slate-900">Your planning partner</h2><p className="text-xs text-slate-500">Advice first. You stay in control.</p></div>
        </div>
        {!!messages.length && <Button variant="ghost" disabled={busy} onClick={() => setMessages([])} className="px-2 text-xs">Clear chat</Button>}
      </div>
      <div className="max-h-[65vh] min-h-80 overflow-y-auto overscroll-contain p-4 sm:p-6" aria-busy={busy}>
        {!messages.length && <div className="py-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">A little clarity goes a long way</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">What are we building together?</h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500">Find a good task owner, size your team, or turn a big idea into smaller steps. Start with a question.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">{starters.map(starter => <button key={starter.intent} type="button" disabled={busy}
            onClick={() => { setMessage(starter.message); setIntent(starter.intent); composer.current?.focus(); }}
            className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left text-sm font-semibold text-slate-700 transition duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-brand-500">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-lg text-brand-600">{starter.icon}</span>{starter.label}
          </button>)}</div>
        </div>}
        <div ref={conversation} role="log" aria-label="Planning conversation" aria-live="polite" aria-relevant="additions" className="space-y-6">
          {messages.map(item => <article key={item.id} className="space-y-3">
            <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-sm bg-brand-600 px-4 py-3 text-sm text-white">
              <p className="mb-1 break-words text-xs text-brand-100">You · {item.scope}</p><p className="whitespace-pre-wrap break-words">{item.question}</p>
            </div><Answer result={item.result} />
          </article>)}
        </div>
        {busy && <p role="status" className="mt-5 flex items-center gap-2 text-sm text-brand-700"><span className="assistant-thinking" aria-hidden="true">✦</span>Checking skills, workload and your planning inputs…</p>}
      </div>
      <div className="border-t border-slate-200 bg-white p-4 sm:p-5">
        {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <label htmlFor="assistant-message" className="sr-only">Your planning question</label>
        <textarea id="assistant-message" ref={composer} value={message} maxLength={2000} minLength={3} required rows={3} readOnly={busy}
          onChange={e => { setMessage(e.target.value); setIntent("auto"); }} placeholder="Ask about your team, project or task…"
          className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
        {cloudReady ? <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-600">
          <input type="checkbox" checked={allowCloud} disabled={busy} onChange={e => setAllowCloud(e.target.checked)} className="mt-1 accent-brand-600" />
          <span>Use cloud help for this question (Gemini → Groq → built-in). My question contains no personal, sensitive or confidential information, and I am 18 or older. Questions and a minimized skill/workload summary may be sent to configured providers; free Gemini content may be reviewed and used to improve Google products.</span>
        </label> : <p className="mt-3 text-xs leading-5 text-slate-500">Built-in mode is ready—no API key needed. Cloud help is off until configured on your server.</p>}
        <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Button type="submit" disabled={busy || message.trim().length < 3} className="shrink-0">{busy ? "Thinking…" : "Ask DevFlow ↗"}</Button>
          <p className="max-w-sm text-xs leading-5 text-slate-400">Each question uses the selected inputs, not previous messages. Chat stays in this tab and clears when you leave.</p>
        </div>
      </div>
    </section>
  </form>;
}

function TeamSession({ team, initialProject, initialTask }) {
  const [context, setContext] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    getAssistantContext(team.id, controller.signal).then(setContext).catch(err => {
      if (!controller.signal.aborted) setError(err.response?.data?.message || "Unable to load team context.");
    });
    return () => controller.abort();
  }, [team.id, retry]);
  if (error) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">{error}
    <Button variant="secondary" className="ml-3" onClick={() => { setError(""); setRetry(n => n + 1); }}>Try again</Button></div>;
  if (!context) return <PageLoader text="Getting your team's planning context…" />;
  return <Chat team={team} context={context} initialProject={initialProject} initialTask={initialTask} />;
}

export default function AssistantPage() {
  const [params] = useSearchParams();
  const [teams, setTeams] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(params.get("team") || "");
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    api.get("/teams", { signal: controller.signal }).then(({ data }) => setTeams(data.teams)).catch(err => {
      if (!controller.signal.aborted) setError(err.response?.data?.message || "Unable to load your teams.");
    });
    return () => controller.abort();
  }, []);
  const team = teams?.find(t => t.id === selectedTeam) || teams?.[0];
  return <div className="space-y-7">
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">DevFlow assistant</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Great teams start with a plan<span className="text-brand-500">.</span></h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">Less guesswork. Better task matches. A clearer next step.</p></div>
      {!!teams?.length && <label className="block min-w-44 text-xs font-semibold text-slate-500">Workspace
        <select className={field} value={team?.id || ""} onChange={e => setSelectedTeam(e.target.value)}>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      </label>}
    </header>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">{error} <Link to="/teams" className="underline">Back to teams</Link></p>
      : !teams ? <PageLoader text="Loading your workspaces…" />
      : !team ? <div className="rounded-2xl border border-slate-200 bg-white p-8"><h2 className="text-xl font-bold">Let's start with a team</h2><p className="mt-2 text-slate-500">Create or join a team so the advisor can use its members and assignments.</p><Link to="/teams" className="mt-4 inline-block font-semibold text-brand-700">Go to My Teams →</Link></div>
      : <TeamSession key={team.id} team={team} initialProject={params.get("project")} initialTask={params.get("task")} />}
  </div>;
}
