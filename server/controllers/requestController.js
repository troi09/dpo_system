const mongoose = require("mongoose");
const Request = require("../models/Request");

exports.createRequest = async (req, res) => {
  try {
    const { requestType, formData, requirements } = req.body;

    if (!requestType || !["nda", "agreement"].includes(requestType)) {
      return res.status(400).json({ message: "Invalid requestType" });
    }

    if (!formData || typeof formData !== "object") {
      return res.status(400).json({ message: "formData must be an object" });
    }

    const created = await Request.create({
      userId: req.user.id,
      requestType,
      formData,
      requirements: Array.isArray(requirements) ? requirements : [],
      status: "pending",
    });

    return res.status(201).json({
      message: "Request submitted",
      request: created,
    });
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
    const { formData, requirements } = req.body;

    const r = await Request.findById(req.params.id);
    if (!r) return res.status(404).json({ message: "Request not found" });

    if (String(r.userId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (r.status !== "revision_required") {
      return res.status(400).json({ message: "Only revision_required requests can be resubmitted" });
    }

    r.formData = (formData && typeof formData === "object") ? formData : r.formData;
    r.requirements = Array.isArray(requirements) ? requirements : [];
    r.status = "pending";
    r.adminRemarks = ""; // clear after resubmit so admin queue remarks is clean
    r.approvedDocument = { url: "", path: "", uploadedAt: "" };
    await r.save();

    return res.json({ message: "Resubmitted", request: r });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

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

exports.getAllPending = async (req, res) => {
  try {
    const list = await Request.find({ status: "pending" })
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .select("-__v");

    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.saveApprovedDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { url, path, uploadedAt } = req.body;

    if (!url || !path) return res.status(400).json({ message: "url and path are required" });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid request id" });

    const r = await Request.findById(id);
    if (!r) return res.status(404).json({ message: "Request not found" });

    if (r.status !== "approved") {
      return res.status(400).json({ message: "Only approved requests can have an approved document" });
    }

    r.approvedDocument = {
      url,
      path,
      uploadedAt: uploadedAt || new Date().toISOString(),
    };

    await r.save();
    return res.json({ message: "Approved document saved", request: r });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemarks } = req.body;

    const allowedStatuses = ["approved", "revision_required"];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid request id" });
    }

    const updated = await Request.findByIdAndUpdate(
      id,
      {
        status,
        adminRemarks: adminRemarks || "",
      },
      { new: true }
    ).select("-__v");

    if (!updated) {
      return res.status(404).json({ message: "Request not found" });
    }

    return res.json({
      message: "Request updated",
      request: updated,
    });
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