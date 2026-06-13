import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  const guestToken = localStorage.getItem("wedwish_guest_token");
  const adminToken = localStorage.getItem("wedwish_admin_token");
  if (guestToken) cfg.headers["X-Guest-Token"] = guestToken;
  if (adminToken && cfg.url?.includes("/admin/")) {
    cfg.headers["Authorization"] = `Bearer ${adminToken}`;
  }
  return cfg;
});

export const resolveImage = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/api/")) return `${BACKEND_URL}${url}`;
  return url;
};
