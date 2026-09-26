import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  withCredentials: true,
  timeout: 60000, // Allow the free backend to wake up, but do not hang the mobile UI indefinitely.
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
