const express = require("express");
const router = express.Router();

const { protect, authorizeAdmin, authorizeAdminOrStaff } = require("../middleware/authMiddleware");
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

// PUBLIC (no auth)
router.get("/verify/:code", verifyRequestCode);

// STUDENT (protected)
router.post("/", protect, createRequest);
router.get("/my", protect, getMyRequests);
router.patch("/:id/resubmit", protect, resubmitRequest);

// ADMIN + STAFF (can view and review)
router.get("/all", protect, authorizeAdminOrStaff, getAllRequests);
router.patch("/:id/approved-document", protect, authorizeAdminOrStaff, saveApprovedDocument);
router.patch("/:id", protect, authorizeAdminOrStaff, updateRequestStatus);

// ADMIN ONLY (archives)
router.get("/archived", protect, authorizeAdmin, getArchivedRequests);

// SHARED (protected - checks ownership)
router.get("/:id", protect, getRequestById);

module.exports = router;
