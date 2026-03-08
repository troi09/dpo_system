const express = require("express");
const router = express.Router();

const { protect, authorizeAdmin, authorizeAdminOrStaff } = require("../middleware/authMiddleware");
const { apiLimiter } = require("../middleware/rateLimiter");
const {
  createRequest,
  getMyRequests,
  resubmitRequest,
  getAllRequests,
  getArchivedRequests,
  saveApprovedDocument,
  updateRequestStatus,
  getRequestById,
  verifyRequestCode,
} = require("../controllers/requestController");

// PUBLIC (no auth) – rate limited
router.get("/verify/:code", apiLimiter, verifyRequestCode);

// STUDENT (protected)
router.post("/", apiLimiter, protect, createRequest);
router.get("/my", apiLimiter, protect, getMyRequests);
router.patch("/:id/resubmit", apiLimiter, protect, resubmitRequest);

// ADMIN + STAFF (can view and review)
router.get("/all", apiLimiter, protect, authorizeAdminOrStaff, getAllRequests);
router.patch("/:id/approved-document", apiLimiter, protect, authorizeAdminOrStaff, saveApprovedDocument);
router.patch("/:id", apiLimiter, protect, authorizeAdminOrStaff, updateRequestStatus);

// ADMIN ONLY (archives)
router.get("/archived", apiLimiter, protect, authorizeAdmin, getArchivedRequests);

// SHARED (protected - checks ownership)
router.get("/:id", apiLimiter, protect, getRequestById);

module.exports = router;
