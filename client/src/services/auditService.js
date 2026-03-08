import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/audit`;

const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getAuditLogs = async (limit = 50) => {
  const res = await axios.get(`${API_URL}?limit=${limit}`, { headers: authHeader() });
  return res.data;
};
