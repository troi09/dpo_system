
const express = require("express");
const router = express.Router();

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
  getAllUsers,
  adminCreateUser,
  toggleUserActive,
  adminUpdateUser,
  adminDeleteUser,
  adminResetUserPassword,
} = require("../controllers/authController");
const { protect, authorizeAdmin } = require("../middleware/authMiddleware");

// Public
router.post("/register", register);
router.post("/login", login);
router.post("/verify-login-otp", verifyLoginOtp);
router.post("/resend-login-otp", resendLoginOtp);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification-otp", resendVerificationOtp);
router.post("/activate-account", activateAccount);
router.post("/forgot-password", forgotPassword);
router.post("/resend-reset-otp", resendResetOtp);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);

// Authenticated
router.post("/refresh-token", protect, refreshToken);
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
