const crypto = require("crypto");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { logAudit } = require("../utils/auditLogger");
const {
  sendOtpEmail,
  sendPasswordResetEmail,
} = require("../utils/emailService");

// ─── helpers ─────────────────────────────────────────────────────────────────

const generate6DigitOtp = () =>
  String(Math.floor(100000 + Math.random() * 900000));

// ─── REGISTER ────────────────────────────────────────────────────────────────

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    if (String(name).trim().length < 2) {
      return res
        .status(400)
        .json({ message: "Name must be at least 2 characters" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const allowedRoles = ["student", "staff", "admin"];
    const assignedRole = allowedRoles.includes(role) ? role : "student";

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      name: String(name).trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: assignedRole,
    });

    logAudit(
      newUser._id,
      "ACCOUNT_CREATED",
      `Account created for ${newUser.email} with role ${newUser.role}`
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── LOGIN ───────────────────────────────────────────────────────────────────

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });

    if (!user.isActive) {
      return res
        .status(403)
        .json({ message: "Account is deactivated. Contact the administrator." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid email or password" });

    // Generate OTP and send via email
    const otp = generate6DigitOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Fire-and-forget email; don't block login flow
    sendOtpEmail(user.email, otp).catch((err) =>
      console.error("[login otp]", err.message)
    );

    logAudit(user._id, "LOGIN_OTP_SENT", `OTP sent to ${user.email}`);

    res.json({
      message: "OTP sent to your email. Please verify to continue.",
      requiresOtp: true,
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── VERIFY OTP ──────────────────────────────────────────────────────────────

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.otp || !user.otpExpiry) {
      return res
        .status(400)
        .json({ message: "No pending OTP. Please login again." });
    }

    if (new Date() > user.otpExpiry) {
      user.otp = null;
      user.otpExpiry = null;
      await user.save();
      return res
        .status(400)
        .json({ message: "OTP has expired. Please login again." });
    }

    if (user.otp !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Clear OTP
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    logAudit(user._id, "USER_LOGIN", `${user.email} logged in successfully`);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── FORGOT PASSWORD ─────────────────────────────────────────────────────────

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always respond 200 to avoid user enumeration
    if (!user) {
      return res.json({
        message: "If that email exists, a reset link has been sent.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    sendPasswordResetEmail(user.email, resetLink).catch((err) =>
      console.error("[forgot password]", err.message)
    );

    logAudit(
      user._id,
      "PASSWORD_RESET_REQUESTED",
      `Password reset requested for ${user.email}`
    );

    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res
        .status(400)
        .json({ message: "Token and new password are required" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    logAudit(user._id, "PASSWORD_CHANGED", `Password changed for ${user.email}`);

    res.json({ message: "Password reset successfully. You may now log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
