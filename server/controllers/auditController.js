const AuditLog = require("../models/AuditLog");

// GET /api/audit – Admin only, paginated
exports.getAuditLogs = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;
    const { action, userId } = req.query;

    const filter = {};
    if (action) filter.action = action;
    if (userId) filter.userId = userId;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("userId", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-__v")
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ logs, total, page, limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/audit/recent – last N entries for dashboard widget
exports.getRecentAuditLogs = async (req, res) => {
  try {
    const count = Math.min(parseInt(req.query.count) || 5, 20);
    const logs = await AuditLog.find()
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .limit(count)
      .select("-__v")
      .lean();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
