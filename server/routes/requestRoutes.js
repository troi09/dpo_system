const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  createRequest,
  getMyRequests,
  getAllRequests,
  updateRequestStatus,
} = require("../controllers/requestController");

// Student
router.post("/", protect, createRequest);
router.get("/my", protect, getMyRequests);

// Admin
router.get("/", protect, getAllRequests);

router.patch("/:id", protect, updateRequestStatus);

module.exports = router;
