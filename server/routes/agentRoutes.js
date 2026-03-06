const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const { protect, authorizeAdmin } = require("../middleware/authMiddleware");
const { piiRedactMiddleware } = require("../middleware/piiRedactMiddleware");
const {
  triageAgent,
  complianceReview,
  auditSummary,
} = require("../controllers/agentController");

// Rate limiter for AI agent endpoints — prevents abuse and protects AI processing resources
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1-minute window
  max: 30,                  // max 30 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests to the AI agent. Please try again shortly." },
});

/**
 * Agent 1 — Student Request Triage Agent (accessible to authenticated students)
 * Guides students in selecting the correct document type and verifying
 * completeness before submission.
 */
router.post("/triage", aiRateLimiter, protect, piiRedactMiddleware, triageAgent);

/**
 * Agent 2 — Compliance & Drafting Co-Pilot (accessible to admins only)
 * Reviews redacted request data, generates a draft summary, and computes a
 * compliance risk score. Does NOT approve documents or generate QR codes.
 */
router.post("/compliance-review", aiRateLimiter, protect, authorizeAdmin, piiRedactMiddleware, complianceReview);

/**
 * Agent 3 — System Auditor & Analytics Agent (admin only)
 * Returns a natural-language operations summary and anomaly detection report.
 * Optional query param: ?windowHours=24 (default) or ?windowHours=168 for weekly
 */
router.get("/audit-summary", aiRateLimiter, protect, authorizeAdmin, piiRedactMiddleware, auditSummary);

module.exports = router;
