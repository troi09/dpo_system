import axios from "axios";

const API_URL = "http://localhost:5000/api/requests";

const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Student
export const createRequest = async (payload) => {
  const res = await axios.post(API_URL, payload, { headers: authHeader() });
  return res.data;
};

export const getMyRequests = async () => {
  const res = await axios.get(`${API_URL}/my`, { headers: authHeader() });
  return res.data;
};

// Admin
export const getAllRequests = async () => {
  const res = await axios.get(API_URL, { headers: authHeader() });
  return res.data;
};
