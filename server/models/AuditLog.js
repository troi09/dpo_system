const mongoose = require("mongoose");

<<<<<<< HEAD
=======
/**
 * AuditLog Model
 * Tracks system activity for the System Auditor & Analytics Agent (Agent 3).
 * Stores user actions, document routing history, and login events.
 */
>>>>>>> origin/Branch-ni-Kurl!
const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
<<<<<<< HEAD
    action: {
      type: String,
      required: true,
    },
    details: {
=======

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
>>>>>>> origin/Branch-ni-Kurl!
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

<<<<<<< HEAD
=======
// Index for efficient querying by user and time window (used by Auditor Agent)
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

>>>>>>> origin/Branch-ni-Kurl!
module.exports = mongoose.model("AuditLog", auditLogSchema);
