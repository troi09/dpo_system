const express = require("express");
const router = express.Router();
const { protect, authorizeAdmin } = require("../middleware/authMiddleware");
const {
  getAllUsers,
  createUser,
  setUserActive,
  triggerPasswordReset,
} = require("../controllers/userController");

router.get("/", protect, authorizeAdmin, getAllUsers);
router.post("/", protect, authorizeAdmin, createUser);
router.patch("/:id/active", protect, authorizeAdmin, setUserActive);
router.post("/:id/reset-password", protect, authorizeAdmin, triggerPasswordReset);

module.exports = router;
