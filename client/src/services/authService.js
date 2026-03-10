import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/auth`;

export const login = async (email, password) => {
  const res = await axios.post(`${API_URL}/login`, { email, password });
  // If OTP required, don't set token/user yet
  if (res.data.requireOtp) {
    return res.data;
  }
  if (res.data.token) {
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
  }
  return res.data;
};

export const verifyLoginOtp = async (email, otp) => {
  const res = await axios.post(`${API_URL}/verify-login-otp`, { email, otp });
  if (res.data.token) {
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
  }
  return res.data;
};

export const verifyEmail = async (email, otp) => {
  const res = await axios.post(`${API_URL}/verify-email`, { email, otp });
  return res.data;
};

export const verifyEmailByToken = async (token) => {
  const res = await axios.post(`${API_URL}/verify-email`, { token });
  return res.data;
};

export const resendVerificationOtp = async (email) => {
  const res = await axios.post(`${API_URL}/resend-verification-otp`, { email });
  return res.data;
};

export const activateAccount = async (token, password) => {
  const res = await axios.post(`${API_URL}/activate-account`, { token, password });
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

// ── Session token refresh ─────────────────────────────────────────────────────
const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const refreshToken = async () => {
  const res = await axios.post(`${API_URL}/refresh-token`, {}, { headers: authHeader() });
  if (res.data.token) {
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
  }
  return res.data;
};

// ── Profile update ────────────────────────────────────────────────────────────
export const updateProfile = async (payload) => {
  const res = await axios.patch(`${API_URL}/profile`, payload, { headers: authHeader() });
  if (res.data.user) {
    localStorage.setItem("user", JSON.stringify(res.data.user));
  }
  return res.data;
};

// ── Admin user management ─────────────────────────────────────────────────────
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
