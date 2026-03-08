const crypto = require("crypto");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const { logAudit } = require("../utils/auditLogger");
const { sendPasswordResetEmail } = require("../utils/emailService");

// GET all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password -otp -otpExpiry -resetToken -resetTokenExpiry")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST create a user (admin only)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: "Email already in use" });

    const allowedRoles = ["student", "staff", "admin"];
    const assignedRole = allowedRoles.includes(role) ? role : "student";

    const hashed = await bcrypt.hash(password, 12);
    const newUser = await User.create({
      name: String(name).trim(),
      email: email.toLowerCase(),
      password: hashed,
      role: assignedRole,
    });

    logAudit(
      req.user.id,
      "ACCOUNT_CREATED",
      `Admin created account for ${newUser.email} (${newUser.role})`
    );

    res.status(201).json({
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH deactivate / activate a user (admin only)
exports.setUserActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be a boolean" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent deactivating yourself
    if (String(user._id) === String(req.user.id)) {
      return res.status(400).json({ message: "You cannot deactivate your own account" });
    }

    user.isActive = isActive;
    await user.save();

    logAudit(
      req.user.id,
      isActive ? "ACCOUNT_ACTIVATED" : "ACCOUNT_DEACTIVATED",
      `${user.email} was ${isActive ? "activated" : "deactivated"}`
    );

    res.json({ message: `User ${isActive ? "activated" : "deactivated"}`, isActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST trigger password reset email (admin only)
exports.triggerPasswordReset = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    sendPasswordResetEmail(user.email, resetLink).catch((err) =>
      console.error("[admin trigger reset]", err.message)
    );

    logAudit(
      req.user.id,
      "PASSWORD_RESET_TRIGGERED",
      `Admin triggered password reset for ${user.email}`
    );

    res.json({ message: `Password reset email sent to ${user.email}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
