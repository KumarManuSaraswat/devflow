const getInitials = (name = "") => {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const MemberSelector = ({
  label,
  helpText,
  members,
  selectedIds,
  onChange,
  emptyText,
  accent = "brand",
}) => {
  const toggleMember = (userId) => {
    const isSelected = selectedIds.includes(userId);

    if (isSelected) {
      onChange(
        selectedIds.filter((id) => id !== userId)
      );
    } else {
      onChange([...selectedIds, userId]);
    }
  };

  const accentClasses =
    accent === "amber"
      ? {
          selected:
            "border-amber-400 bg-amber-50 ring-2 ring-amber-100",
          avatar: "bg-amber-100 text-amber-700",
          check: "bg-amber-500",
        }
      : {
          selected:
            "border-brand-400 bg-brand-50 ring-2 ring-brand-100",
          avatar: "bg-brand-100 text-brand-700",
          check: "bg-brand-600",
        };

  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-semibold text-slate-700">
        {label}
      </legend>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {helpText}
      </p>

      {members.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center">
          <p className="text-xs font-medium text-slate-400">
            {emptyText}
          </p>
        </div>
      ) : (
        <div className="mt-3 max-h-56 min-w-0 space-y-2 overflow-y-auto pr-1">
          {members.map((member) => {
            const userId = member.user.id;
            const isSelected = selectedIds.includes(userId);

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => toggleMember(userId)}
                aria-pressed={isSelected}
                className={[
                  "flex min-w-0 w-full items-center gap-2 rounded-xl border p-3 text-left transition",
                  "focus:outline-none focus:ring-4 focus:ring-brand-100",
                  isSelected
                    ? accentClasses.selected
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    isSelected
                      ? accentClasses.avatar
                      : "bg-slate-100 text-slate-600",
                  ].join(" ")}
                >
                  {getInitials(member.user.name)}
                </span>

                <span className="min-w-0 flex-1 overflow-hidden">
                  <span className="block truncate text-sm font-semibold text-slate-800">
                    {member.user.name}
                  </span>

                  <span className="block truncate text-xs text-slate-500">
                    {member.role} · {member.user.email}
                  </span>
                </span>

                <span
                  className={[
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold text-white",
                    isSelected
                      ? `border-transparent ${accentClasses.check}`
                      : "border-slate-300 bg-white text-transparent",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  ✓
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-2 text-xs text-slate-400">
        {selectedIds.length} selected
      </p>
    </fieldset>
  );
};

export default MemberSelector;