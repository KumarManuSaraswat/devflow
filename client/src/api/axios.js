import axios from "axios";
import { resourceCache } from "../utils/resourceCache";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  withCredentials: true,
  timeout: 60000, // Allow the free backend to wake up, but do not hang the mobile UI indefinitely.
  headers: {
    "Content-Type": "application/json",
  },
});

// Mutations invalidate all saved views, including related counts and task boards.
api.interceptors.response.use(response => {
  if (!["get", "head", "options"].includes(response.config.method)) resourceCache.clear();
  return response;
}, error => {
  if ([401, 403, 404].includes(error.response?.status)) resourceCache.clear();
  return Promise.reject(error);
});

export default api;
