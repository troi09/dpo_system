const mongoose = require("mongoose");

/**
 * AuditLog Model
 * Tracks system activity for the System Auditor & Analytics Agent (Agent 3).
 * Stores user actions, document routing history, and login events.
 */
const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    action: {
      type: String,
      required: true,
      // e.g. "login", "login_failed", "request_created", "request_approved",
      //      "request_revision_required", "document_generated"
    },

    resourceType: {
      type: String,
      default: "",
      // e.g. "request", "user", "template"
    },

    resourceId: {
      type: String,
      default: "",
    },

    details: {
      type: Object,
      default: {},
    },

    ipAddress: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Index for efficient querying by user and time window (used by Auditor Agent)
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ resourceType: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
