import api from "./axios";

export const getTeamProjects = async (teamId) => {
  const response = await api.get(
    `/teams/${teamId}/projects`
  );

  return response.data;
};

export const createProject = async (teamId, data) => {
  const response = await api.post(
    `/teams/${teamId}/projects`,
    data
  );

  return response.data;
};

export const getProjectById = async (projectId) => {
  const response = await api.get(
    `/projects/${projectId}`
  );

  return response.data;
};