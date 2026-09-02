import api from "./axios";

export const getMyTeams = async () => {
  const response = await api.get("/teams");
  return response.data;
};

export const createTeam = async (data) => {
  const response = await api.post("/teams", data);
  return response.data;
};

export const getTeamById = async (teamId) => {
  const response = await api.get(`/teams/${teamId}`);
  return response.data;
};

export const getTeamMembers = async (teamId) => {
  const response = await api.get(
    `/teams/${teamId}/members`
  );

  return response.data;
};

export const changeMemberRole = async (
  teamId,
  memberId,
  role
) => {
  const response = await api.patch(
    `/teams/${teamId}/members/${memberId}/role`,
    { role }
  );

  return response.data;
};

export const deactivateMember = async (teamId, memberId) => {
  const response = await api.patch(
    `/teams/${teamId}/members/${memberId}/deactivate`
  );

  return response.data;
};

export const createInviteLink = async (teamId, data) => {
  const response = await api.post(
    `/teams/${teamId}/invites/link`,
    data
  );

  return response.data;
};

export const getTeamInvites = async (teamId) => {
  const response = await api.get(
    `/teams/${teamId}/invites`
  );

  return response.data;
};

export const revokeInvite = async (teamId, inviteId) => {
  const response = await api.patch(
    `/teams/${teamId}/invites/${inviteId}/revoke`
  );

  return response.data;
};