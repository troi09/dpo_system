
const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please try again later." },
});

const {
  register,
  login,
  verifyLoginOtp,
  resendLoginOtp,
  verifyEmail,
  resendVerificationOtp,
  activateAccount,
  forgotPassword,
  resendResetOtp,
  verifyResetOtp,
  resetPassword,
  refreshToken,
  updateProfile,
  requestPasswordChangeOtp,
  getAllUsers,
  adminCreateUser,
  toggleUserActive,
  adminUpdateUser,
  adminDeleteUser,
  adminResetUserPassword,
} = require("../controllers/authController");
const { protect, authorizeAdmin } = require("../middleware/authMiddleware");

// Public (rate-limited)
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/verify-login-otp", authLimiter, verifyLoginOtp);
router.post("/resend-login-otp", authLimiter, resendLoginOtp);
router.post("/verify-email", authLimiter, verifyEmail);
router.post("/resend-verification-otp", authLimiter, resendVerificationOtp);
router.post("/activate-account", authLimiter, activateAccount);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/resend-reset-otp", authLimiter, resendResetOtp);
router.post("/verify-reset-otp", authLimiter, verifyResetOtp);
router.post("/reset-password", authLimiter, resetPassword);

// Authenticated
router.post("/refresh-token", protect, refreshToken);
router.post("/request-password-change-otp", protect, requestPasswordChangeOtp);
router.patch("/profile", protect, updateProfile);

// Admin-only
router.get("/admin", protect, authorizeAdmin, (req, res) => {
  res.json({ message: "Admin access granted" });
});
router.get("/users", protect, authorizeAdmin, getAllUsers);
router.post("/users", protect, authorizeAdmin, adminCreateUser);
router.patch("/users/:id/toggle-active", protect, authorizeAdmin, toggleUserActive);
router.patch("/users/:id", protect, authorizeAdmin, adminUpdateUser);
router.delete("/users/:id", protect, authorizeAdmin, adminDeleteUser);
router.post("/users/:id/reset-password", protect, authorizeAdmin, adminResetUserPassword);

module.exports = router;
