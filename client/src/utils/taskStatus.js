export const TASK_STATUSES = [
  "BACKLOG",
  "ASSIGNED",
  "IN_PROGRESS",
  "BLOCKED",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "COMPLETED",
];

export const STATUS_LABELS = {
  BACKLOG: "Backlog",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
  IN_REVIEW: "In Review",
  CHANGES_REQUESTED: "Changes Requested",
  APPROVED: "Approved",
  COMPLETED: "Completed",
};

export const STATUS_STYLES = {
  BACKLOG: {
    dot: "bg-slate-400",
    count: "bg-slate-100 text-slate-600",
    border: "border-slate-200",
  },
  ASSIGNED: {
    dot: "bg-blue-500",
    count: "bg-blue-100 text-blue-700",
    border: "border-blue-200",
  },
  IN_PROGRESS: {
    dot: "bg-indigo-500",
    count: "bg-indigo-100 text-indigo-700",
    border: "border-indigo-200",
  },
  BLOCKED: {
    dot: "bg-red-500",
    count: "bg-red-100 text-red-700",
    border: "border-red-200",
  },
  IN_REVIEW: {
    dot: "bg-amber-500",
    count: "bg-amber-100 text-amber-700",
    border: "border-amber-200",
  },
  CHANGES_REQUESTED: {
    dot: "bg-orange-500",
    count: "bg-orange-100 text-orange-700",
    border: "border-orange-200",
  },
  APPROVED: {
    dot: "bg-emerald-500",
    count: "bg-emerald-100 text-emerald-700",
    border: "border-emerald-200",
  },
  COMPLETED: {
    dot: "bg-green-500",
    count: "bg-green-100 text-green-700",
    border: "border-green-200",
  },
};

export const PRIORITY_LABELS = {
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Urgent",
};

export const PRIORITY_STYLES = {
  1: "bg-slate-100 text-slate-600",
  2: "bg-blue-100 text-blue-700",
  3: "bg-orange-100 text-orange-700",
  4: "bg-red-100 text-red-700",
};