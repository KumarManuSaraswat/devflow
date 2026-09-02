import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getTaskById } from "../api/taskApi";
import { useAuth } from "../context/AuthContext";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import PageLoader from "../components/common/PageLoader";
import TaskReviewActions from "../components/tasks/TaskReviewActions";
import TaskStatusActions from "../components/tasks/TaskStatusActions";
import {
  PRIORITY_LABELS,
  PRIORITY_STYLES,
} from "../utils/taskStatus";

const getInitials = (name = "") => {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const TaskPage = () => {
  const { taskId } = useParams();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [membership, setMembership] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTask = async () => {
    try {
      setError("");

      const response = await getTaskById(taskId);

      setTask(response.task);
      setMembership(response.membership);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load this task."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const handleUpdated = async () => {
    await loadTask();
  };

  const latestReview = useMemo(() => {
    return task?.reviews?.[0] || null;
  }, [task]);

  if (isLoading) {
    return <PageLoader text="Loading task details..." />;
  }

  if (error && !task) {
    return (
      <main className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p role="alert">{error}</p>

        <Link
          to="/teams"
          className="mt-4 inline-block font-semibold underline"
        >
          Back to teams
        </Link>
      </main>
    );
  }

  return (
    <div className="space-y-7">
      <section>
        <Link
          to={`/projects/${task.projectId}`}
          className="inline-flex items-center text-sm font-semibold text-slate-500 transition hover:text-brand-600"
        >
          <span className="mr-2">←</span>
          Back to project
        </Link>

        <div className="mt-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <Badge value={task.status}>
                {task.status.replaceAll("_", " ")}
              </Badge>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${PRIORITY_STYLES[task.priority]}`}
              >
                {PRIORITY_LABELS[task.priority]}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {task.title}
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              {task.description ||
                "No description was provided for this task."}
            </p>
          </div>

          {task.dueDate && (
            <Card className="shrink-0 p-4 lg:min-w-52">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Due date
              </p>

              <p className="mt-1 font-bold text-slate-900">
                {new Date(task.dueDate).toLocaleDateString(
                  undefined,
                  {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }
                )}
              </p>
            </Card>
          )}
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Workflow actions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Update progress and move the task through review.
                </p>
              </div>

              <Badge value={membership?.role}>
                {membership?.role}
              </Badge>
            </div>

            <div className="mt-6 space-y-6">
              <TaskStatusActions
                task={task}
                currentUserId={user.id}
                membershipRole={membership.role}
                onUpdated={handleUpdated}
              />

              <TaskReviewActions
                task={task}
                currentUserId={user.id}
                membershipRole={membership.role}
                onUpdated={handleUpdated}
              />
            </div>
          </Card>

          {task.pullRequestUrl && (
            <Card className="border-brand-200 bg-brand-50/50 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white font-bold text-brand-700 shadow-sm">
                  PR
                </div>

                <div className="min-w-0">
                  <h2 className="font-bold text-slate-900">
                    Pull request attached
                  </h2>

                  <p className="mt-1 truncate text-sm text-slate-500">
                    {task.pullRequestUrl}
                  </p>

                  <a
                    href={task.pullRequestUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex font-semibold text-brand-700 hover:text-brand-900"
                  >
                    Open pull request →
                  </a>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Review history
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Feedback from assigned reviewers.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                {task.reviews?.length || 0}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {task.reviews?.length ? (
                task.reviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge
                        value={
                          review.decision === "APPROVED"
                            ? "COMPLETED"
                            : "CHANGES_REQUESTED"
                        }
                      >
                        {review.decision.replaceAll(
                          "_",
                          " "
                        )}
                      </Badge>

                      <time className="text-xs text-slate-400">
                        {new Date(
                          review.createdAt
                        ).toLocaleString()}
                      </time>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {review.comment}
                    </p>

                    <p className="mt-3 text-xs font-medium text-slate-500">
                      Reviewed by {review.reviewer.name}
                    </p>
                  </article>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
                  <p className="text-sm text-slate-500">
                    No reviews have been submitted yet.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-950">
              People
            </h2>

            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Developers
              </p>

              <div className="mt-3 space-y-3">
                {task.assignees?.length ? (
                  task.assignees.map((assignee) => (
                    <div
                      key={assignee.user.id}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                        {getInitials(assignee.user.name)}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {assignee.user.name}
                        </p>

                        <p className="truncate text-xs text-slate-500">
                          {assignee.user.email}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No developers assigned.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Reviewers
              </p>

              <div className="mt-3 space-y-3">
                {task.reviewers?.length ? (
                  task.reviewers.map((reviewer) => (
                    <div
                      key={reviewer.user.id}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                        {getInitials(reviewer.user.name)}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {reviewer.user.name}
                        </p>

                        <p className="truncate text-xs text-slate-500">
                          {reviewer.user.email}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No reviewers assigned.
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-950">
              Activity
            </h2>

            <div className="mt-5 space-y-5">
              {task.activity?.length ? (
                task.activity.map((activity, index) => (
                  <div
                    key={activity.id}
                    className="relative flex gap-3"
                  >
                    {index !== task.activity.length - 1 && (
                      <span className="absolute left-3.5 top-8 h-full w-px bg-slate-200" />
                    )}

                    <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                      {getInitials(
                        activity.actor?.name || "System"
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {activity.action
                          .replaceAll("_", " ")
                          .toLowerCase()}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {activity.actor?.name || "System"} ·{" "}
                        {new Date(
                          activity.createdAt
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No activity yet.
                </p>
              )}
            </div>
          </Card>

          {latestReview && (
            <Card className="border-amber-200 bg-amber-50/60 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                Latest review
              </p>

              <p className="mt-2 text-sm leading-6 text-amber-900">
                {latestReview.comment}
              </p>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
};

export default TaskPage;