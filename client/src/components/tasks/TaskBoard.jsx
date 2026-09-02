import TaskCard from "./TaskCard";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  TASK_STATUSES,
} from "../../utils/taskStatus";

const TaskBoard = ({ tasks }) => {
  const tasksByStatus = TASK_STATUSES.reduce(
    (groups, status) => {
      groups[status] = tasks.filter(
        (task) => task.status === status
      );

      return groups;
    },
    {}
  );

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex min-w-max gap-4">
        {TASK_STATUSES.map((status) => {
          const style = STATUS_STYLES[status];
          const columnTasks = tasksByStatus[status];

          return (
            <section
              key={status}
              className="flex w-72 flex-col rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
            >
              <header className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${style.dot}`}
                  />

                  <h3 className="text-sm font-bold text-slate-800">
                    {STATUS_LABELS[status]}
                  </h3>
                </div>

                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${style.count}`}
                >
                  {columnTasks.length}
                </span>
              </header>

              <div className="min-h-32 space-y-3">
                {columnTasks.length === 0 ? (
                  <div
                    className={`rounded-xl border border-dashed ${style.border} px-3 py-8 text-center`}
                  >
                    <p className="text-xs font-medium text-slate-400">
                      No tasks here
                    </p>
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default TaskBoard;