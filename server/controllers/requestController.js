const crypto = require("crypto");
const mongoose = require("mongoose");
const Request = require("../models/Request");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { sendStatusUpdateEmail } = require("../utils/emailService");

const logAudit = (data) => {
  AuditLog.create(data).catch(() => {});
};

const STATUS_GROUPS = {
  pending: [
    "nda_submitted",
    "nda_admin_reviewal",
    "agreement_submitted",
    "agreement_initial_admin_reviewal",
    "agreement_final_admin_reviewal",
  ],
  under_review: ["agreement_awaiting_rep_approval"],
  approved_completed: ["nda_approved", "agreement_approved"],
  revision: ["nda_revision_requested", "agreement_rep_revision_requested"],
  representative: ["agreement_awaiting_rep_approval", "agreement_rep_declined", "agreement_rep_revision_requested"],
};

const resolveStatusFilter = (statusQuery) => {
  if (!statusQuery) return [];

  const tokens = String(statusQuery)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const resolved = tokens.flatMap((token) => STATUS_GROUPS[token] || [token]);
  return [...new Set(resolved)];
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SERIAL_SUFFIX_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const pad2 = (n) => String(n).padStart(2, "0");

const getSerialDatePart = (date = new Date()) => {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
};

const generateSerialSuffix = () => {
  let suffix = "";
  for (let i = 0; i < 4; i += 1) {
    const idx = crypto.randomInt(0, SERIAL_SUFFIX_CHARS.length);
    suffix += SERIAL_SUFFIX_CHARS[idx];
  }
  return suffix;
};

const buildSerialNo = (type) => {
  const prefix = type === "nda" ? "NDA" : "DATA";
  return `${prefix}-${getSerialDatePart()}-${generateSerialSuffix()}`;
};

const generateUniqueSerialNo = async (type) => {
  const maxAttempts = 12;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const serialNo = buildSerialNo(type);
    const exists = await Request.exists({ serialNo });
    if (!exists) return serialNo;
  }

  throw new Error("Failed to generate a unique serial number");
};

const generateSigningTokenValue = () =>
  crypto.randomBytes(20).toString("hex");

// ─── Student ──────────────────────────────────────────────────────────────────

