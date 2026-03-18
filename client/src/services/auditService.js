import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/audit`;

const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getAuditLogs = async ({ page = 1, limit = 50, action = "", userId = "", resourceId = "" } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (action) params.set("action", action);
  if (userId) params.set("userId", userId);
  if (resourceId) params.set("resourceId", resourceId);
  const res = await axios.get(`${API_URL}?${params}`, { headers: authHeader() });
  return res.data;
};

export const getRecentAuditLogs = async (count = 5) => {
  const res = await axios.get(`${API_URL}/recent?count=${count}`, { headers: authHeader() });
  return res.data;
};
