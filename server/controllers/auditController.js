const AuditLog = require("../models/AuditLog");

// GET audit logs – admin only, most recent first
exports.getAuditLogs = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const logs = await AuditLog.find()
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("-__v");
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
