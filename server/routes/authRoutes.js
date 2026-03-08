const express = require("express");
const router = express.Router();

const {
  register,
  login,
  verifyOtp,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const { protect, authorizeAdmin } = require("../middleware/authMiddleware");

// Public
router.post("/register", register);
router.post("/login", login);
router.post("/verify-otp", verifyOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Admin-only test
router.get("/admin", protect, authorizeAdmin, (req, res) => {
  res.json({ message: "Admin access granted" });
});

module.exports = router;
