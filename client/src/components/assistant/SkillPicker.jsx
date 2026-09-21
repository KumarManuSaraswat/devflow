import { SKILLS } from "../../utils/skills";

export default function SkillPicker({ value, onChange, label = "Skills", disabled = false }) {
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 text-sm font-semibold text-slate-700">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {SKILLS.map(skill => (
          <button key={skill} type="button" aria-pressed={value.includes(skill)}
            onClick={() => onChange(value.includes(skill) ? value.filter(s => s !== skill) : [...value, skill])}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${value.includes(skill) ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-500 hover:border-brand-300 hover:text-brand-700"}`}>
            {skill}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
