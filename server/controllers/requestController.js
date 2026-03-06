const crypto = require("crypto");
const mongoose = require("mongoose");
const Request = require("../models/Request");

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
    const initialStatus = type === "agreement" ? "phase1_pending" : "pending";

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

    if (r.status !== "revision_required") {
      return res.status(400).json({ message: "Only revision_required requests can be resubmitted" });
    }

    r.formData = formData && typeof formData === "object" ? formData : r.formData;
    r.predocs = Array.isArray(predocs) ? predocs : [];
    // Agreements go back to phase1_pending, NDAs go back to pending
    r.status = r.type === "agreement" ? "phase1_pending" : "pending";
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

// NDA-only status update (pending → approved | revision_required)
exports.updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const allowedStatuses = ["approved", "revision_required"];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid request id" });
    }

    const existing = await Request.findById(id).select("type status serialNo");
    if (!existing) return res.status(404).json({ message: "Request not found" });

    if (existing.type === "agreement") {
      return res.status(400).json({ message: "Use agreement-specific endpoints for agreement requests" });
    }

    if (existing.status !== "pending") {
      return res.status(400).json({ message: "Only pending NDA requests can be updated here" });
    }

    const updatePayload = { status, remarks: remarks || "" };

    if (status === "approved" && !existing.serialNo) {
      updatePayload.serialNo = generateVerification();
    }

    const updated = await Request.findByIdAndUpdate(id, updatePayload, { new: true }).select("-__v");
    if (!updated) return res.status(404).json({ message: "Request not found" });

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

    const validFinalStatuses = ["approved", "phase3_approved"];
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

    const allowedFromStatuses = ["phase1_pending", "revision_required"];
    if (!allowedFromStatuses.includes(r.status)) {
      return res.status(400).json({
        message: `Cannot generate signing link from status: ${r.status}`,
      });
    }

    r.signingToken = generateSigningTokenValue();
    r.signingTokenUsed = false;
    r.status = "phase2_pending";
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
      .select("_id formData status signingTokenUsed authorizerSigUrl remarks repInfo updatedAt type");

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

    const allowedStatuses = ["phase2_pending", "rep_revision_required"];
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
    r.status = "phase3_pending";
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

    const allowedStatuses = ["phase2_pending", "rep_revision_required"];
    if (!allowedStatuses.includes(r.status)) {
      return res.status(400).json({ message: "This request is not awaiting representative signature" });
    }

    r.signingTokenUsed = true;
    r.status = "rep_rejected";

    await r.save();

    return res.json({ message: "You have declined the signing request." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Admin: phase3_pending → phase3_approved (generates serialNo) or rep_revision_required (new token)
exports.adminPhase3Action = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, remarks } = req.body;

    if (!["approve", "rep_revision_required"].includes(action)) {
      return res.status(400).json({ message: "action must be 'approve' or 'rep_revision_required'" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid request id" });
    }

    const r = await Request.findById(id);
    if (!r) return res.status(404).json({ message: "Request not found" });

    if (r.type !== "agreement") {
      return res.status(400).json({ message: "Only agreement requests use this endpoint" });
    }

    if (r.status !== "phase3_pending") {
      return res.status(400).json({ message: "Request is not in phase3_pending" });
    }

    if (action === "approve") {
      if (!r.serialNo) {
        r.serialNo = generateVerification();
      }
      r.status = "phase3_approved";
      r.remarks = "";
    } else {
      // rep_revision_required: generate new signing token so admin can resend
      r.signingToken = generateSigningTokenValue();
      r.signingTokenUsed = false;
      r.status = "rep_revision_required";
      r.remarks = remarks || "";
    }

    await r.save();

    return res.json({
      message: action === "approve" ? "Agreement approved" : "Rep revision requested",
      request: r,
    });
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

    // NDA: valid when approved; Agreement: valid when phase3_approved
    const isValid =
      (r.type === "nda" && r.status === "approved") ||
      (r.type === "agreement" && r.status === "phase3_approved");

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
