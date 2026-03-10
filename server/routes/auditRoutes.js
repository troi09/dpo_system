const express = require("express");
const router = express.Router();
const { getAuditLogs, getRecentAuditLogs } = require("../controllers/auditController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.get("/", protect, authorizeRoles("admin", "staff"), getAuditLogs);
router.get("/recent", protect, authorizeRoles("admin", "staff"), getRecentAuditLogs);

module.exports = router;
