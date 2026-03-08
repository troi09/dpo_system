const express = require("express");
const router = express.Router();
const { protect, authorizeAdmin } = require("../middleware/authMiddleware");
const { apiLimiter } = require("../middleware/rateLimiter");
const {
  getAllUsers,
  createUser,
  setUserActive,
  triggerPasswordReset,
} = require("../controllers/userController");

router.get("/", apiLimiter, protect, authorizeAdmin, getAllUsers);
router.post("/", apiLimiter, protect, authorizeAdmin, createUser);
router.patch("/:id/active", apiLimiter, protect, authorizeAdmin, setUserActive);
router.post("/:id/reset-password", apiLimiter, protect, authorizeAdmin, triggerPasswordReset);

module.exports = router;
