const express = require("express");
const router = express.Router();
const { protect, authorizeAdmin } = require("../middleware/authMiddleware");
const { getAuditLogs } = require("../controllers/auditController");

router.get("/", protect, authorizeAdmin, getAuditLogs);

module.exports = router;
