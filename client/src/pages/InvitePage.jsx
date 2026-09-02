import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { acceptInvite, getInviteByToken } from "../api/inviteApi";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import PageLoader from "../components/common/PageLoader";

const InvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadInvite = async () => {
      try {
        setError("");

        const response = await getInviteByToken(token);
        setInvite(response.invite);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "This invitation could not be loaded."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadInvite();
  }, [token]);

  const handleJoinTeam = async () => {
    setIsJoining(true);
    setError("");

    try {
      const response = await acceptInvite(token);

      navigate(
        `/teams/${response.membership.team.id}`,
        { replace: true }
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to join this team."
      );
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return <PageLoader text="Loading invitation..." />;
  }

  if (error && !invite) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-600">
            !
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-950">
            Invitation unavailable
          </h1>

          <p
            role="alert"
            className="mt-3 text-sm leading-6 text-slate-500"
          >
            {error}
          </p>

          <Link
            to="/teams"
            className="mt-6 inline-block text-sm font-semibold text-brand-600 hover:text-brand-800"
          >
            Go to My Teams →
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center py-8">
      <Card className="w-full max-w-xl overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-10 text-center text-white sm:px-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl font-black ring-1 ring-white/30">
            D
          </div>

          <p className="mt-5 text-sm font-semibold text-brand-100">
            You have been invited to DevFlow
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Join a team workspace
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-brand-100">
            Collaborate on projects, manage tasks, and move work
            through review with your team.
          </p>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-xl font-black text-brand-700">
              {invite.team.name.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Team workspace
              </p>

              <h2 className="truncate text-xl font-bold text-slate-950">
                {invite.team.name}
              </h2>

              <p className="mt-1 truncate text-sm text-slate-500">
                {invite.team.description ||
                  "No team description provided."}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Your role
              </p>

              <div className="mt-2">
                <Badge value={invite.role}>
                  {invite.role}
                </Badge>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Uses remaining
              </p>

              <p className="mt-2 text-lg font-bold text-slate-900">
                {invite.usesRemaining}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 font-bold text-amber-700">
              !
            </div>

            <div>
              <p className="text-sm font-bold text-amber-900">
                Invitation expiry
              </p>

              <p className="mt-1 text-sm leading-5 text-amber-800">
                This invitation expires on{" "}
                {new Date(
                  invite.expiresAt
                ).toLocaleString()}.
              </p>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/teams"
              className="text-center text-sm font-semibold text-slate-500 transition hover:text-slate-800 sm:text-left"
            >
              Cancel
            </Link>

            <Button
              onClick={handleJoinTeam}
              disabled={isJoining}
              className="w-full sm:w-auto"
            >
              {isJoining
                ? "Joining team..."
                : "Join team"}
            </Button>
          </div>
        </div>
      </Card>
    </main>
  );
};

export default InvitePage;