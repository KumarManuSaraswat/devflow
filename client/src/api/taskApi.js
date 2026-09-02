import api from "./axios";

export const getProjectTasks = async (projectId) => {
  const response = await api.get(
    `/projects/${projectId}/tasks`
  );

  return response.data;
};

export const createTask = async (projectId, data) => {
  const response = await api.post(
    `/projects/${projectId}/tasks`,
    data
  );

  return response.data;
};

export const getTaskById = async (taskId) => {
  const response = await api.get(`/tasks/${taskId}`);
  return response.data;
};

export const updateTaskStatus = async (taskId, status) => {
  const response = await api.patch(
    `/tasks/${taskId}/status`,
    { status }
  );

  return response.data;
};

export const submitTaskForReview = async (
  taskId,
  pullRequestUrl
) => {
  const response = await api.post(
    `/tasks/${taskId}/submit-review`,
    pullRequestUrl
      ? { pullRequestUrl }
      : {}
  );

  return response.data;
};

export const reviewTask = async (
  taskId,
  decision,
  comment
) => {
  const response = await api.post(
    `/tasks/${taskId}/reviews`,
    {
      decision,
      comment,
    }
  );

  return response.data;
};

export const completeTask = async (taskId) => {
  const response = await api.post(
    `/tasks/${taskId}/complete`
  );

  return response.data;
};