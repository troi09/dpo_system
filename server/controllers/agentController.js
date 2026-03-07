/**
 * Agent Controller
 * Implements the three Multi-Agent AI components described in Phase 2.
 *
 * IMPORTANT — Human-in-the-Loop (HITL) constraint:
 *   Agents ONLY draft, recommend, or flag items.
 *   Final approvals and QR/signature generation remain exclusively with
 *   authorized DPO Staff or Admins via the core system logic.
 *
 * Privacy constraint:
 *   All data processed here has already been PII-redacted by piiRedactMiddleware
 *   before reaching these functions.
 */

const natural = require("natural");
const Request = require("../models/Request");
const AuditLog = require("../models/AuditLog");

const tokenizer = new natural.WordTokenizer();

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Normalise text to lower-case words for keyword matching.
 */
const tokenize = (text) =>
  tokenizer.tokenize(String(text || "").toLowerCase());

/**
 * Count how many of the given keywords appear in the token list.
 */
const countKeywordHits = (tokens, keywords) =>
  keywords.filter((kw) => tokens.includes(kw)).length;

// ---------------------------------------------------------------------------
// Agent 1 — Student Request Triage Agent
// ---------------------------------------------------------------------------

const RESEARCH_KEYWORDS = [
  "research", "study", "thesis", "dissertation", "survey",
  "data", "collection", "respondents", "participants", "academic",
  "experiment", "findings", "analysis", "publication",
];

const ORG_KEYWORDS = [
  "organization", "org", "club", "society", "activity", "activities",
  "event", "program", "project", "committee", "officer", "member",
  "extracurricular", "student", "council", "chapter",
];

const AGREEMENT_KEYWORDS = [
  "representative", "behalf", "authorize", "authorization",
  "proxy", "agent", "collect", "pickup",
];

/**
 * Determine which document type best fits the student's described activity.
 * Returns one of: "nda_research" | "nda_orgactivities" | "agreement" | "unclear"
 */
const classifyDocumentNeed = (tokens) => {
  const researchScore = countKeywordHits(tokens, RESEARCH_KEYWORDS);
  const orgScore = countKeywordHits(tokens, ORG_KEYWORDS);
  const agreementScore = countKeywordHits(tokens, AGREEMENT_KEYWORDS);

  const max = Math.max(researchScore, orgScore, agreementScore);
  if (max === 0) return "unclear";
  if (agreementScore === max) return "agreement";
  if (orgScore >= researchScore) return "nda_orgactivities";
  return "nda_research";
};

/**
 * Validate that the student has provided sufficient context for the
 * identified document type.
 * Returns { complete: boolean, missing: string[] }
 */
const checkContextCompleteness = (documentType, message) => {
  const missing = [];

  if (documentType === "nda_research") {
    if (!/research|study|thesis|data collection/i.test(message)) {
      missing.push("purpose of research");
    }
  }

  if (documentType === "nda_orgactivities") {
    if (!/organization|org|club|society|event/i.test(message)) {
      missing.push("organization name or activity details");
    }
  }

  if (documentType === "agreement") {
    if (!/behalf|representative|authoriz/i.test(message)) {
      missing.push("authorization context");
    }
  }

  return { complete: missing.length === 0, missing };
};

/**
 * Build a guidance reply for the student based on the classified document type
 * and completeness check.
 */
const buildTriageReply = (documentType, completeness, userMessage) => {
  const suggestions = {
    nda_research: {
      title: "NDA for Conduct of Research",
      path: "/student/new-request/nda/research",
      guidance:
        "Based on your description, it appears you need an NDA for the Conduct of Research. " +
        "Please proceed to the research NDA form and ensure you include: the purpose of your research, " +
        "the data you intend to collect, and your supervisor or adviser details.",
    },
    nda_orgactivities: {
      title: "NDA for Student Organization Activities",
      path: "/student/new-request/nda/orgactivities",
      guidance:
        "Based on your description, it appears you need an NDA for Student Organization Activities. " +
        "Please proceed to the organization activities NDA form and include: your organization name, " +
        "the specific activity, and a brief description of its purpose.",
    },
    agreement: {
      title: "General Agreement",
      path: "/student/new-request/agreement",
      guidance:
        "Based on your description, it appears you need a General Agreement. " +
        "Please proceed to the Agreement form and include: the name of the authorized representative " +
        "and the purpose of the authorization.",
    },
    unclear: {
      title: "Unclear — more information needed",
      path: null,
      guidance:
        "I need a bit more information to help you select the right form. " +
        "Could you please tell me: (1) Is this for academic research, an org activity, or to authorize a representative? " +
        "(2) What data or documents are involved?",
    },
  };

  const suggestion = suggestions[documentType] || suggestions.unclear;
  const result = {
    recommendedType: documentType,
    recommendedTitle: suggestion.title,
    formPath: suggestion.path,
    message: suggestion.guidance,
    contextComplete: completeness.complete,
  };

  if (!completeness.complete && documentType !== "unclear") {
    result.message +=
      ` To complete your request, please also provide: ${completeness.missing.join(", ")}.`;
    result.contextComplete = false;
  }

  // HITL reminder — agent cannot submit on behalf of the student
  result.disclaimer =
    "⚠️ Disclaimer: I can guide you to the correct form but cannot provide legal advice " +
    "or submit requests on your behalf. Final submission requires your explicit action.";

  return result;
};

