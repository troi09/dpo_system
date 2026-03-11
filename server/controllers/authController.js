const crypto = require("crypto");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const AuditLog = require("../models/AuditLog");
const {
  sendOtpEmail,
  sendWelcomeEmail,
  sendLoginOtpEmail,
  sendVerificationOtpEmail,
} = require("../utils/emailService");

// Helper to safely log audit events without blocking the response
const logAudit = (data) => {
  AuditLog.create(data).catch(() => {});
};

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || req.ip || "";
};

const OTP_TRUST_WINDOW_MS = 72 * 60 * 60 * 1000; // 72 hours

const sendVerificationOtpToUser = async (user) => {
  const otp = generateOtp();
  user.otp = await bcrypt.hash(otp, 10);
  user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  sendVerificationOtpEmail(user.email, user.name, otp).catch((err) => {
    console.error("Verification OTP email failed:", err.message);
  });
};

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

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    const user = await User.create({
      name: String(name).trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      isVerified: false,
      otp: hashedOtp,
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    });

    sendVerificationOtpEmail(user.email, user.name, otp).catch((err) => {
      console.error("Registration verification OTP email error:", err.message);
    });

    logAudit({ userId: user._id, action: "account_created", details: { role: user.role, method: "self_register" } });

    res.status(201).json({ requireVerification: true, email: user.email, message: "Account created! Please check your email for the verification OTP." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// VERIFY EMAIL (OTP-based)
exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp, token } = req.body;

    // Support legacy token-based verification for existing links
    if (token) {
      const user = await User.findOne({
        verificationToken: token,
        verificationExpires: { $gt: new Date() },
      });
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification link. Please register again or contact an administrator." });
      }
      user.isVerified = true;
      user.verificationToken = null;
      user.verificationExpires = null;
      await user.save();
      logAudit({ userId: user._id, action: "email_verified", details: { email: user.email } });
      return res.json({ message: "Email verified successfully! You can now log in." });
    }

    // OTP-based verification
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.otp || !user.otpExpiry) {
      return res.status(400).json({ message: "Invalid or expired OTP. Please request a new one." });
    }

    if (user.isVerified) {
      return res.json({ message: "Email is already verified. You can log in." });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    const otpMatch = await bcrypt.compare(String(otp), user.otp);
    if (!otpMatch) return res.status(400).json({ message: "Invalid OTP" });

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    logAudit({ userId: user._id, action: "email_verified", details: { email: user.email } });

    res.json({ message: "Email verified successfully! You can now log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// RESEND VERIFICATION OTP
exports.resendVerificationOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal whether account exists
      return res.json({ message: "If that account exists, a new OTP has been sent." });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "This account is already verified. You can log in." });
    }

    const otp = generateOtp();
    user.otp = await bcrypt.hash(otp, 10);
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    sendVerificationOtpEmail(user.email, user.name, otp).catch((err) => {
      console.error("Resend verification OTP email error:", err.message);
    });

    res.json({ message: "A new verification OTP has been sent to your email." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// VERIFY EMAIL & SET PASSWORD (for admin-created users without a password)
exports.activateAccount = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "Token and new password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired activation link." });
    }

    user.password = await bcrypt.hash(password, 12);
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationExpires = null;
    await user.save();

    logAudit({ userId: user._id, action: "account_activated", details: { email: user.email } });

    res.json({ message: "Account activated! You can now log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// LOGIN — Step 1: credentials check + OTP challenge if needed
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIp = getClientIp(req);
    const userAgent = req.headers["user-agent"] || "";

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      logAudit({ action: "login_failed", details: { email: email.toLowerCase(), reason: "user_not_found" }, ipAddress: clientIp });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated. Contact an administrator." });
    }

    if (!user.isVerified) {
      await sendVerificationOtpToUser(user);
      logAudit({ userId: user._id, action: "verification_otp_sent", details: { reason: "login_intercept" }, ipAddress: clientIp });
      return res.status(403).json({
        requireVerification: true,
        email: user.email,
        message: "Your email is not verified yet. We sent a verification OTP to your email.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logAudit({ userId: user._id, action: "login_failed", details: { reason: "wrong_password" }, ipAddress: clientIp });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check if this device/IP is trusted and within 72h window
    const trustedDevice = user.trustedDevices.find((d) => d.ip === clientIp);
    const isWithinWindow = trustedDevice?.lastOtpVerifiedAt &&
      (Date.now() - trustedDevice.lastOtpVerifiedAt.getTime()) < OTP_TRUST_WINDOW_MS;

    if (trustedDevice && isWithinWindow) {
      // Device is trusted → issue token directly
      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "8h" }
      );

      logAudit({ userId: user._id, action: "login", details: { role: user.role, ip: clientIp }, ipAddress: clientIp });

      return res.json({
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
      });
    }

    // Device not trusted or expired → send OTP
    const otp = generateOtp();
    user.otp = await bcrypt.hash(otp, 10);
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    sendLoginOtpEmail(user.email, otp).catch((err) => {
      console.error("Login OTP email failed:", err.message);
    });

    logAudit({ userId: user._id, action: "login_otp_sent", details: { ip: clientIp }, ipAddress: clientIp });

    return res.json({
      requireOtp: true,
      message: "A verification code has been sent to your email.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// LOGIN — Step 2: verify login OTP
exports.verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const clientIp = getClientIp(req);
    const userAgent = req.headers["user-agent"] || "";

    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.otp || !user.otpExpiry) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP has expired. Please log in again." });
    }

    const otpMatch = await bcrypt.compare(String(otp), user.otp);
    if (!otpMatch) return res.status(400).json({ message: "Invalid OTP" });

    // Clear OTP
    user.otp = null;
    user.otpExpiry = null;

    // Trust this device
    const existingIdx = user.trustedDevices.findIndex((d) => d.ip === clientIp);
    const deviceEntry = {
      ip: clientIp,
      userAgent: userAgent.substring(0, 200),
      label: userAgent.substring(0, 60),
      lastOtpVerifiedAt: new Date(),
    };

    if (existingIdx >= 0) {
      user.trustedDevices[existingIdx] = deviceEntry;
    } else {
      // Keep max 10 trusted devices
      if (user.trustedDevices.length >= 10) {
        user.trustedDevices.sort((a, b) => (a.lastOtpVerifiedAt || 0) - (b.lastOtpVerifiedAt || 0));
        user.trustedDevices.shift();
      }
      user.trustedDevices.push(deviceEntry);
    }

    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    logAudit({ userId: user._id, action: "login", details: { role: user.role, ip: clientIp, method: "otp" }, ipAddress: clientIp });

    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// REFRESH TOKEN (for session extension)
exports.refreshToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("_id role name email");
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE PROFILE (name & password)
exports.updateProfile = async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    let updated = false;

    // Update name
    if (name && String(name).trim().length >= 2) {
      user.name = String(name).trim();
      updated = true;
    }

    // Update password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required to set a new password" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      user.password = await bcrypt.hash(newPassword, 12);
      updated = true;
      logAudit({ userId: user._id, action: "password_changed", details: { method: "profile" } });
    }

    if (!updated) {
      return res.status(400).json({ message: "No changes provided" });
    }

    await user.save();

    // Return updated user info (so frontend can update context)
    res.json({
      message: "Profile updated successfully",
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
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

    await sendOtpEmail(user.email, otp, "reset").catch((err) => {
      console.error("Forgot password OTP email error:", err.message);
    });
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
      .select("-password -otp -otpExpiry -resetToken -resetTokenExpiry -verificationToken -trustedDevices")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ADMIN: Create user (with verification email)
exports.adminCreateUser = async (req, res) => {
  try {
    const { name, email, role, password } = req.body;

    if (!name || !email || !password) return res.status(400).json({ message: "Name, email, role, and temporary password are required" });
    if (!["student", "admin", "staff"].includes(role))
      return res.status(400).json({ message: "Invalid role" });
    if (String(password).length < 8) {
      return res.status(400).json({ message: "Temporary password must be at least 8 characters" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: "User with this email already exists" });

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: String(name).trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "student",
      isVerified: false,
      verificationToken: null,
      verificationExpires: null,
    });

    await sendVerificationOtpToUser(user);
    sendWelcomeEmail(user.email, user.name, password).catch((err) => {
      console.error("Welcome email error:", err.message);
    });

    logAudit({
      userId: req.user.id,
      action: "account_created",
      resourceType: "user",
      resourceId: String(user._id),
      details: { createdBy: "admin", targetEmail: user.email, role: user.role, tempPasswordSet: true },
    });

    res.status(201).json({
      message: "User created. A temporary password and verification OTP were sent by email.",
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

    await sendOtpEmail(user.email, otp, "reset").catch((err) => {
      console.error("Admin trigger password reset OTP email error:", err.message);
    });
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