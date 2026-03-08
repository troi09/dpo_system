import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/auth`;

export const login = async (email, password) => {
  const res = await axios.post(`${API_URL}/login`, { email, password });
  if (res.data.token) {
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
  }
  return res.data;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const getCurrentUser = () => {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
};

export const getToken = () => localStorage.getItem("token");

// ── Forgot Password / Reset flow ──────────────────────────────────────────────
export const forgotPassword = async (email) => {
  const res = await axios.post(`${API_URL}/forgot-password`, { email });
  return res.data;
};

export const verifyResetOtp = async (email, otp) => {
  const res = await axios.post(`${API_URL}/verify-reset-otp`, { email, otp });
  return res.data;
};

export const resetPassword = async (email, resetToken, newPassword) => {
  const res = await axios.post(`${API_URL}/reset-password`, { email, resetToken, newPassword });
  return res.data;
};

// ── Admin user management ─────────────────────────────────────────────────────
const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getAllUsers = async () => {
  const res = await axios.get(`${API_URL}/users`, { headers: authHeader() });
  return res.data;
};

export const adminCreateUser = async (payload) => {
  const res = await axios.post(`${API_URL}/users`, payload, { headers: authHeader() });
  return res.data;
};

export const toggleUserActive = async (id) => {
  const res = await axios.patch(`${API_URL}/users/${id}/toggle-active`, {}, { headers: authHeader() });
  return res.data;
};

export const adminTriggerPasswordReset = async (id) => {
  const res = await axios.post(`${API_URL}/users/${id}/trigger-reset`, {}, { headers: authHeader() });
  return res.data;
};
