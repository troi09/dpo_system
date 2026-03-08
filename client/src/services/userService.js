import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/users`;

const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getAllUsers = async () => {
  const res = await axios.get(API_URL, { headers: authHeader() });
  return res.data;
};

export const createUser = async (payload) => {
  const res = await axios.post(API_URL, payload, { headers: authHeader() });
  return res.data;
};

export const setUserActive = async (id, isActive) => {
  const res = await axios.patch(`${API_URL}/${id}/active`, { isActive }, { headers: authHeader() });
  return res.data;
};

export const triggerPasswordReset = async (id) => {
  const res = await axios.post(`${API_URL}/${id}/reset-password`, {}, { headers: authHeader() });
  return res.data;
};
