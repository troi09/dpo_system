const AuditLog = require("../models/AuditLog");

/**
 * Create an audit log entry (fire-and-forget; errors are logged but not thrown).
 * @param {string|null} userId  - MongoDB ObjectId of the acting user (or null for system)
 * @param {string}      action  - Short action label, e.g. "USER_LOGIN"
 * @param {string}      details - Human-readable detail string
 */
const logAudit = (userId, action, details = "") => {
  AuditLog.create({ userId: userId || null, action, details }).catch((err) =>
    console.error("[audit]", err.message)
  );
};

module.exports = { logAudit };
