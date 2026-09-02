import { useState } from "react";
import { toast } from "sonner";
import { updateTaskStatus } from "../../api/taskApi";
import Button from "../common/Button";
import {
  STATUS_LABELS,
  TASK_STATUSES,
} from "../../utils/taskStatus";

const TaskStatusActions = ({
  task,
  currentUserId,
  membershipRole,
  onUpdated,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");

  const isManager = ["OWNER", "ADMIN"].includes(
    membershipRole
  );

  const isAssignedDeveloper = task.assignees?.some(
    (assignee) => assignee.user.id === currentUserId
  );

  const canUpdateStatus =
    isManager || isAssignedDeveloper;

  if (!canUpdateStatus) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm text-slate-500">
          You can view this task, but you are not assigned to
          update its status.
        </p>
      </div>
    );
  }

  const developerStatuses = [
    "IN_PROGRESS",
    "BLOCKED",
    "IN_REVIEW",
  ];

  const availableStatuses = isManager
    ? TASK_STATUSES
    : developerStatuses;

  const handleStatusChange = async (status) => {
    if (!status || status === task.status) {
      return;
    }

    setIsUpdating(true);
    setError("");

    try {
      const response = await updateTaskStatus(
        task.id,
        status
      );

      onUpdated(response.task);

      toast.success("Task status updated", {
        description: `Moved to ${STATUS_LABELS[response.task.status]}.`,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update task status."
      );

      toast.error("Unable to update task status", {
        description:
          err.response?.data?.message ||
          "Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">
            Update status
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Current: {STATUS_LABELS[task.status]}
          </p>
        </div>

        <select
          value={task.status}
          onChange={(event) =>
            handleStatusChange(event.target.value)
          }
          disabled={isUpdating}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        >
          {availableStatuses.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {isUpdating && (
        <p className="mt-3 text-sm text-slate-500">
          Updating task status...
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 text-sm font-medium text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default TaskStatusActions;