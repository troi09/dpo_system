const express = require("express");
const router = express.Router();

const { protect, authorizeAdmin } = require("../middleware/authMiddleware");
const {
  createRequest,
  getMyRequests,
  resubmitRequest,
  getAllRequests,
  getAllPending,
  saveApprovedDocument,
  updateRequestStatus,
  getRequestById,
  verifyRequestCode,
} = require("../controllers/requestController");

router.get("/verify/:code", verifyRequestCode);

// Student
router.post("/", protect, createRequest);
router.get("/my", protect, getMyRequests);
router.patch("/:id/resubmit", protect, resubmitRequest);

// Admin
router.get("/all", protect, authorizeAdmin, getAllRequests);
router.get("/", protect, authorizeAdmin, getAllPending);
router.patch("/:id/approved-document", protect, authorizeAdmin, saveApprovedDocument);
router.patch("/:id", protect, authorizeAdmin, updateRequestStatus);

router.get("/:id", protect, getRequestById);

module.exports = router;