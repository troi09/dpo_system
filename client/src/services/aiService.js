import axios from "axios";

const AI_API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/ai`;

const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Agent 1 — Student Triage Agent
 * Sends a student message and receives document type guidance.
 */
export const sendTriageMessage = async (message, conversationHistory = []) => {
  const res = await axios.post(
    `${AI_API_URL}/triage`,
    { message, conversationHistory },
    { headers: authHeader() }
  );
  return res.data;
};

/**
 * Agent 2 — Compliance & Drafting Co-Pilot
 * Submits request data for compliance review and draft generation.
 */
export const getComplianceReview = async (requestData) => {
  const res = await axios.post(
    `${AI_API_URL}/compliance-review`,
    requestData,
    { headers: authHeader() }
  );
  return res.data;
};

/**
 * Agent 3 — System Auditor & Analytics Agent
 * Retrieves the operations summary and anomaly detection report.
 * @param {number} windowHours - Analysis window in hours (default: 24)
 */
export const getAuditSummary = async (windowHours = 24) => {
  const res = await axios.get(
    `${AI_API_URL}/audit-summary?windowHours=${windowHours}`,
    { headers: authHeader() }
  );
  return res.data;
};
