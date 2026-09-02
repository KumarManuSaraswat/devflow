import { useState } from "react";
import {
  completeTask,
  reviewTask,
  submitTaskForReview,
} from "../../api/taskApi";
import Button from "../common/Button";

const TaskReviewActions = ({
  task,
  currentUserId,
  membershipRole,
  onUpdated,
}) => {
  const [pullRequestUrl, setPullRequestUrl] =
    useState(task.pullRequestUrl || "");

  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isManager = ["OWNER", "ADMIN"].includes(
    membershipRole
  );

  const isAssignedDeveloper = task.assignees?.some(
    (assignee) => assignee.user.id === currentUserId
  );

  const isAssignedReviewer = task.reviewers?.some(
    (reviewer) => reviewer.user.id === currentUserId
  );

  const canSubmit =
    isAssignedDeveloper &&
    ["IN_PROGRESS", "CHANGES_REQUESTED"].includes(
      task.status
    );

  const canReview =
    isAssignedReviewer && task.status === "IN_REVIEW";

  const canComplete =
    isManager && task.status === "APPROVED";

  const handleSubmitForReview = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await submitTaskForReview(
        task.id,
        pullRequestUrl
      );

      onUpdated(response.task);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to submit task for review."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async (decision) => {
    if (!comment.trim()) {
      setError("Add a review comment first.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await reviewTask(
        task.id,
        decision,
        comment
      );

      setComment("");
      onUpdated(response.task);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to submit review."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const response = await completeTask(task.id);
      onUpdated(response.task);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to complete task."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasActions =
    canSubmit ||
    canReview ||
    canComplete ||
    task.pullRequestUrl;

  if (!hasActions) {
    return null;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {canSubmit && (
        <form
          onSubmit={handleSubmitForReview}
          className="rounded-xl border border-amber-200 bg-amber-50/60 p-4"
        >
          <h3 className="font-bold text-slate-900">
            Submit for review
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Add a pull request link if this task includes code
            changes.
          </p>

          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-700">
              Pull request URL{" "}
              <span className="font-normal text-slate-400">
                (optional)
              </span>
            </span>

            <input
              type="url"
              value={pullRequestUrl}
              onChange={(event) =>
                setPullRequestUrl(event.target.value)
              }
              placeholder="https://github.com/owner/repo/pull/123"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
          </label>

          <Button
            type="submit"
            className="mt-4"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Submitting..."
              : "Submit for review"}
          </Button>
        </form>
      )}

      {canReview && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
          <h3 className="font-bold text-slate-900">
            Review this task
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Explain what is correct or what needs revision.
          </p>

          <textarea
            value={comment}
            onChange={(event) =>
              setComment(event.target.value)
            }
            placeholder="Write review feedback..."
            minLength="3"
            maxLength="3000"
            rows="4"
            className="mt-4 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => handleReview("APPROVED")}
              disabled={isSubmitting}
            >
              Approve task
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                handleReview("CHANGES_REQUESTED")
              }
              disabled={isSubmitting}
            >
              Request changes
            </Button>
          </div>
        </div>
      )}

      {canComplete && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <h3 className="font-bold text-slate-900">
            Final approval
          </h3>

          <p className="mt-1 text-sm text-slate-600">
            A reviewer approved this task. You can now mark it
            as completed.
          </p>

          <Button
            type="button"
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
            onClick={handleComplete}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Completing..."
              : "Mark as completed"}
          </Button>
        </div>
      )}

      {task.pullRequestUrl && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">
            Pull request attached
          </p>

          <a
            href={task.pullRequestUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block truncate text-sm font-semibold text-brand-600 hover:text-brand-800"
          >
            Open GitHub pull request →
          </a>
        </div>
      )}
    </div>
  );
};

export default TaskReviewActions;