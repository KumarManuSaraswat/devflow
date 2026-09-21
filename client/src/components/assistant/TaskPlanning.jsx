import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import Button from "../common/Button";
import SkillPicker from "./SkillPicker";

function PlanningEditor({ task, onUpdated, onClose }) {
  const [skills, setSkills] = useState(task.requiredSkills || []);
  const [hours, setHours] = useState(task.estimatedHours ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.patch(`/tasks/${task.id}`, { requiredSkills: skills, estimatedHours: hours === "" ? null : Number(hours) });
      await onUpdated();
      onClose();
    } catch (err) { setError(err.response?.data?.message || "Unable to save planning details."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className="mt-4 space-y-4">
    <SkillPicker value={skills} onChange={setSkills} disabled={busy} label="Required skills" />
    <label className="block text-sm text-slate-600">Estimated total effort (hours)
      <input type="number" value={hours} min="0.25" max="10000" step="0.25" disabled={busy} onChange={e => setHours(e.target.value)}
        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="Not estimated" />
    </label>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex gap-2"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save planning details"}</Button><Button variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button></div>
  </form>;
}

export default function TaskPlanning({ task, canEdit, onUpdated }) {
  const [editing, setEditing] = useState(false);
  return <section className="rounded-2xl border border-slate-200 bg-white/80 p-5">
    <h2 className="font-bold text-slate-900">Planning context</h2>
    <p className="mt-2 text-sm text-slate-500">{task.requiredSkills?.length ? task.requiredSkills.join(" · ") : "Required skills not recorded"}</p>
    <p className="mt-1 text-sm text-slate-500">{task.estimatedHours == null ? "Effort not estimated" : `${task.estimatedHours} hours estimated total effort`}</p>
    <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-brand-700">
      {canEdit && !editing && <button type="button" onClick={() => setEditing(true)} className="hover:underline">Edit planning details</button>}
      {task.status !== "COMPLETED" && <Link to={`/assistant?team=${task.project.teamId}&project=${task.projectId}&task=${task.id}`} className="hover:underline">Discuss with DevFlow ✦</Link>}
    </div>
    {editing && canEdit && <PlanningEditor task={task} onUpdated={onUpdated} onClose={() => setEditing(false)} />}
  </section>;
}
