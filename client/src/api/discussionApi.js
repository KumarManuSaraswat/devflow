import api from "./axios";
const base = teamId => `/teams/${teamId}/discussions`;
export const listDiscussions = async (teamId, params, signal) =>
  (await api.get(base(teamId), { params, signal, timeout: 15000 })).data;
export const createDiscussion = async (teamId, body, signal) =>
  (await api.post(base(teamId), body, { signal, timeout: 15000 })).data;
export const getDiscussion = async (teamId, topicId, params, signal) =>
  (await api.get(`${base(teamId)}/${topicId}`, { params, signal, timeout: 15000 })).data;
export const postDiscussionMessage = async (teamId, topicId, body, signal) =>
  (await api.post(`${base(teamId)}/${topicId}/messages`, body, { signal, timeout: 15000 })).data;
export const setDiscussionStatus = async (teamId, topicId, body, signal) =>
  (await api.patch(`${base(teamId)}/${topicId}/status`, body, { signal, timeout: 15000 })).data;