exports.createRequest = async (req, res) => {
  try {
    if (!["student", "staff"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only student and staff accounts can create requests" });
    }

    const {
      type,
      formData,
      predocs,
      authorizerSigUrl,
      authorizerSigPath,
      studentSigUrl,
      studentSigPath,
      proxyRequestee,
    } = req.body;

    if (!type || !["nda", "agreement"].includes(type)) {
      return res.status(400).json({ message: "Invalid type" });
    }

    if (!formData || typeof formData !== "object") {
      return res.status(400).json({ message: "formData must be an object" });
    }

    const initialStatus = type === "agreement" ? "agreement_submitted" : "nda_submitted";
    const isStaffProxy = req.user.role === "staff";

    if (isStaffProxy) {
      // Support both structured name fields and legacy fullName
      const hasStructuredName = proxyRequestee &&
        String(proxyRequestee.firstName || "").trim() &&
        String(proxyRequestee.lastName || "").trim();
      const hasLegacyName = proxyRequestee && String(proxyRequestee.fullName || "").trim();

      const requiredNonNameFields = ["email", "idNumber", "departmentOrOrganization"];
      if (!proxyRequestee || typeof proxyRequestee !== "object") {
        return res.status(400).json({ message: "Proxy requestee details are required for staff submissions" });
      }

      if (!hasStructuredName && !hasLegacyName) {
        return res.status(400).json({ message: "Proxy requestee first name and last name are required" });
      }

      for (const field of requiredNonNameFields) {
        if (!String(proxyRequestee[field] || "").trim()) {
          return res.status(400).json({ message: `Proxy requestee ${field} is required` });
        }
      }
    }

    // Compute proxy requestee full name from structured or legacy fields
    const buildProxyFullName = (pr) => {
      const fn = String(pr.firstName || "").trim();
      const mi = String(pr.middleInitial || "").trim();
      const ln = String(pr.lastName || "").trim();
      if (fn && ln) return `${fn}${mi ? " " + mi + "." : ""} ${ln}`;
      return String(pr.fullName || "").trim();
    };

    const createPayload = {
      userId: req.user.id,
      type,
      status: initialStatus,
      formData,
      predocs: Array.isArray(predocs) ? predocs : [],
      proxyRequestee: isStaffProxy
        ? {
            isProxy: true,
            staffUserId: req.user.id,
            firstName: String(proxyRequestee.firstName || "").trim(),
            middleInitial: String(proxyRequestee.middleInitial || "").trim(),
            lastName: String(proxyRequestee.lastName || "").trim(),
            fullName: buildProxyFullName(proxyRequestee),
            email: String(proxyRequestee.email || "").trim(),
            idNumber: String(proxyRequestee.idNumber || "").trim(),
            departmentOrOrganization: String(proxyRequestee.departmentOrOrganization || "").trim(),
          }
        : {
            isProxy: false,
            staffUserId: null,
            firstName: "",
            middleInitial: "",
            lastName: "",
            fullName: "",
            email: "",
            idNumber: "",
            departmentOrOrganization: "",
          },
    };

    if (type === "agreement") {
      createPayload.authorizerSigUrl = authorizerSigUrl || "";
      createPayload.authorizerSigPath = authorizerSigPath || "";
    }

    if (type === "nda") {
      createPayload.studentSigUrl = studentSigUrl || "";
      createPayload.studentSigPath = studentSigPath || "";
    }

    const created = await Request.create(createPayload);

    logAudit({
      userId: req.user.id,
      action: "request_created",
      resourceType: "request",
      resourceId: String(created._id),
      details: { type, status: initialStatus, isProxy: isStaffProxy },
    });

    return res.status(201).json({ message: "Request submitted", request: created });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getMyRequests = async (req, res) => {
  try {
    const list = await Request.find({ userId: req.user.id, isArchived: { $ne: true } })
      .sort({ createdAt: -1 })
      .select("_id type status formData createdAt proxyRequestee postdocs isArchived")
      .lean();

    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.resubmitRequest = async (req, res) => {
  try {
    const { formData, predocs, authorizerSigUrl, authorizerSigPath, studentSigUrl, studentSigPath } = req.body;

    const r = await Request.findById(req.params.id);
    if (!r) return res.status(404).json({ message: "Request not found" });

    if (String(r.userId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (r.status !== "nda_revision_requested") {
      return res.status(400).json({ message: "Only NDA revision-requested requests can be resubmitted" });
    }

    r.formData = formData && typeof formData === "object" ? formData : r.formData;
    r.predocs = Array.isArray(predocs) ? predocs : [];
    // Agreements go back to initial review stage, NDAs go back to admin review stage
    r.status = r.type === "agreement" ? "agreement_initial_admin_reviewal" : "nda_admin_reviewal";
    r.remarks = "";
    r.postdocs = { url: "", path: "", issuedAt: "", verificationUrl: "" };

    if (r.type === "agreement" && authorizerSigUrl) {
      r.authorizerSigUrl = authorizerSigUrl;
      r.authorizerSigPath = authorizerSigPath || "";
    }

    if (r.type === "nda" && studentSigUrl) {
      r.studentSigUrl = studentSigUrl;
      r.studentSigPath = studentSigPath || "";
    }

    await r.save();

    logAudit({
      userId: req.user.id,
      action: "request_resubmitted",
      resourceType: "request",
      resourceId: String(r._id),
      details: { type: r.type, newStatus: r.status },
    });

    return res.json({ message: "Resubmitted", request: r });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ─── Admin ────────────────────────────────────────────────────────────────────

exports.getAllRequests = async (req, res) => {
  try {
    const { startDate, endDate, status, includeArchived, search } = req.query;

    const query = {};

    // Active workflow should exclude archived records unless explicitly requested.
    if (String(includeArchived) !== "true") {
      query.isArchived = { $ne: true };
    }

    const resolvedStatuses = resolveStatusFilter(status);
    if (resolvedStatuses.length) {
      query.status = { $in: resolvedStatuses };
    }

    if (startDate || endDate) {
      query.createdAt = {};

      if (startDate) {
        const parsedStart = new Date(startDate);
        if (Number.isNaN(parsedStart.getTime())) {
          return res.status(400).json({ message: "Invalid startDate" });
        }
        parsedStart.setHours(0, 0, 0, 0);
        query.createdAt.$gte = parsedStart;
      }

      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (Number.isNaN(parsedEnd.getTime())) {
          return res.status(400).json({ message: "Invalid endDate" });
        }
        parsedEnd.setHours(23, 59, 59, 999);
        query.createdAt.$lte = parsedEnd;
      }
    }

    if (search && String(search).trim()) {
      const term = String(search).trim();
      const regex = new RegExp(escapeRegex(term), "i");

      const userOr = [
        { name: regex },
        { email: regex },
      ];

      if (mongoose.Types.ObjectId.isValid(term)) {
        userOr.push({ _id: term });
      }

      const matchingUsers = await User.find({ $or: userOr }).select("_id");
      const matchedUserIds = matchingUsers.map((u) => u._id);

      const searchableFormFields = [
        "formData.purpose",
        "formData.organizationName",
        "formData.organization",
        "formData.orgName",
        "formData.tags",
        "formData.title",
        "formData.projectTitle",
        "formData.ndaTypeLabel",
        "proxyRequestee.fullName",
        "proxyRequestee.email",
        "proxyRequestee.idNumber",
        "proxyRequestee.departmentOrOrganization",
      ];

      const formDataClauses = searchableFormFields.map((field) => ({ [field]: regex }));

      const searchClauses = [
        { serialNo: regex },
        ...formDataClauses,
      ];

      if (matchedUserIds.length) {
        searchClauses.push({ userId: { $in: matchedUserIds } });
      }

      if (mongoose.Types.ObjectId.isValid(term)) {
        searchClauses.push({ _id: term });
      }

      query.$or = searchClauses;
    }

    const list = await Request.find(query)
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .select("-__v")
      .lean();

    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getRequestById = async (req, res) => {
  try {
    const r = await Request.findById(req.params.id)
      .populate("userId", "name email role")
      .select("-__v");

    if (!r) return res.status(404).json({ message: "Request not found" });

    const isPrivilegedViewer = req.user.role === "admin" || req.user.role === "staff";
    const isAdmin = req.user.role === "admin";
    const ownerId = r.userId?._id || r.userId;
    const isOwner = String(ownerId) === String(req.user.id);

    if (!isPrivilegedViewer && !isOwner) return res.status(403).json({ message: "Forbidden" });

    // Strip signing token from non-privileged (student) responses for security
    if (!isPrivilegedViewer) {
      const obj = r.toObject();
      delete obj.signingToken;
      return res.json(obj);
    }

    return res.json(r);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Admin-only workflow updates for NDA and initial Agreement review phases.
exports.updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, adminSigUrl, adminSigPath } = req.body;

    const allowedStatuses = [
      "nda_admin_reviewal",
      "nda_approved",
      "nda_revision_requested",
      "agreement_initial_admin_reviewal",
      "agreement_rep_revision_requested",
    ];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid request id" });
    }

    const existing = await Request.findById(id).select("type status serialNo");
    if (!existing) return res.status(404).json({ message: "Request not found" });

    const isNda = existing.type === "nda";
    const isAgreement = existing.type === "agreement";

    if (isNda) {
      const allowedFrom = ["nda_submitted", "nda_admin_reviewal"];
      if (!allowedFrom.includes(existing.status)) {
        return res.status(400).json({ message: "Only submitted NDA requests can be updated here" });
      }
      const allowedTargets = ["nda_admin_reviewal", "nda_approved", "nda_revision_requested"];
      if (!allowedTargets.includes(status)) {
        return res.status(400).json({ message: "Invalid target status for NDA" });
      }
      if (status === "nda_approved" && existing.status === "nda_submitted") {
        return res.status(400).json({ message: "Move request to Admin Reviewal before approval" });
      }
    }

    if (isAgreement) {
      const allowedFrom = ["agreement_submitted", "agreement_initial_admin_reviewal"];
      if (!allowedFrom.includes(existing.status)) {
        return res.status(400).json({ message: "Use agreement-specific endpoints for this stage" });
      }
      const allowedTargets = ["agreement_initial_admin_reviewal", "agreement_rep_revision_requested"];
      if (!allowedTargets.includes(status)) {
        return res.status(400).json({ message: "Invalid target status for Agreement initial review" });
      }
    }

    const updatePayload = { status, remarks: remarks || "" };

    if (status === "nda_approved" && !existing.serialNo) {
      updatePayload.serialNo = await generateUniqueSerialNo("nda");
    }

    // Store admin signature for NDA approvals
    if (status === "nda_approved" && existing.type === "nda" && adminSigUrl) {
      updatePayload.adminSigUrl = adminSigUrl;
      updatePayload.adminSigPath = adminSigPath || "";
    }

    const updated = await Request.findByIdAndUpdate(id, updatePayload, { new: true }).select("-__v");
    if (!updated) return res.status(404).json({ message: "Request not found" });

    logAudit({
      userId: req.user.id,
      action: status === "nda_approved" ? "request_approved" : "request_forwarded",
      resourceType: "request",
      resourceId: String(id),
      details: { newStatus: status, type: existing.type },
    });

    // Notify student by email
    User.findById(updated.userId).then((owner) => {
      if (owner?.email) {
        sendStatusUpdateEmail(owner.email, owner.name, updated.type, status, remarks || "").catch((emailErr) => {
          console.error("Request status notification email failed:", emailErr.message);
        });
      }
    }).catch(() => {});

    return res.json({ message: "Request updated", request: updated });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.saveApprovedDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { url, path, issuedAt, verificationUrl } = req.body;

    if (!url || !path) return res.status(400).json({ message: "url and path are required" });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid request id" });

    const r = await Request.findById(id);
    if (!r) return res.status(404).json({ message: "Request not found" });

    const validFinalStatuses = ["nda_approved", "agreement_approved"];
    if (!validFinalStatuses.includes(r.status)) {
      return res.status(400).json({ message: "Request is not in a final approved state" });
    }

    r.postdocs = {
      url,
      path,
      issuedAt: issuedAt || new Date().toISOString(),
      verificationUrl: verificationUrl || "",
    };

    // Volatile signatures: immediately nullify signature data after PDF is saved
    r.studentSigUrl = "";
    r.studentSigPath = "";
    r.adminSigUrl = "";
    r.adminSigPath = "";
    r.authorizerSigUrl = "";
    r.authorizerSigPath = "";
    r.repSigUrl = "";
    r.repSigPath = "";

    await r.save();
    return res.json({ message: "Approved document saved", request: r });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ─── Agreement Phase Endpoints ────────────────────────────────────────────────

// Admin: agreement_initial_admin_reviewal -> agreement_awaiting_rep_approval
// Also used for agreement_rep_revision_requested -> generate new token
exports.generateSigningLink = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid request id" });
    }

    const r = await Request.findById(id);
    if (!r) return res.status(404).json({ message: "Request not found" });

    if (r.type !== "agreement") {
      return res.status(400).json({ message: "Only agreement requests use signing links" });
    }

    const allowedFromStatuses = ["agreement_initial_admin_reviewal", "agreement_rep_revision_requested", "agreement_awaiting_rep_approval"];
    if (!allowedFromStatuses.includes(r.status)) {
      return res.status(400).json({
        message: `Cannot generate signing link from status: ${r.status}`,
      });
    }

    r.signingToken = generateSigningTokenValue();
    r.signingTokenUsed = false;
    r.signingTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7-day TTL
    r.status = "agreement_awaiting_rep_approval";
    r.remarks = "";

    await r.save();

    logAudit({
      userId: req.user.id,
      action: "signing_link_generated",
      resourceType: "request",
      resourceId: String(id),
      details: { type: r.type },
    });

    return res.json({
      message: "Signing link generated",
      signingToken: r.signingToken,
      signingTokenExpiresAt: r.signingTokenExpiresAt,
      request: r,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Public: get request data needed for the signing page
exports.getBySigningToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) return res.status(400).json({ message: "Missing token" });

    const r = await Request.findOne({ signingToken: token })
      .populate("userId", "name email")
      .select("_id formData status signingTokenUsed signingTokenExpiresAt authorizerSigUrl authorizerSigPath remarks repInfo updatedAt type")
      .lean();

    if (!r) return res.status(404).json({ message: "Invalid signing link" });

    // Check for link expiry
    if (r.signingTokenExpiresAt && new Date(r.signingTokenExpiresAt) < new Date()) {
      return res.status(410).json({ message: "This signing link has expired. Please request a new one." });
    }

    return res.json(r);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Public: rep submits on the signing page
exports.repSubmit = async (req, res) => {
  try {
    const { token } = req.params;
    const { repName, repGovIdDoc, repSigUrl, repSigPath } = req.body;

    if (!token) return res.status(400).json({ message: "Missing token" });

    const r = await Request.findOne({ signingToken: token });
    if (!r) return res.status(404).json({ message: "Invalid signing link" });

    if (r.signingTokenUsed) {
      return res.status(400).json({ message: "This signing link has already been used" });
    }

    // Check for link expiry
    if (r.signingTokenExpiresAt && new Date(r.signingTokenExpiresAt) < new Date()) {
      return res.status(410).json({ message: "This signing link has expired. Please request a new one." });
    }

    const allowedStatuses = ["agreement_awaiting_rep_approval", "agreement_rep_revision_requested"];
    if (!allowedStatuses.includes(r.status)) {
      return res.status(400).json({ message: "This request is not awaiting representative signature" });
    }

    if (!repName || !repName.trim()) {
      return res.status(400).json({ message: "Representative name is required" });
    }
    if (!repSigUrl) {
      return res.status(400).json({ message: "Representative signature is required" });
    }
    if (!repGovIdDoc || !repGovIdDoc.url) {
      return res.status(400).json({ message: "Government ID is required" });
    }

    r.repInfo = {
      name: repName.trim(),
      govIdDoc: repGovIdDoc,
    };
    r.repSigUrl = repSigUrl;
    r.repSigPath = repSigPath || "";
    r.signingTokenUsed = true;
    r.status = "agreement_final_admin_reviewal";
    r.remarks = "";

    await r.save();

    logAudit({
      action: "rep_signature_submitted",
      resourceType: "request",
      resourceId: String(r._id),
      details: { repName: repName.trim() },
    });

    return res.json({ message: "Submission received. Thank you." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Public: rep rejects on the signing page
exports.repReject = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) return res.status(400).json({ message: "Missing token" });

    const r = await Request.findOne({ signingToken: token });
    if (!r) return res.status(404).json({ message: "Invalid signing link" });

    if (r.signingTokenUsed) {
      return res.status(400).json({ message: "This signing link has already been used" });
    }

    const allowedStatuses = ["agreement_awaiting_rep_approval", "agreement_rep_revision_requested"];
    if (!allowedStatuses.includes(r.status)) {
      return res.status(400).json({ message: "This request is not awaiting representative signature" });
    }

    r.signingTokenUsed = true;
    r.status = "agreement_rep_declined";

    await r.save();

    logAudit({
      action: "rep_signature_declined",
      resourceType: "request",
      resourceId: String(r._id),
    });

    return res.json({ message: "You have declined the signing request." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Admin: agreement_final_admin_reviewal -> agreement_approved or agreement_rep_revision_requested
exports.adminPhase3Action = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, remarks } = req.body;

    if (!["approve", "rep_revision_requested"].includes(action)) {
      return res.status(400).json({ message: "action must be 'approve' or 'rep_revision_requested'" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid request id" });
    }

    const r = await Request.findById(id);
    if (!r) return res.status(404).json({ message: "Request not found" });

    if (r.type !== "agreement") {
      return res.status(400).json({ message: "Only agreement requests use this endpoint" });
    }
    if (r.status !== "agreement_final_admin_reviewal") {
      return res.status(400).json({ message: `Cannot perform phase3 action from status: ${r.status}` });
    }

    if (action === "approve") {
      r.status = "agreement_approved";
      if (!r.serialNo) r.serialNo = await generateUniqueSerialNo("agreement");
      r.remarks = "";
    } else {
      // rep_revision_requested: generate new signing token
      r.signingToken = generateSigningTokenValue();
      r.signingTokenUsed = false;
      r.status = "agreement_rep_revision_requested";
      r.remarks = remarks || "";
    }

    await r.save();

    logAudit({
      userId: req.user.id,
      action: action === "approve" ? "request_approved" : "request_revision_required",
      resourceType: "request",
      resourceId: String(id),
      details: { newStatus: r.status },
    });

    // Notify student
    User.findById(r.userId).then((owner) => {
      if (owner?.email) {
        sendStatusUpdateEmail(owner.email, owner.name, r.type, r.status, r.remarks).catch((emailErr) => {
          console.error("Agreement status notification email failed:", emailErr.message);
        });
      }
    }).catch(() => {});

    return res.json({
      message: action === "approve" ? "Agreement approved" : "Rep revision requested",
      request: r,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ─── Admin: proxy Firebase signature images to avoid browser CORS ─────────────

exports.getSignatureImages = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .select("authorizerSigUrl repSigUrl studentSigUrl adminSigUrl type");
    if (!request) return res.status(404).json({ message: "Request not found" });

    const toDataUrl = async (url) => {
      if (!url) return null;
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const mimeType = response.headers.get("content-type") || "image/png";
      const base64 = Buffer.from(buffer).toString("base64");
      return `data:${mimeType};base64,${base64}`;
    };

    if (request.type === "nda") {
      const [studentSig, adminSig] = await Promise.all([
        toDataUrl(request.studentSigUrl),
        toDataUrl(request.adminSigUrl),
      ]);
      return res.json({ studentSig, adminSig });
    }

    const [authorizerSig, repSig] = await Promise.all([
      toDataUrl(request.authorizerSigUrl),
      toDataUrl(request.repSigUrl),
    ]);

    return res.json({ authorizerSig, repSig });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ─── Public Verify ────────────────────────────────────────────────────────────

exports.verifyRequestCode = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) return res.status(400).json({ valid: false, message: "Missing code" });

    const r = await Request.findOne({ serialNo: code })
      .populate("userId", "name email")
      .select("-__v")
      .lean();

    if (!r) return res.status(404).json({ valid: false, message: "Not found" });

    const isValid =
      (r.type === "nda" && r.status === "nda_approved") ||
      (r.type === "agreement" && r.status === "agreement_approved");

    return res.json({
      valid: isValid,
      status: r.status,
      type: r.type,
      requestId: r._id,
      issuedAt: r.postdocs?.issuedAt || "",
    });
  } catch (err) {
    return res.status(500).json({ valid: false, message: err.message });
  }
};

// ─── Admin: stats for dashboard / reports ────────────────────────────────────

exports.getRequestStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [statusCounts, typeCounts, monthlyTypeCounts, totalArchived] = await Promise.all([
      // Status distribution
      Request.aggregate([
        { $match: { isArchived: false } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      // Type distribution (all time, not archived)
      Request.aggregate([
        { $match: { isArchived: false } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),
      // Type distribution for current month
      Request.aggregate([
        { $match: { isArchived: false, createdAt: { $gte: startOfMonth } } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),
      Request.countDocuments({ isArchived: true }),
    ]);

    res.json({ statusCounts, typeCounts, monthlyTypeCounts, totalArchived });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Admin: get archived requests ────────────────────────────────────────────

exports.getArchivedRequests = async (req, res) => {
  try {
    const list = await Request.find({ isArchived: true })
      .populate("userId", "name email role")
      .sort({ archivedAt: -1 })
      .select("-__v")
      .lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
