const Request = require("../models/Request");

exports.createRequest = async (req, res) => {
  try {
    // Only students can submit requests
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can create requests" });
    }

    const { requestType, formData } = req.body;

    if (!requestType || !["nda", "authorization"].includes(requestType)) {
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
    // Only admins can view all requests
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    const list = await Request.find()
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .select("-__v");

    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
