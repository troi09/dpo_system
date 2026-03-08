import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/auth`;

export const login = async (email, password) => {
  const res = await axios.post(`${API_URL}/login`, { email, password });
  // Login now returns requiresOtp flag; caller handles the OTP step
  return res.data;
};

export const verifyOtp = async (email, otp) => {
  const res = await axios.post(`${API_URL}/verify-otp`, { email, otp });
  if (res.data.token) {
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
  }
  return res.data;
};

export const register = async (name, email, password) => {
  const res = await axios.post(`${API_URL}/register`, { name, email, password });
  return res.data;
};

export const forgotPassword = async (email) => {
  const res = await axios.post(`${API_URL}/forgot-password`, { email });
  return res.data;
};

export const resetPassword = async (token, password) => {
  const res = await axios.post(`${API_URL}/reset-password`, { token, password });
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
