const crypto = require("crypto");
const mongoose = require("mongoose");
const Request = require("../models/Request");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { sendStatusUpdateEmail } = require("../utils/emailService");

const logAudit = (data) => {
  AuditLog.create(data).catch(() => {});
};

const generateVerification = () =>
  crypto.randomBytes(8).toString("hex").toUpperCase();

const generateSigningTokenValue = () =>
  crypto.randomBytes(20).toString("hex");

// ─── Student ──────────────────────────────────────────────────────────────────

exports.createRequest = async (req, res) => {
  try {
    const { type, formData, predocs, authorizerSigUrl, authorizerSigPath } = req.body;

    if (!type || !["nda", "agreement"].includes(type)) {
      return res.status(400).json({ message: "Invalid type" });
    }

    if (!formData || typeof formData !== "object") {
      return res.status(400).json({ message: "formData must be an object" });
    }

    // Agreements use the multi-phase lifecycle
    const initialStatus = type === "agreement" ? "submitted" : "pending";

    const createPayload = {
      userId: req.user.id,
      type,
      status: initialStatus,
      formData,
      predocs: Array.isArray(predocs) ? predocs : [],
    };

    if (type === "agreement") {
      createPayload.authorizerSigUrl = authorizerSigUrl || "";
      createPayload.authorizerSigPath = authorizerSigPath || "";
    }

    const created = await Request.create(createPayload);

    logAudit({
      userId: req.user.id,
      action: "request_created",
      resourceType: "request",
      resourceId: String(created._id),
      details: { type, status: initialStatus },
    });

    return res.status(201).json({ message: "Request submitted", request: created });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getMyRequests = async (req, res) => {
  try {
    const list = await Request.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .select("-__v");

    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.resubmitRequest = async (req, res) => {
  try {
    const { formData, predocs, authorizerSigUrl, authorizerSigPath } = req.body;

    const r = await Request.findById(req.params.id);
    if (!r) return res.status(404).json({ message: "Request not found" });

    if (String(r.userId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (r.status !== "revision_requested") {
      return res.status(400).json({ message: "Only revision_requested requests can be resubmitted" });
    }

    r.formData = formData && typeof formData === "object" ? formData : r.formData;
    r.predocs = Array.isArray(predocs) ? predocs : [];
    // Agreements go back to submitted, NDAs go back to pending
    r.status = r.type === "agreement" ? "submitted" : "pending";
    r.remarks = "";
    r.postdocs = { url: "", path: "", issuedAt: "", verificationUrl: "" };

    if (r.type === "agreement" && authorizerSigUrl) {
      r.authorizerSigUrl = authorizerSigUrl;
      r.authorizerSigPath = authorizerSigPath || "";
    }

    await r.save();
    return res.json({ message: "Resubmitted", request: r });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ─── Admin ────────────────────────────────────────────────────────────────────

exports.getAllRequests = async (req, res) => {
  try {
    const list = await Request.find()
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .select("-__v");

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

    const isAdmin = req.user.role === "admin";
    const ownerId = r.userId?._id || r.userId;
    const isOwner = String(ownerId) === String(req.user.id);

    if (!isAdmin && !isOwner) return res.status(403).json({ message: "Forbidden" });

    return res.json(r);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// NDA status update (pending → approved | revision_requested); also handles Agreement phase1 → revision_requested
exports.updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const allowedStatuses = ["approved", "revision_requested"];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid request id" });
    }

    const existing = await Request.findById(id).select("type status serialNo");
    if (!existing) return res.status(404).json({ message: "Request not found" });

    // Agreements can only use this endpoint from phase1 (submitted), not other phases
    if (existing.type === "agreement" && existing.status !== "submitted") {
      return res.status(400).json({ message: "Use agreement-specific endpoints for agreement requests" });
    }

    // Allow NDA (pending) and Agreement phase1 (submitted)
    const allowedCurrentStatuses = ["pending", "submitted"];
    if (!allowedCurrentStatuses.includes(existing.status)) {
      return res.status(400).json({ message: "Only pending requests can be updated here" });
    }

    const updatePayload = { status, remarks: remarks || "" };

    if (status === "approved" && !existing.serialNo) {
      updatePayload.serialNo = generateVerification();
    }

    const updated = await Request.findByIdAndUpdate(id, updatePayload, { new: true }).select("-__v");
    if (!updated) return res.status(404).json({ message: "Request not found" });

    logAudit({
      userId: req.user.id,
      action: status === "approved" ? "request_approved" : "request_revision_required",
      resourceType: "request",
      resourceId: String(id),
      details: { newStatus: status, type: existing.type },
    });

    // Notify student by email
    User.findById(updated.userId).then((owner) => {
      if (owner?.email) {
        sendStatusUpdateEmail(owner.email, owner.name, updated.type, status, remarks || "").catch(() => {});
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

    const validFinalStatuses = ["approved", "completed"];
    if (!validFinalStatuses.includes(r.status)) {
      return res.status(400).json({ message: "Request is not in a final approved state" });
    }

    r.postdocs = {
      url,
      path,
      issuedAt: issuedAt || new Date().toISOString(),
      verificationUrl: verificationUrl || "",
    };

    await r.save();
    return res.json({ message: "Approved document saved", request: r });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ─── Agreement Phase Endpoints ────────────────────────────────────────────────

// Admin: phase1_pending (or revision_required for agreement) → phase2_pending
// Also used for rep_revision_required → generate new token
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

    const allowedFromStatuses = ["submitted", "revision_requested"];
    if (!allowedFromStatuses.includes(r.status)) {
      return res.status(400).json({
        message: `Cannot generate signing link from status: ${r.status}`,
      });
    }

    r.signingToken = generateSigningTokenValue();
    r.signingTokenUsed = false;
    r.status = "awaiting_signature";
    r.remarks = "";

    await r.save();

    return res.json({
      message: "Signing link generated",
      signingToken: r.signingToken,
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
      .select("_id formData status signingTokenUsed authorizerSigUrl authorizerSigPath remarks repInfo updatedAt type");

    if (!r) return res.status(404).json({ message: "Invalid signing link" });

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

    const allowedStatuses = ["awaiting_signature", "rep_revision_requested"];
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
    r.status = "pending_approval";
    r.remarks = "";

    await r.save();

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

    const allowedStatuses = ["awaiting_signature", "rep_revision_requested"];
    if (!allowedStatuses.includes(r.status)) {
      return res.status(400).json({ message: "This request is not awaiting representative signature" });
    }

    r.signingTokenUsed = true;
    r.status = "declined";

    await r.save();

    return res.json({ message: "You have declined the signing request." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Admin: pending_approval → completed (generates serialNo) or rep_revision_requested (new token)
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
    if (r.status !== "pending_approval") {
      return res.status(400).json({ message: `Cannot perform phase3 action from status: ${r.status}` });
    }

    if (action === "approve") {
      r.status = "completed";
      if (!r.serialNo) r.serialNo = generateVerification();
      r.remarks = "";
    } else {
      // rep_revision_requested: generate new signing token
      r.signingToken = generateSigningTokenValue();
      r.signingTokenUsed = false;
      r.status = "rep_revision_requested";
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
        sendStatusUpdateEmail(owner.email, owner.name, r.type, r.status, r.remarks).catch(() => {});
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
      .select("authorizerSigUrl repSigUrl");
    if (!request) return res.status(404).json({ message: "Request not found" });

    const toDataUrl = async (url) => {
      if (!url) return null;
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const mimeType = response.headers.get("content-type") || "image/png";
      const base64 = Buffer.from(buffer).toString("base64");
      return `data:${mimeType};base64,${base64}`;
    };

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
      .select("-__v");

    if (!r) return res.status(404).json({ valid: false, message: "Not found" });

    const isValid =
      (r.type === "nda" && r.status === "approved") ||
      (r.type === "agreement" && r.status === "completed");

    return res.json({
      valid: isValid,
      status: r.status,
      type: r.type,
      requestId: r._id,
      issuedAt: r.postdocs?.issuedAt || "",
      studentName: r.userId?.name || "",
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
      .select("-__v");
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
