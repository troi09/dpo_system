const express = require("express");
const router = express.Router();
const { protect, authorizeAdmin } = require("../middleware/authMiddleware");
const { apiLimiter } = require("../middleware/rateLimiter");
const { getAuditLogs } = require("../controllers/auditController");

router.get("/", apiLimiter, protect, authorizeAdmin, getAuditLogs);

module.exports = router;
