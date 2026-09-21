import api from "./axios";

export const getAssistantContext = async (teamId, signal) =>
  (await api.get(`/teams/${teamId}/assistant/context`, { signal })).data;

export const askAssistant = async (teamId, body, signal) =>
  (await api.post(`/teams/${teamId}/assistant/chat`, body, { signal, timeout: 30000 })).data;

export const updateMemberProfile = async (teamId, memberId, body) =>
  (await api.patch(`/teams/${teamId}/members/${memberId}/profile`, body)).data;