/**
 * POST /api/ai/triage
 * Agent 1 — Triage. Receives a student message and returns form guidance.
 */
exports.triageAgent = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.redactedBody || req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "A message is required." });
    }

    const tokens = tokenize(message);
    const documentType = classifyDocumentNeed(tokens);
    const completeness = checkContextCompleteness(documentType, message);
    const reply = buildTriageReply(documentType, completeness, message);

    return res.json({
      agent: "triage",
      reply,
      conversationHistory: [
        ...conversationHistory,
        { role: "user", content: message },
        { role: "agent", content: reply.message },
      ],
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ---------------------------------------------------------------------------
// Agent 2 — Compliance & Drafting Co-Pilot
// ---------------------------------------------------------------------------

/**
 * Keywords that indicate HIGH privacy risk per RA 10173 (Philippine Data Privacy Act).
 * These require a "High-Risk Privacy Warning" flag for human Admin review.
 */
const HIGH_RISK_KEYWORDS = [
  // Sensitive personal information under RA 10173, Sec. 3(l)
  "medical", "health", "diagnosis", "medication", "treatment",
  "financial", "credit", "bank", "account", "income", "salary",
  "religion", "political", "race", "ethnicity", "criminal",
  "biometric", "genetic", "sex life", "sexual",
];

/**
 * Keywords indicating moderate risk — should be reviewed but not blocked.
 */
const MODERATE_RISK_KEYWORDS = [
  "personal data", "sensitive", "confidential", "private",
  "government id", "passport", "license", "tin", "sss",
];

/**
 * Calculate a compliance risk score (0–100) and generate flags.
 */
const computeComplianceScore = (text) => {
  const tokens = tokenize(text);
  const highHits = countKeywordHits(tokens, HIGH_RISK_KEYWORDS);
  const modHits = countKeywordHits(tokens, MODERATE_RISK_KEYWORDS);

  // Base score: 0 = clean, 100 = maximum concern
  let score = Math.min(100, highHits * 25 + modHits * 10);

  const flags = [];

  if (highHits > 0) {
    const matchedHigh = HIGH_RISK_KEYWORDS.filter((kw) => tokens.includes(kw));
    flags.push({
      level: "HIGH",
      message:
        `High-Risk Privacy Warning: The request references sensitive data categories ` +
        `(${matchedHigh.join(", ")}) under RA 10173, Section 3(l). ` +
        `This document requires careful human Admin review before approval.`,
    });
  }

  if (modHits > 0) {
    flags.push({
      level: "MODERATE",
      message:
        "Moderate Privacy Note: The request mentions personal or confidential data. " +
        "Ensure a clear and lawful purpose is documented.",
    });
  }

  if (flags.length === 0) {
    flags.push({
      level: "LOW",
      message:
        "No high-risk data categories detected. Standard review applies.",
    });
  }

  return { score, flags };
};

/**
 * Generate a draft document summary based on a redacted request payload.
 * The full PDF generation remains in the core system (HITL constraint).
 */
const generateDraftSummary = (requestData) => {
  const { type, formData } = requestData;

  if (type === "agreement") {
    return (
      `DRAFT — General Agreement\n` +
      `Representative: ${formData?.repName || "[not provided]"}\n` +
      `Details: ${formData?.details || "[not provided]"}\n\n` +
      `This Agreement is drafted for Human Review. ` +
      `The DPO Compliance Agent has reviewed the submitted data for compliance with RA 10173. ` +
      `No final document is generated until an authorized Admin approves.`
    );
  }

  if (type === "nda") {
    const ndaLabel = formData?.ndaTypeLabel || formData?.ndaType || "NDA";
    return (
      `DRAFT — ${ndaLabel}\n` +
      `Purpose/Title: ${formData?.title || formData?.["1dataField"] || "[not provided]"}\n` +
      `Additional Details: ${formData?.details || formData?.["2dataField"] || "[not provided]"}\n\n` +
      `This NDA draft is prepared for Human Review under the Philippine Data Privacy Act of 2012 (RA 10173). ` +
      `The agent has scanned for compliance issues. ` +
      `No final serialized document or QR code is generated until an authorized Admin approves.`
    );
  }

  return "Unable to generate draft: unknown document type.";
};

/**
 * POST /api/ai/compliance-review
 * Agent 2 — Compliance & Drafting Co-Pilot.
 * Receives (redacted) request data, returns a draft summary and compliance risk score.
 * HITL: The agent does NOT approve documents or generate QR codes.
 */
exports.complianceReview = async (req, res) => {
  try {
    const requestData = req.redactedBody || req.body;
    const { type, formData } = requestData;

    if (!type || !["nda", "agreement"].includes(type)) {
      return res.status(400).json({ message: "Valid request type (nda or agreement) is required." });
    }

    // Build a combined text blob from the redacted form data for analysis
    const combinedText = Object.values(formData || {})
      .map((v) => String(v || ""))
      .join(" ");

    const compliance = computeComplianceScore(combinedText);
    const draftSummary = generateDraftSummary(requestData);

    return res.json({
      agent: "compliance",
      draft: {
        summary: draftSummary,
        status: "PENDING_HUMAN_REVIEW",
        disclaimer:
          "⚠️ This is an AI-generated draft for reference only. " +
          "Only an authorized DPO Admin can approve documents and trigger " +
          "serial number assignment, QR code generation, or electronic signature.",
      },
      compliance: {
        riskScore: compliance.score,
        riskLevel:
          compliance.score >= 50
            ? "HIGH"
            : compliance.score >= 20
            ? "MODERATE"
            : "LOW",
        flags: compliance.flags,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ---------------------------------------------------------------------------
// Agent 3 — System Auditor & Analytics Agent
// ---------------------------------------------------------------------------

/**
 * Detect anomalies in recent audit logs.
 * Returns a list of flagged anomalies.
 */
const detectAnomalies = async (windowHours = 24) => {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const anomalies = [];

  // 1. Detect staff members generating abnormally high NDA volumes outside
  //    operating hours (before 08:00 or after 18:00 local time approximation
  //    using UTC+8 offset for Philippine Standard Time)
  const recentApprovals = await AuditLog.find({
    action: "request_approved",
    createdAt: { $gte: since },
  }).lean();

  const approvalsByUser = {};
  for (const log of recentApprovals) {
    const uid = String(log.userId || "unknown");
    approvalsByUser[uid] = (approvalsByUser[uid] || 0) + 1;

    // Check for outside-hours activity (PST = UTC+8)
    const pstHour = (log.createdAt.getUTCHours() + 8) % 24;
    if (pstHour < 8 || pstHour >= 19) {
      anomalies.push({
        type: "AFTER_HOURS_ACTIVITY",
        severity: "MEDIUM",
        message:
          `A document approval was recorded outside normal operating hours ` +
          `(${pstHour}:00 PST). User ID: ${uid}.`,
        timestamp: log.createdAt,
      });
    }
  }

  // Flag users with unusually high approval counts (>10 in 24 h)
  const HIGH_VOLUME_THRESHOLD = 10;
  for (const [uid, count] of Object.entries(approvalsByUser)) {
    if (count > HIGH_VOLUME_THRESHOLD) {
      anomalies.push({
        type: "HIGH_VOLUME_APPROVALS",
        severity: "HIGH",
        message:
          `User ${uid} generated ${count} document approvals in the last ${windowHours} hours, ` +
          `which exceeds the threshold of ${HIGH_VOLUME_THRESHOLD}. Manual review recommended.`,
      });
    }
  }

  // 2. Detect multiple failed login attempts for the same user
  const failedLogins = await AuditLog.find({
    action: "login_failed",
    createdAt: { $gte: since },
  }).lean();

  const failedByUser = {};
  for (const log of failedLogins) {
    const uid = String(log.userId || log.details?.email || "unknown");
    failedByUser[uid] = (failedByUser[uid] || 0) + 1;
  }
  for (const [uid, count] of Object.entries(failedByUser)) {
    if (count >= 5) {
      anomalies.push({
        type: "MULTIPLE_FAILED_LOGINS",
        severity: "HIGH",
        message:
          `${count} failed login attempts detected for identifier "${uid}" ` +
          `in the last ${windowHours} hours. Possible brute-force attempt.`,
      });
    }
  }

  return anomalies;
};

/**
 * Generate a natural-language daily/weekly operations summary.
 */
const generateOperationsSummary = async (windowHours = 24) => {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const previousWindowStart = new Date(
    Date.now() - 2 * windowHours * 60 * 60 * 1000
  );

  // Current window stats
  const [totalRequests, pendingRequests, approvedRequests, ndaRequests, agreementRequests] =
    await Promise.all([
      Request.countDocuments({ createdAt: { $gte: since } }),
      Request.countDocuments({ status: "pending", createdAt: { $gte: since } }),
      Request.countDocuments({ status: "approved", createdAt: { $gte: since } }),
      Request.countDocuments({ type: "nda", createdAt: { $gte: since } }),
      Request.countDocuments({ type: "agreement", createdAt: { $gte: since } }),
    ]);

  // Previous window for comparison
  const prevPending = await Request.countDocuments({
    status: "pending",
    createdAt: { $gte: previousWindowStart, $lt: since },
  });

  const pendingChange =
    prevPending === 0
      ? null
      : Math.round(((pendingRequests - prevPending) / prevPending) * 100);

  // Retention compliance check: flag documents older than 5 years not yet archived
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const retentionIssues = await Request.countDocuments({
    status: "approved",
    createdAt: { $lt: fiveYearsAgo },
    "postdocs.url": { $in: ["", null] },
  });

  // Build natural language summary
  const windowLabel = windowHours <= 24 ? "today" : `the past ${windowHours / 24} days`;
  let summary = `DPO Operations Summary for ${windowLabel}:\n`;
  summary += `• ${totalRequests} new request(s) submitted`;
  if (ndaRequests > 0)
    summary += ` (${ndaRequests} NDA${ndaRequests > 1 ? "s" : ""}`;
  if (agreementRequests > 0)
    summary += ndaRequests > 0
      ? `, ${agreementRequests} Agreement${agreementRequests > 1 ? "s" : ""})`
      : ` (${agreementRequests} Agreement${agreementRequests > 1 ? "s" : ""})`;
  else if (ndaRequests > 0) summary += ")";
  summary += ".\n";

  summary += `• ${approvedRequests} request(s) approved.\n`;
  summary += `• ${pendingRequests} request(s) currently pending.`;
  if (pendingChange !== null) {
    const direction = pendingChange >= 0 ? "increase" : "decrease";
    summary += ` (${Math.abs(pendingChange)}% ${direction} vs. previous period)`;
  }
  summary += "\n";

  if (retentionIssues > 0) {
    summary +=
      `• ⚠️ Retention Alert: ${retentionIssues} approved document(s) older than 5 years ` +
      `may not be properly archived. Manual verification required.\n`;
  }

  return {
    windowHours,
    stats: {
      totalRequests,
      pendingRequests,
      approvedRequests,
      ndaRequests,
      agreementRequests,
      retentionIssues,
    },
    pendingChange,
    summary,
  };
};

/**
 * GET /api/ai/audit-summary
 * Agent 3 — System Auditor & Analytics Agent.
 * Returns natural language operations summary and detected anomalies.
 * Accessible only by Admins (enforced in router via authorizeAdmin).
 */
exports.auditSummary = async (req, res) => {
  try {
    const windowHours = parseInt(req.query.windowHours, 10) || 24;
    if (windowHours < 1 || windowHours > 168) {
      return res
        .status(400)
        .json({ message: "windowHours must be between 1 and 168." });
    }

    const [operationsSummary, anomalies] = await Promise.all([
      generateOperationsSummary(windowHours),
      detectAnomalies(windowHours),
    ]);

    return res.json({
      agent: "auditor",
      generatedAt: new Date().toISOString(),
      operationsSummary,
      anomalies,
      anomalyCount: anomalies.length,
      disclaimer:
        "This report is generated by the DPO Security & Audit Agent for informational purposes. " +
        "It does not constitute legal or compliance advice.",
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
