import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { getTeamById } from "../api/teamApi";
import {
  createProject,
  getTeamProjects,
} from "../api/projectApi";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Modal from "../components/common/Modal";
import PageLoader from "../components/common/PageLoader";

const TeamPage = () => {
  const { teamId } = useParams();

  const [team, setTeam] = useState(null);
  const [membership, setMembership] = useState(null);
  const [projects, setProjects] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const canManageProjects = ["OWNER", "ADMIN"].includes(
    membership?.role
  );

  const loadTeamData = async () => {
    try {
      setError("");

      const [teamResponse, projectsResponse] =
        await Promise.all([
          getTeamById(teamId),
          getTeamProjects(teamId),
        ]);

      setTeam(teamResponse.team);
      setMembership(teamResponse.membership);
      setProjects(projectsResponse.projects || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load this workspace."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, [teamId]);

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const closeModal = () => {
    if (isCreating) {
      return;
    }

    setFormError("");
    setIsCreateOpen(false);
  };

  const handleCreateProject = async (event) => {
    event.preventDefault();
    setIsCreating(true);
    setFormError("");

    try {
      const newProjectName = formData.name.trim();

      await createProject(teamId, {
        name: newProjectName,
        description: formData.description.trim(),
      });

      setFormData({
        name: "",
        description: "",
      });

      setIsCreateOpen(false);
      await loadTeamData();

      toast.success("Project created", {
        description: `"${newProjectName}" was added to this workspace.`,
      });
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
          "Unable to create project."
      );

      toast.error("Unable to create project", {
        description:
          err.response?.data?.message ||
          "Please try again.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return <PageLoader text="Loading workspace..." />;
  }

  if (error && !team) {
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

  const memberCount = team?._count?.members || 0;
  const projectCount = team?._count?.projects || projects.length;

  return (
    <div className="space-y-8">
      <section>
        <Link
          to="/teams"
          className="inline-flex items-center text-sm font-semibold text-slate-500 transition hover:text-brand-600"
        >
          <span className="mr-2">←</span>
          Back to teams
        </Link>

        <div className="mt-6 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-black text-white shadow-lg shadow-brand-200">
              {team.name.charAt(0).toUpperCase()}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  {team.name}
                </h1>

                <Badge value={membership?.role}>
                  {membership?.role}
                </Badge>
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                {team.description ||
                  "No workspace description provided."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to={`/teams/${teamId}/members`}>
              <Button variant="secondary">
                Manage members
              </Button>
            </Link>

            {canManageProjects && (
              <Button
                onClick={() => {
                  setFormError("");
                  setIsCreateOpen(true);
                }}
              >
                <span className="mr-2 text-lg leading-none">
                  +
                </span>
                New project
              </Button>
            )}
          </div>
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

      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">
            Team members
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-950">
            {memberCount}
          </p>

          <Link
            to={`/teams/${teamId}/members`}
            className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:text-brand-800"
          >
            View members →
          </Link>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">
            Projects
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-950">
            {projectCount}
          </p>

          <p className="mt-3 text-sm text-slate-500">
            Organize tasks by project.
          </p>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Projects
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select a project to view its task board.
            </p>
          </div>

          {canManageProjects && (
            <button
              type="button"
              onClick={() => {
                setFormError("");
                setIsCreateOpen(true);
              }}
              className="hidden text-sm font-semibold text-brand-600 hover:text-brand-800 sm:block"
            >
              Create project →
            </button>
          )}
        </div>

        {projects.length === 0 ? (
          <Card className="border-dashed">
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-xl font-bold text-brand-700">
                P
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No projects yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Create a project to give your team a place to
                organize tasks and reviews.
              </p>

              {canManageProjects && (
                <Button
                  className="mt-5"
                  onClick={() => {
                    setFormError("");
                    setIsCreateOpen(true);
                  }}
                >
                  Create first project
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="group flex min-h-52 flex-col p-5 transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700">
                    {project.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                    {project._count?.tasks || 0}{" "}
                    {project._count?.tasks === 1
                      ? "task"
                      : "tasks"}
                  </span>
                </div>

                <h3 className="mt-5 truncate text-lg font-bold text-slate-900">
                  {project.name}
                </h3>

                <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
                  {project.description ||
                    "No project description provided."}
                </p>

                <Link
                  to={`/projects/${project.id}`}
                  className="mt-auto pt-5 text-sm font-semibold text-brand-600 transition group-hover:text-brand-800"
                >
                  Open project
                  <span className="ml-1.5 inline-block transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>

      {isCreateOpen && (
        <Modal
          title="Create a project"
          onClose={closeModal}
        >
          <form
            className="space-y-5"
            onSubmit={handleCreateProject}
          >
            {formError && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                {formError}
              </div>
            )}

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Project name
              </span>

              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Web app MVP"
                minLength="2"
                maxLength="100"
                required
                autoFocus
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </label>

            <label className="block">
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
                placeholder="What will this project deliver?"
                rows="4"
                maxLength="1000"
                className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={closeModal}
                disabled={isCreating}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isCreating}>
                {isCreating
                  ? "Creating project..."
                  : "Create project"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default TeamPage;