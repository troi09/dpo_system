const express = require("express");
const router = express.Router();

const { protect, authorizeAdmin } = require("../middleware/authMiddleware");
const {
  createRequest,
  getMyRequests,
  getAllRequests,
  getAllPending,
  updateRequestStatus,
} = require("../controllers/requestController");

// Student
router.post("/", protect, createRequest);
router.get("/my", protect, getMyRequests);

// Admin
router.get("/all", protect, authorizeAdmin, getAllRequests);
router.get("/", protect, authorizeAdmin, getAllPending);
router.patch("/:id", protect, authorizeAdmin, updateRequestStatus);

module.exports = router;
