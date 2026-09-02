const roleStyles = {
  OWNER: "bg-violet-100 text-violet-700",
  ADMIN: "bg-indigo-100 text-indigo-700",
  REVIEWER: "bg-amber-100 text-amber-700",
  DEVELOPER: "bg-sky-100 text-sky-700",
  TRAINEE: "bg-slate-200 text-slate-700",

  BACKLOG: "bg-slate-100 text-slate-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-indigo-100 text-indigo-700",
  BLOCKED: "bg-red-100 text-red-700",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-green-100 text-green-700",
};

const Badge = ({ children, value, className = "" }) => {
  const style =
    roleStyles[value] || "bg-slate-100 text-slate-700";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1",
        "text-xs font-bold tracking-wide",
        style,
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
};

export default Badge;