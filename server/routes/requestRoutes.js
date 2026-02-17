const express = require("express");
const router = express.Router();

const { protect, authorizeAdmin } = require("../middleware/authMiddleware");
const {
  createRequest,
  getMyRequests,
  resubmitRequest,
  getAllRequests,
  getAllPending,
  updateRequestStatus,
  getRequestById,
} = require("../controllers/requestController");

// Student
router.post("/", protect, createRequest);
router.get("/my", protect, getMyRequests);
router.patch("/:id/resubmit", protect, resubmitRequest);

// Admin
router.get("/all", protect, authorizeAdmin, getAllRequests);
router.get("/", protect, authorizeAdmin, getAllPending);
router.patch("/:id", protect, authorizeAdmin, updateRequestStatus);

router.get("/:id", protect, getRequestById);

module.exports = router;
