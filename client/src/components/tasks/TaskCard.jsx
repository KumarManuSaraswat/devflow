import { Link } from "react-router-dom";
import Badge from "../common/Badge";
import {
  PRIORITY_LABELS,
  PRIORITY_STYLES,
} from "../../utils/taskStatus";

const getInitials = (name = "") => {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const TaskCard = ({ task }) => {
  return (
    <Link
      to={`/tasks/${task.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <Badge
          className={PRIORITY_STYLES[task.priority]}
          value=""
        >
          {PRIORITY_LABELS[task.priority] || "Priority"}
        </Badge>

        <span className="text-xs font-medium text-slate-400">
          #{task.id.slice(-5)}
        </span>
      </div>

      <h4 className="mt-3 line-clamp-2 text-sm font-bold leading-5 text-slate-900 group-hover:text-brand-700">
        {task.title}
      </h4>

      {task.description && (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
          {task.description}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="flex -space-x-2">
          {task.assignees?.slice(0, 3).map((assignee) => (
            <span
              key={assignee.user.id}
              title={assignee.user.name}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand-100 text-[10px] font-bold text-brand-700"
            >
              {getInitials(assignee.user.name)}
            </span>
          ))}

          {(!task.assignees ||
            task.assignees.length === 0) && (
            <span className="text-xs text-slate-400">
              Unassigned
            </span>
          )}
        </div>

        {task.dueDate && (
          <span className="text-xs font-medium text-slate-500">
            {new Date(task.dueDate).toLocaleDateString(
              undefined,
              {
                month: "short",
                day: "numeric",
              }
            )}
          </span>
        )}
      </div>
    </Link>
  );
};

export default TaskCard;