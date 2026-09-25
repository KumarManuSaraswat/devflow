export default function DiscussionStatus({ status }) {
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${status === "RESOLVED" ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200" : "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200"}`}>
    <span aria-hidden="true">{status === "RESOLVED" ? "✓" : "◌"}</span>{status === "RESOLVED" ? "Resolved" : "Open"}
  </span>;
}
