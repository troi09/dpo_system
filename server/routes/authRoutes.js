
const express = require("express");
const router = express.Router();

const {
  register,
  login,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  getAllUsers,
  adminCreateUser,
  toggleUserActive,
  adminTriggerPasswordReset,
} = require("../controllers/authController");
const { protect, authorizeAdmin } = require("../middleware/authMiddleware");

// Public
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);

// Admin-only
router.get("/admin", protect, authorizeAdmin, (req, res) => {
  res.json({ message: "Admin access granted" });
});
router.get("/users", protect, authorizeAdmin, getAllUsers);
router.post("/users", protect, authorizeAdmin, adminCreateUser);
router.patch("/users/:id/toggle-active", protect, authorizeAdmin, toggleUserActive);
router.post("/users/:id/trigger-reset", protect, authorizeAdmin, adminTriggerPasswordReset);

module.exports = router;
