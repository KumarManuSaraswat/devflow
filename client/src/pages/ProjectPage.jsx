import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { getProjectById } from "../api/projectApi";
import { getTeamMembers } from "../api/teamApi";
import {
  createTask,
  getProjectTasks,
} from "../api/taskApi";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Modal from "../components/common/Modal";
import PageLoader from "../components/common/PageLoader";
import CreateTaskForm from "../components/tasks/CreateTaskForm";
import TaskBoard from "../components/tasks/TaskBoard";

const ProjectPage = () => {
  const { projectId } = useParams();

  const [project, setProject] = useState(null);
  const [membership, setMembership] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const canManageTasks = ["OWNER", "ADMIN"].includes(
    membership?.role
  );

  const loadProjectData = async () => {
    try {
      setError("");

      const projectResponse = await getProjectById(projectId);

      const [tasksResponse, membersResponse] =
        await Promise.all([
          getProjectTasks(projectId),
          getTeamMembers(projectResponse.project.teamId),
        ]);

      setProject(projectResponse.project);
      setMembership(projectResponse.membership);
      setTasks(tasksResponse.tasks || []);
      setMembers(membersResponse.members || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load project data."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const taskStats = useMemo(() => {
    return {
      total: tasks.length,
      active: tasks.filter((task) =>
        ["ASSIGNED", "IN_PROGRESS", "BLOCKED"].includes(
          task.status
        )
      ).length,
      review: tasks.filter((task) =>
        ["IN_REVIEW", "CHANGES_REQUESTED"].includes(
          task.status
        )
      ).length,
      completed: tasks.filter(
        (task) => task.status === "COMPLETED"
      ).length,
    };
  }, [tasks]);

  const handleCreateTask = async (data) => {
    setIsCreating(true);
    setFormError("");

    try {
      const response = await createTask(projectId, data);

      setTasks((current) => [
        response.task,
        ...current,
      ]);

      setIsCreateOpen(false);

      toast.success("Task created successfully", {
        description: `"${response.task.title}" is ready for the team.`,
      });
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
          "Unable to create task."
      );

      toast.error("Unable to create task", {
        description:
          err.response?.data?.message ||
          "Please check the task details and try again.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return <PageLoader text="Loading project board..." />;
  }

  if (error && !project) {
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
          to={`/teams/${project.teamId}`}
          className="inline-flex items-center text-sm font-semibold text-slate-500 transition hover:text-brand-600"
        >
          <span className="mr-2">←</span>
          Back to {project.team?.name || "team"}
        </Link>

        <div className="mt-6 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                {project.name}
              </h1>

              <Badge value={membership?.role}>
                {membership?.role}
              </Badge>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {project.description ||
                "Plan, build, review, and deliver work with your team."}
            </p>
          </div>

          {canManageTasks && (
            <Button
              onClick={() => {
                setFormError("");
                setIsCreateOpen(true);
              }}
            >
              <span className="mr-2 text-lg leading-none">
                +
              </span>
              Create task
            </Button>
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm font-medium text-slate-500">
            Total tasks
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-950">
            {taskStats.total}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-sm font-medium text-slate-500">
            Active work
          </p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">
            {taskStats.active}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-sm font-medium text-slate-500">
            In review
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {taskStats.review}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-sm font-medium text-slate-500">
            Completed
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {taskStats.completed}
          </p>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Task board
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Track work from assignment through final delivery.
            </p>
          </div>

          {canManageTasks && (
            <button
              type="button"
              onClick={() => {
                setFormError("");
                setIsCreateOpen(true);
              }}
              className="hidden text-sm font-semibold text-brand-600 hover:text-brand-800 sm:block"
            >
              Add task →
            </button>
          )}
        </div>

        {tasks.length === 0 ? (
          <Card className="border-dashed">
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-xl font-bold text-brand-700">
                T
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No tasks yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Add the first task to start coordinating work
                across your team.
              </p>

              {canManageTasks && (
                <Button
                  className="mt-5"
                  onClick={() => {
                    setFormError("");
                    setIsCreateOpen(true);
                  }}
                >
                  Create first task
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <TaskBoard tasks={tasks} />
        )}
      </section>

      {isCreateOpen && (
        <Modal
          title="Create a task"
          onClose={() => {
            if (!isCreating) {
              setIsCreateOpen(false);
              setFormError("");
            }
          }}
          maxWidth="max-w-3xl"
        >
          {formError && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              {formError}
            </div>
          )}

          <CreateTaskForm
            members={members}
            onSubmit={handleCreateTask}
            onCancel={() => setIsCreateOpen(false)}
            isSubmitting={isCreating}
          />
        </Modal>
      )}
    </div>
  );
};

export default ProjectPage;