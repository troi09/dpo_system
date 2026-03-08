const express = require("express");
const router = express.Router();
const { getAuditLogs, getRecentAuditLogs } = require("../controllers/auditController");
const { protect, authorizeAdmin } = require("../middleware/authMiddleware");

router.get("/", protect, authorizeAdmin, getAuditLogs);
router.get("/recent", protect, authorizeAdmin, getRecentAuditLogs);

module.exports = router;
