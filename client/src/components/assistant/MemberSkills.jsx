import { useState } from "react";
import { updateMemberProfile } from "../../api/assistantApi";
import Button from "../common/Button";
import SkillPicker from "./SkillPicker";

function ProfileForm({ teamId, member, onUpdated, onCancel }) {
  const [skills, setSkills] = useState(member.skills || []);
  const [hours, setHours] = useState(member.weeklyHours ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await updateMemberProfile(teamId, member.id, { skills, weeklyHours: hours === "" ? null : Number(hours) });
      onUpdated(result.member);
      onCancel();
    } catch (err) { setError(err.response?.data?.message || "Could not save the profile. Please try again."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className="mt-3 space-y-4 rounded-xl bg-slate-50 p-3">
    <SkillPicker value={skills} onChange={setSkills} disabled={busy} label="Recorded skills" />
    <label className="block text-sm text-slate-600">Hours available to this team per week
      <input type="number" min="0" max="80" step="1" value={hours} onChange={e => setHours(e.target.value)} disabled={busy}
        placeholder="Unknown" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
      <span className="mt-1 block text-xs text-slate-500">Blank = unknown · 0 = unavailable. Confirm with the member.</span>
    </label>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex gap-2"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
      <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button></div>
  </form>;
}

export default function MemberSkills({ teamId, member, canEdit, onUpdated }) {
  const [editing, setEditing] = useState(false);
  return <div className="mt-4 border-t border-slate-100 pt-3">
    <p className="text-xs leading-6 text-slate-500">{member.skills?.length ? member.skills.join(" · ") : "No skills recorded yet"}</p>
    <p className="text-xs text-slate-500">{member.weeklyHours == null ? "Weekly availability unknown" : member.weeklyHours === 0 ? "Currently unavailable" : `${member.weeklyHours} hours/week`}</p>
    {canEdit && !editing && <button type="button" onClick={() => setEditing(true)} className="mt-2 text-sm font-semibold text-brand-700 hover:underline">Edit skills & availability</button>}
    {canEdit && editing && <ProfileForm teamId={teamId} member={member} onUpdated={onUpdated} onCancel={() => setEditing(false)} />}
  </div>;
}
