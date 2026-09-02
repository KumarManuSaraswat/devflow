import api from "./axios";

export const getInviteByToken = async (token) => {
  const response = await api.get(`/invites/${token}`);
  return response.data;
};

export const acceptInvite = async (token) => {
  const response = await api.post(
    `/invites/${token}/accept`
  );

  return response.data;
};