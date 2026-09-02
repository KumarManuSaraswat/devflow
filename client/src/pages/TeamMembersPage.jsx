import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  changeMemberRole,
  createInviteLink,
  deactivateMember,
  getTeamById,
  getTeamInvites,
  getTeamMembers,
  revokeInvite,
} from "../api/teamApi";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import PageLoader from "../components/common/PageLoader";

const MEMBER_ROLES = [
  "ADMIN",
  "REVIEWER",
  "DEVELOPER",
  "TRAINEE",
];

const getInitials = (name = "") => {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const TeamMembersPage = () => {
  const { teamId } = useParams();

  const [team, setTeam] = useState(null);
  const [membership, setMembership] = useState(null);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingInvite, setIsCreatingInvite] =
    useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [inviteForm, setInviteForm] = useState({
    role: "DEVELOPER",
    maxUses: "1",
    expiresInDays: "7",
  });

  const canManageMembers = ["OWNER", "ADMIN"].includes(
    membership?.role
  );

  const isOwner = membership?.role === "OWNER";

  const loadPageData = async () => {
    try {
      setError("");

      const teamResponse = await getTeamById(teamId);
      const membersResponse = await getTeamMembers(teamId);

      let invitesResponse = { invites: [] };

      if (
        ["OWNER", "ADMIN"].includes(
          teamResponse.membership?.role
        )
      ) {
        invitesResponse = await getTeamInvites(teamId);
      }

      setTeam(teamResponse.team);
      setMembership(teamResponse.membership);
      setMembers(membersResponse.members || []);
      setInvites(invitesResponse.invites || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load team members."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, [teamId]);

  const handleInviteChange = (event) => {
    setInviteForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleCreateInvite = async (event) => {
    event.preventDefault();

    setIsCreatingInvite(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await createInviteLink(teamId, {
        role: inviteForm.role,
        maxUses: Number(inviteForm.maxUses),
        expiresInDays: Number(inviteForm.expiresInDays),
      });

      setInvites((current) => [
        {
          ...response.invite,
          inviteUrl: response.inviteUrl,
        },
        ...current,
      ]);

      setSuccessMessage(
        "Invite link created. Copy it before leaving this page."
      );

      toast.success("Invite link created", {
        description:
          "Copy and share the link before refreshing the page.",
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create invite link."
      );

      toast.error("Unable to create invite link", {
        description:
          err.response?.data?.message ||
          "Please try again.",
      });
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleCopyInvite = async (inviteUrl) => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setSuccessMessage("Invite link copied to clipboard.");

      toast.success("Invite link copied");
    } catch {
      setError(
        "Unable to copy automatically. Please copy the link manually."
      );

      toast.error("Unable to copy invite link", {
        description:
          "Please copy the link manually.",
      });
    }
  };

  const handleRoleChange = async (memberId, role) => {
    setError("");
    setSuccessMessage("");

    try {
      const response = await changeMemberRole(
        teamId,
        memberId,
        role
      );

      setMembers((current) =>
        current.map((member) =>
          member.id === memberId
            ? {
                ...member,
                role: response.member.role,
              }
            : member
        )
      );

      setSuccessMessage("Member role updated successfully.");

      toast.success("Member role updated");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update member role."
      );

      toast.error("Unable to update member role", {
        description:
          err.response?.data?.message ||
          "Please try again.",
      });
    }
  };

  const handleDeactivate = async (member) => {
    const confirmed = window.confirm(
      `Deactivate ${member.user.name} from this team?`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      await deactivateMember(teamId, member.id);

      setMembers((current) =>
        current.filter(
          (currentMember) =>
            currentMember.id !== member.id
        )
      );

      setSuccessMessage(
        `${member.user.name} was removed from the team.`
      );

      toast.success("Member deactivated", {
        description: `${member.user.name} no longer has workspace access.`,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to deactivate member."
      );

      toast.error("Unable to deactivate member", {
        description:
          err.response?.data?.message ||
          "Please try again.",
      });
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    const confirmed = window.confirm(
      "Revoke this invite link?"
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      await revokeInvite(teamId, inviteId);

      setInvites((current) =>
        current.filter((invite) => invite.id !== inviteId)
      );

      setSuccessMessage("Invite link revoked.");

      toast.success("Invite link revoked");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to revoke invite."
      );

      toast.error("Unable to revoke invite", {
        description:
          err.response?.data?.message ||
          "Please try again.",
      });
    }
  };

  const canEditTarget = (targetMember) => {
    if (!canManageMembers) {
      return false;
    }

    if (targetMember.role === "OWNER") {
      return false;
    }

    if (
      membership?.role === "ADMIN" &&
      targetMember.role === "ADMIN"
    ) {
      return false;
    }

    return true;
  };

  if (isLoading) {
    return <PageLoader text="Loading team members..." />;
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

  return (
    <div className="space-y-8">
      <section>
        <Link
          to={`/teams/${teamId}`}
          className="inline-flex items-center text-sm font-semibold text-slate-500 transition hover:text-brand-600"
        >
          <span className="mr-2">←</span>
          Back to {team?.name || "team"}
        </Link>

        <div className="mt-6 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-xl font-black text-white shadow-lg shadow-brand-200">
              {team?.name?.charAt(0).toUpperCase()}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                  Team members
                </h1>

                <Badge value={membership?.role}>
                  {membership?.role}
                </Badge>
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Manage people and permissions in{" "}
                <span className="font-semibold text-slate-700">
                  {team?.name}
                </span>
                .
              </p>
            </div>
          </div>

          <Card className="flex items-center gap-4 px-5 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <span className="font-bold">◎</span>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Active members
              </p>

              <p className="text-2xl font-bold text-slate-950">
                {members.length}
              </p>
            </div>
          </Card>
        </div>
      </section>

      {(error || successMessage) && (
        <div
          role={error ? "alert" : "status"}
          className={[
            "rounded-xl border px-4 py-3 text-sm font-medium",
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700",
          ].join(" ")}
        >
          {error || successMessage}
        </div>
      )}

      {canManageMembers && (
        <section>
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 bg-gradient-to-r from-brand-50 to-white px-5 py-5 sm:px-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
                  +
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Invite someone to your team
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Create a secure invite link with a role and
                    expiration date.
                  </p>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleCreateInvite}
              className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4 lg:items-end"
            >
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  Role
                </span>

                <select
                  name="role"
                  value={inviteForm.role}
                  onChange={handleInviteChange}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                >
                  {MEMBER_ROLES.map((role) => (
                    <option
                      key={role}
                      value={role}
                      disabled={
                        role === "ADMIN" && !isOwner
                      }
                    >
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  Maximum uses
                </span>

                <input
                  type="number"
                  name="maxUses"
                  value={inviteForm.maxUses}
                  onChange={handleInviteChange}
                  min="1"
                  max="100"
                  required
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  Expires in
                </span>

                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="number"
                    name="expiresInDays"
                    value={inviteForm.expiresInDays}
                    onChange={handleInviteChange}
                    min="1"
                    max="30"
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  />

                  <span className="shrink-0 text-sm text-slate-500">
                    days
                  </span>
                </div>
              </label>

              <Button
                type="submit"
                disabled={isCreatingInvite}
                className="w-full"
              >
                {isCreatingInvite
                  ? "Creating..."
                  : "Create invite link"}
              </Button>
            </form>
          </Card>
        </section>
      )}

      {canManageMembers && invites.length > 0 && (
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-950">
              Active invite links
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Links are shown only immediately after creation.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {invites.map((invite) => (
              <Card key={invite.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Team invitation
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Created{" "}
                      {new Date(
                        invite.createdAt
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  <Badge value={invite.role}>
                    {invite.role}
                  </Badge>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Uses
                    </p>

                    <p className="mt-1 font-bold text-slate-900">
                      {invite.uses} / {invite.maxUses}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Expires
                    </p>

                    <p className="mt-1 font-bold text-slate-900">
                      {new Date(
                        invite.expiresAt
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {invite.inviteUrl ? (
                  <div className="mt-4">
                    <div className="flex gap-2">
                      <input
                        value={invite.inviteUrl}
                        readOnly
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600 outline-none"
                      />

                      <Button
                        type="button"
                        variant="secondary"
                        className="shrink-0 px-3"
                        onClick={() =>
                          handleCopyInvite(
                            invite.inviteUrl
                          )
                        }
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                    The complete URL was shown only when this
                    invite was created.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() =>
                    handleRevokeInvite(invite.id)
                  }
                  className="mt-4 text-sm font-semibold text-red-600 transition hover:text-red-800"
                >
                  Revoke invite
                </button>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-950">
            Members
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            People who currently have access to this workspace.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {members.map((member) => {
            const canEdit = canEditTarget(member);

            return (
              <Card key={member.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                      {getInitials(member.user.name)}
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-slate-900">
                        {member.user.name}
                      </h3>

                      <p className="truncate text-sm text-slate-500">
                        {member.user.email}
                      </p>
                    </div>
                  </div>

                  <Badge value={member.role}>
                    {member.role}
                  </Badge>
                </div>

                {member.expiresAt && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Temporary access expires on{" "}
                    {new Date(
                      member.expiresAt
                    ).toLocaleDateString()}
                  </div>
                )}

                {canEdit ? (
                  <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-end sm:justify-between">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Change role
                      </span>

                      <select
                        value={member.role}
                        onChange={(event) =>
                          handleRoleChange(
                            member.id,
                            event.target.value
                          )
                        }
                        className="mt-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                      >
                        {isOwner && (
                          <option value="OWNER">
                            OWNER
                          </option>
                        )}

                        {MEMBER_ROLES.map((role) => (
                          <option
                            key={role}
                            value={role}
                          >
                            {role}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeactivate(member)
                      }
                      className="text-left text-sm font-semibold text-red-600 transition hover:text-red-800 sm:text-right"
                    >
                      Deactivate member
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-400">
                      Owner access cannot be modified here.
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default TeamMembersPage;