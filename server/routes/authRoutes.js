
const express = require("express");
const router = express.Router();

const { register, login } = require("../controllers/authController");
const { protect, authorizeAdmin } = require("../middleware/authMiddleware");

// Public
router.post("/register", register);
router.post("/login", login);

// Admin-only test
router.get("/admin", protect, authorizeAdmin, (req, res) => {
  res.json({ message: "Admin access granted" });
});

module.exports = router;
