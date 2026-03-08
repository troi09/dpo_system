const crypto = require("crypto");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const AuditLog = require("../models/AuditLog");
const { sendOtpEmail, sendWelcomeEmail } = require("../utils/emailService");

// Helper to safely log audit events without blocking the response
const logAudit = (data) => {
  AuditLog.create(data).catch(() => {});
};

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// REGISTER
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (String(name).trim().length < 2) {
      return res.status(400).json({ message: "Name must be at least 2 characters" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: String(name).trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    logAudit({ userId: user._id, action: "account_created", details: { role: user.role, method: "self_register" } });

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      logAudit({ action: "login_failed", details: { email: email.toLowerCase(), reason: "user_not_found" } });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated. Contact an administrator." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logAudit({ userId: user._id, action: "login_failed", details: { reason: "wrong_password" } });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    logAudit({ userId: user._id, action: "login", details: { role: user.role } });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// FORGOT PASSWORD – sends OTP to email
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    // Always respond 200 to prevent email enumeration
    if (!user) return res.status(200).json({ message: "If that account exists, an OTP has been sent." });

    const otp = generateOtp();
    user.otp = await bcrypt.hash(otp, 10);
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    await sendOtpEmail(user.email, otp, "reset").catch(() => {});
    logAudit({ userId: user._id, action: "password_reset_requested", details: { email: user.email } });

    res.status(200).json({ message: "If that account exists, an OTP has been sent." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// VERIFY RESET OTP – returns a short-lived reset token
exports.verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.otp || !user.otpExpiry)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    if (user.otpExpiry < new Date())
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });

    const otpMatch = await bcrypt.compare(String(otp), user.otp);
    if (!otpMatch) return res.status(400).json({ message: "Invalid OTP" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = await bcrypt.hash(resetToken, 10);
    user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    res.json({ resetToken, message: "OTP verified" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword)
      return res.status(400).json({ message: "Email, reset token, and new password are required" });

    if (newPassword.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.resetToken || !user.resetTokenExpiry)
      return res.status(400).json({ message: "Invalid or expired reset token" });

    if (user.resetTokenExpiry < new Date())
      return res.status(400).json({ message: "Reset token has expired" });

    const tokenMatch = await bcrypt.compare(resetToken, user.resetToken);
    if (!tokenMatch) return res.status(400).json({ message: "Invalid reset token" });

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    logAudit({ userId: user._id, action: "password_changed", details: { method: "reset" } });

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ADMIN: Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password -otp -otpExpiry -resetToken -resetTokenExpiry")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ADMIN: Create user (with temp password emailed)
exports.adminCreateUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;

    if (!name || !email) return res.status(400).json({ message: "Name and email are required" });
    if (!["student", "admin", "staff"].includes(role))
      return res.status(400).json({ message: "Invalid role" });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: "User with this email already exists" });

    const tempPassword = crypto.randomBytes(6).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const user = await User.create({
      name: String(name).trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "student",
    });

    await sendWelcomeEmail(user.email, user.name, tempPassword).catch(() => {});
    logAudit({
      userId: req.user.id,
      action: "account_created",
      resourceType: "user",
      resourceId: String(user._id),
      details: { createdBy: "admin", targetEmail: user.email, role: user.role },
    });

    res.status(201).json({
      message: "User created. Temporary password sent to their email.",
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ADMIN: Toggle user active/inactive
exports.toggleUserActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password -otp -resetToken");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (String(user._id) === String(req.user.id))
      return res.status(400).json({ message: "You cannot deactivate your own account" });

    user.isActive = !user.isActive;
    await user.save();

    logAudit({
      userId: req.user.id,
      action: user.isActive ? "user_activated" : "user_deactivated",
      resourceType: "user",
      resourceId: String(user._id),
      details: { targetEmail: user.email },
    });

    res.json({ message: `User ${user.isActive ? "activated" : "deactivated"}`, isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ADMIN: Trigger password reset OTP for a specific user
exports.adminTriggerPasswordReset = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOtp();
    user.otp = await bcrypt.hash(otp, 10);
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOtpEmail(user.email, otp, "reset").catch(() => {});
    logAudit({
      userId: req.user.id,
      action: "password_reset_triggered_by_admin",
      resourceType: "user",
      resourceId: String(user._id),
      details: { targetEmail: user.email },
    });

    res.json({ message: `Password reset OTP sent to ${user.email}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};