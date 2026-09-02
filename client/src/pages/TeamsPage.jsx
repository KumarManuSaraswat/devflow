import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Modal from "../components/common/Modal";
import PageLoader from "../components/common/PageLoader";
import { useAuth } from "../context/AuthContext";
import { createTeam, getMyTeams } from "../api/teamApi";

const TeamsPage = () => {
  const { user } = useAuth();

  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const loadTeams = async () => {
    try {
      setError("");

      const response = await getMyTeams();
      setTeams(response.teams || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load your teams. Please refresh the page."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const openCreateModal = () => {
    setFormError("");
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (isCreating) {
      return;
    }

    setFormError("");
    setIsCreateOpen(false);
  };

  const handleCreateTeam = async (event) => {
    event.preventDefault();

    setFormError("");
    setIsCreating(true);

    try {
      const newTeamName = formData.name.trim();

      await createTeam({
        name: newTeamName,
        description: formData.description.trim(),
      });

      setFormData({
        name: "",
        description: "",
      });

      setIsCreateOpen(false);

      await loadTeams();

      toast.success("Workspace created", {
        description: `"${newTeamName}" is ready to use.`,
      });
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
          "Unable to create your team. Please try again."
      );

      toast.error("Unable to create workspace", {
        description:
          err.response?.data?.message ||
          "Please try again.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return <PageLoader text="Loading your workspaces..." />;
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-brand-600">
            Workspace dashboard
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            My Teams
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Welcome back, {user?.name?.split(" ")[0] || "there"}.
            Create a workspace, join a team, and keep software
            delivery moving.
          </p>
        </div>

        <Button onClick={openCreateModal}>
          <span className="mr-2 text-lg leading-none">+</span>
          Create team
        </Button>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}

      {teams.length === 0 ? (
        <Card className="border-dashed">
          <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-2xl font-bold text-brand-600">
              D
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              Start your first workspace
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Create a team for your project, invite collaborators,
              organize work into projects, and send tasks through
              review.
            </p>

            <Button className="mt-6" onClick={openCreateModal}>
              Create your first team
            </Button>
          </div>
        </Card>
      ) : (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Your workspaces
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {teams.length}{" "}
                {teams.length === 1 ? "team" : "teams"} available
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => (
              <Card
                key={team.id}
                className="group flex min-h-52 flex-col p-5 transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-lg font-bold text-brand-700">
                    {team.name?.charAt(0).toUpperCase() || "T"}
                  </div>

                  <Badge value={team.membership?.role}>
                    {team.membership?.role || "MEMBER"}
                  </Badge>
                </div>

                <div className="mt-5">
                  <h3 className="truncate text-lg font-bold text-slate-900">
                    {team.name}
                  </h3>

                  <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
                    {team.description ||
                      "No workspace description provided."}
                  </p>
                </div>

                <div className="mt-auto pt-5">
                  <Link
                    to={`/teams/${team.id}`}
                    className="inline-flex items-center text-sm font-semibold text-brand-600 transition hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                  >
                    Open workspace
                    <span className="ml-1.5 transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {isCreateOpen && (
        <Modal
          title="Create a new team"
          onClose={closeCreateModal}
        >
          <form
            className="space-y-5"
            onSubmit={handleCreateTeam}
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
                Team name
              </span>

              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. DevFlow Core Team"
                minLength="2"
                maxLength="80"
                required
                autoFocus
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
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
                placeholder="What will this team build?"
                rows="4"
                maxLength="500"
                className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={closeCreateModal}
                disabled={isCreating}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isCreating}>
                {isCreating
                  ? "Creating workspace..."
                  : "Create team"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default TeamsPage;