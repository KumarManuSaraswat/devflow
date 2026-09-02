import { useState } from "react";
import Button from "../common/Button";
import MemberSelector from "./MemberSelector";

const CreateTaskForm = ({
  onSubmit,
  onCancel,
  members = [],
  isSubmitting,
}) => {
  const developers = members.filter((member) =>
    ["OWNER", "ADMIN", "DEVELOPER", "TRAINEE"].includes(
      member.role
    )
  );

  const reviewers = members.filter((member) =>
    ["OWNER", "ADMIN", "REVIEWER"].includes(
      member.role
    )
  );

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "2",
    dueDate: "",
    assigneeIds: developers[0]
      ? [developers[0].user.id]
      : [],
    reviewerIds: [],
  });

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSubmit({
      title: formData.title.trim(),
      description: formData.description.trim(),
      priority: Number(formData.priority),
      dueDate: formData.dueDate
        ? new Date(formData.dueDate).toISOString()
        : undefined,
      assigneeIds: formData.assigneeIds,
      reviewerIds: formData.reviewerIds,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div>
        <p className="text-sm leading-6 text-slate-500">
          Add a task, assign the people responsible for it, and
          choose who will review the work.
        </p>
      </div>

      <div className="grid min-w-0 gap-5 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="text-sm font-semibold text-slate-700">
            Task title
          </span>

          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Build authentication page"
            minLength="3"
            maxLength="150"
            required
            autoFocus
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-sm font-semibold text-slate-700">
            Description{" "}
            <span className="font-normal text-slate-400">
              (optional)
            </span>
          </span>

          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe what needs to be completed..."
            rows="3"
            maxLength="5000"
            className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">
            Priority
          </span>

          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          >
            <option value="1">Low</option>
            <option value="2">Medium</option>
            <option value="3">High</option>
            <option value="4">Urgent</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">
            Due date
          </span>

          <input
            type="date"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleChange}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </label>

        <MemberSelector
           label="Developers"
           helpText="Select the people responsible for completing this task."
           members={developers}
           selectedIds={formData.assigneeIds}
           onChange={(assigneeIds) =>
               setFormData((current) => ({
                   ...current,
                   assigneeIds,
                   }))
                 }
           emptyText="No eligible developers found."
           accent="brand"
        />

        <MemberSelector
           label="Reviewers"
           helpText="Select who will review the submitted work."
           members={reviewers}
           selectedIds={formData.reviewerIds}
           onChange={(reviewerIds) =>
             setFormData((current) => ({
              ...current,
              reviewerIds,
           }))
          }
          emptyText="No eligible reviewers found."
          accent="amber"
        />
      </div>

      {formData.assigneeIds.length === 0 && (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          Select at least one developer before creating the task.
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          disabled={
            isSubmitting ||
            formData.assigneeIds.length === 0
          }
        >
          {isSubmitting ? "Creating task..." : "Create task"}
        </Button>
      </div>
    </form>
  );
};

export default CreateTaskForm;