import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/requests`;

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

export const resubmitRequest = async (id, payload) => {
  const res = await axios.patch(`${API_URL}/${id}/resubmit`, payload, { headers: authHeader() });
  return res.data;
};

// Admin
export const getAllRequests = async () => {
  const res = await axios.get(`${API_URL}/all`, { headers: authHeader() });
  return res.data;
};

export const saveApprovedDocument = async (id, payload) => {
  const res = await axios.patch(`${API_URL}/${id}/approved-document`, payload, { headers: authHeader() });
  return res.data;
};

export const updateRequestStatus = async (id, payload) => {
  const res = await axios.patch(`${API_URL}/${id}`, payload, { headers: authHeader() });
  return res.data;
};

export const getRequestById = async (id) => {
  const res = await axios.get(`${API_URL}/${id}`, { headers: authHeader() });
  return res.data;
};

// Public verify
export const verifyRequestCode = async (code) => {
  const res = await axios.get(`${API_URL}/verify/${code}`);
  return res.data;
};
// Admin – archived requests
export const getArchivedRequests = async () => {
  const res = await axios.get(`${API_URL}/archived`, { headers: authHeader() });
  return res.data;
};
