const mongoose = require("mongoose");
const Request = require("../models/Request");

exports.createRequest = async (req, res) => {
  try {
    const { requestType, formData } = req.body;

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