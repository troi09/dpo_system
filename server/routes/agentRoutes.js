const express = require("express");
const router = express.Router();

const { protect, authorizeAdmin } = require("../middleware/authMiddleware");
const { piiRedactMiddleware } = require("../middleware/piiRedactMiddleware");
const {
  triageAgent,
  complianceReview,
  auditSummary,
} = require("../controllers/agentController");

/**
 * Agent 1 — Student Request Triage Agent (accessible to authenticated students)
 * Guides students in selecting the correct document type and verifying
 * completeness before submission.
 */
router.post("/triage", protect, piiRedactMiddleware, triageAgent);

/**
 * Agent 2 — Compliance & Drafting Co-Pilot (accessible to admins only)
 * Reviews redacted request data, generates a draft summary, and computes a
 * compliance risk score. Does NOT approve documents or generate QR codes.
 */
router.post("/compliance-review", protect, authorizeAdmin, piiRedactMiddleware, complianceReview);

/**
 * Agent 3 — System Auditor & Analytics Agent (admin only)
 * Returns a natural-language operations summary and anomaly detection report.
 * Optional query param: ?windowHours=24 (default) or ?windowHours=168 for weekly
 */
router.get("/audit-summary", protect, authorizeAdmin, auditSummary);

module.exports = router;
