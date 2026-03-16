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
  sendPasswordChangedAlertEmail,
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
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const EMAIL_ERROR_MESSAGE = "Failed to send verification email. Please try again later.";
const PASSWORD_POLICY_MESSAGE = "Password must be at least 8 characters and include uppercase, lowercase, number, and special character (@$!%*?&)";

const isStrongPassword = (password) => User.isStrongPassword(password);

const buildErrorMessage = (error) => {
  if (error?.isEmailError) {
    return error.publicMessage || EMAIL_ERROR_MESSAGE;
  }
  return error?.message || "Internal server error";
};

const issueAuthPayload = (user) => {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  return {
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  };
};

const getOtpCooldownState = (user) => {
  const last = user?.otpLastSentAt ? new Date(user.otpLastSentAt).getTime() : 0;
  const elapsed = Date.now() - last;
  const retryAfterMs = OTP_RESEND_COOLDOWN_MS - elapsed;
  return {
    isCoolingDown: last > 0 && retryAfterMs > 0,
    retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
  };
};

const sendVerificationOtpToUser = async (user, { enforceCooldown = false } = {}) => {
  if (enforceCooldown) {
    const { isCoolingDown, retryAfterSeconds } = getOtpCooldownState(user);
    if (isCoolingDown) {
      const err = new Error(`Please wait ${retryAfterSeconds}s before requesting another OTP.`);
      err.statusCode = 429;
      err.retryAfterSeconds = retryAfterSeconds;
      throw err;
    }
  }

  const otp = generateOtp();
  user.otp = await bcrypt.hash(otp, 10);
  user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  user.otpLastSentAt = new Date();
  await user.save();
  await sendVerificationOtpEmail(user.email, user.name, otp);
};

const sendLoginOtpToUser = async (user, { enforceCooldown = false } = {}) => {
  if (enforceCooldown) {
    const { isCoolingDown, retryAfterSeconds } = getOtpCooldownState(user);
    if (isCoolingDown) {
      const err = new Error(`Please wait ${retryAfterSeconds}s before requesting another OTP.`);
      err.statusCode = 429;
      err.retryAfterSeconds = retryAfterSeconds;
      throw err;
    }
  }

  const otp = generateOtp();
  user.otp = await bcrypt.hash(otp, 10);
  user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  user.otpLastSentAt = new Date();
  await user.save();
  await sendLoginOtpEmail(user.email, otp);
};

const sendResetOtpToUser = async (user, { enforceCooldown = false } = {}) => {
  if (enforceCooldown) {
    const { isCoolingDown, retryAfterSeconds } = getOtpCooldownState(user);
    if (isCoolingDown) {
      const err = new Error(`Please wait ${retryAfterSeconds}s before requesting another OTP.`);
      err.statusCode = 429;
      err.retryAfterSeconds = retryAfterSeconds;
      throw err;
    }
  }

  const otp = generateOtp();
  user.otp = await bcrypt.hash(otp, 10);
  user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  user.otpLastSentAt = new Date();
  user.resetToken = null;
  user.resetTokenExpiry = null;
  await user.save();
  await sendOtpEmail(user.email, otp, "reset");
};

// REGISTER
exports.register = async (req, res) => {
  try {
    const { firstName, middleInitial, lastName, name, email, password } = req.body;

    // Support both structured names and legacy single-name field
    const resolvedFirstName = String(firstName || "").trim();
    const resolvedLastName = String(lastName || "").trim();
    const resolvedMiddleInitial = String(middleInitial || "").trim();

    // Build composite name: prefer structured fields, fall back to legacy name
    const compositeName = resolvedFirstName && resolvedLastName
      ? `${resolvedFirstName}${resolvedMiddleInitial ? " " + resolvedMiddleInitial + "." : ""} ${resolvedLastName}`
      : String(name || "").trim();

    if (!compositeName || compositeName.length < 2) {
      return res.status(400).json({ message: "First name and last name are required" });
    }

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 12);

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    const user = await User.create({
      name: compositeName,
      firstName: resolvedFirstName,
      middleInitial: resolvedMiddleInitial,
      lastName: resolvedLastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      isVerified: false,
      otp: hashedOtp,
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    });

    await sendVerificationOtpEmail(user.email, user.name, otp);

    logAudit({ userId: user._id, action: "account_created", details: { role: user.role, method: "self_register" } });

    res.status(201).json({ requireVerification: true, email: user.email, message: "Account created! Please check your email for the verification OTP." });
  } catch (error) {
    res.status(500).json({ message: buildErrorMessage(error) });
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
      return res.json({
        message: "Email verified successfully!",
        ...issueAuthPayload(user),
      });
    }

    // OTP-based verification
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.otp || !user.otpExpiry) {
      return res.status(400).json({ message: "Invalid or expired OTP. Please request a new one." });
    }

    if (user.isVerified) {
      return res.json({
        message: "Email is already verified.",
        ...issueAuthPayload(user),
      });
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

    res.json({
      message: "Email verified successfully!",
      ...issueAuthPayload(user),
    });
  } catch (error) {
    res.status(500).json({ message: buildErrorMessage(error) });
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

    await sendVerificationOtpToUser(user, { enforceCooldown: true });

    res.json({ message: "A new verification OTP has been sent to your email." });
  } catch (error) {
    if (error?.statusCode === 429) {
      return res.status(429).json({ message: error.message, retryAfterSeconds: error.retryAfterSeconds });
    }
    res.status(500).json({ message: buildErrorMessage(error) });
  }
};

exports.resendLoginOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const clientIp = getClientIp(req);

    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(200).json({ message: "If that account exists, a new OTP has been sent." });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated. Contact an administrator." });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your email first." });
    }

    await sendLoginOtpToUser(user, { enforceCooldown: true });

    logAudit({ userId: user._id, action: "login_otp_sent", details: { ip: clientIp, reason: "resend" }, ipAddress: clientIp });
    return res.status(200).json({ message: "A new login OTP has been sent." });
  } catch (error) {
    if (error?.statusCode === 429) {
      return res.status(429).json({ message: error.message, retryAfterSeconds: error.retryAfterSeconds });
    }
    return res.status(500).json({ message: buildErrorMessage(error) });
  }
};

// VERIFY EMAIL & SET PASSWORD (for admin-created users without a password)
exports.activateAccount = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "Token and new password are required" });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
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
    res.status(500).json({ message: buildErrorMessage(error) });
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
      await sendVerificationOtpToUser(user, { enforceCooldown: true });
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
    await sendLoginOtpToUser(user, { enforceCooldown: true });

    logAudit({ userId: user._id, action: "login_otp_sent", details: { ip: clientIp }, ipAddress: clientIp });

    return res.json({
      requireOtp: true,
      message: "A verification code has been sent to your email.",
    });
  } catch (error) {
    if (error?.statusCode === 429) {
      return res.status(429).json({ message: error.message, retryAfterSeconds: error.retryAfterSeconds });
    }
    res.status(500).json({ message: buildErrorMessage(error) });
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
    res.status(500).json({ message: buildErrorMessage(error) });
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
    res.status(500).json({ message: buildErrorMessage(error) });
  }
};

// UPDATE PROFILE (name & password)
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, middleInitial, lastName, name, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    let updated = false;

    // Update name - support both structured and legacy fields
    const resolvedFirstName = String(firstName || "").trim();
    const resolvedLastName = String(lastName || "").trim();
    const resolvedMiddleInitial = String(middleInitial || "").trim();

    if (resolvedFirstName && resolvedLastName) {
      user.firstName = resolvedFirstName;
      user.middleInitial = resolvedMiddleInitial;
      user.lastName = resolvedLastName;
      user.name = `${resolvedFirstName}${resolvedMiddleInitial ? " " + resolvedMiddleInitial + "." : ""} ${resolvedLastName}`;
      updated = true;
    } else if (name && String(name).trim().length >= 2) {
      user.name = String(name).trim();
      updated = true;
    }

    // Update password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required to set a new password" });
      }
      if (!isStrongPassword(newPassword)) {
        return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      user.password = await bcrypt.hash(newPassword, 12);
      updated = true;
      logAudit({ userId: user._id, action: "password_changed", details: { method: "profile" } });
      await sendPasswordChangedAlertEmail(user.email, user.name, "self-service change");
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
    res.status(500).json({ message: buildErrorMessage(error) });
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

    await sendResetOtpToUser(user, { enforceCooldown: true });
    logAudit({ userId: user._id, action: "password_reset_requested", details: { email: user.email } });

    res.status(200).json({ message: "If that account exists, an OTP has been sent." });
  } catch (error) {
    if (error?.statusCode === 429) {
      return res.status(429).json({ message: error.message, retryAfterSeconds: error.retryAfterSeconds });
    }
    res.status(500).json({ message: buildErrorMessage(error) });
  }
};

exports.resendResetOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(200).json({ message: "If that account exists, an OTP has been sent." });
    }

    await sendResetOtpToUser(user, { enforceCooldown: true });
    logAudit({ userId: user._id, action: "password_reset_requested", details: { email: user.email, reason: "resend" } });
    return res.status(200).json({ message: "A new password reset OTP has been sent." });
  } catch (error) {
    if (error?.statusCode === 429) {
      return res.status(429).json({ message: error.message, retryAfterSeconds: error.retryAfterSeconds });
    }
    return res.status(500).json({ message: buildErrorMessage(error) });
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
    res.status(500).json({ message: buildErrorMessage(error) });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword)
      return res.status(400).json({ message: "Email, reset token, and new password are required" });

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
    }

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
    await sendPasswordChangedAlertEmail(user.email, user.name, "account recovery reset");

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: buildErrorMessage(error) });
  }
};

// ADMIN: Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password -otp -otpExpiry -otpLastSentAt -resetToken -resetTokenExpiry -verificationToken -trustedDevices")
      .sort({ createdAt: -1 })
      .lean();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: buildErrorMessage(error) });
  }
};

// ADMIN: Create user (with verification email)
exports.adminCreateUser = async (req, res) => {
  try {
    const { name, email, role, password } = req.body;

    if (!name || !email || !password) return res.status(400).json({ message: "Name, email, role, and temporary password are required" });
    if (!["student", "admin", "staff"].includes(role))
      return res.status(400).json({ message: "Invalid role" });
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
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
    await sendWelcomeEmail(user.email, user.name, password);

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
    res.status(500).json({ message: buildErrorMessage(error) });
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
    res.status(500).json({ message: buildErrorMessage(error) });
  }
};

// ADMIN: Edit user details and role
exports.adminUpdateUser = async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const updates = {};

    if (name !== undefined) {
      const trimmedName = String(name || "").trim();
      if (trimmedName.length < 2) {
        return res.status(400).json({ message: "Name must be at least 2 characters" });
      }
      updates.name = trimmedName;
    }

    if (email !== undefined) {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      if (!normalizedEmail) return res.status(400).json({ message: "Email is required" });
      const duplicate = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (duplicate) return res.status(400).json({ message: "Another user already uses this email" });
      updates.email = normalizedEmail;
    }

    if (role !== undefined) {
      if (![
        "student",
        "staff",
        "admin",
      ].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      updates.role = role;
    }

    if (isActive !== undefined) {
      if (String(user._id) === String(req.user.id) && isActive === false) {
        return res.status(400).json({ message: "You cannot deactivate your own account" });
      }
      updates.isActive = Boolean(isActive);
    }

    Object.assign(user, updates);
    await user.save();

    logAudit({
      userId: req.user.id,
      action: "user_updated",
      resourceType: "user",
      resourceId: String(user._id),
      details: { fields: Object.keys(updates), targetEmail: user.email },
    });

    return res.json({
      message: "User updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: buildErrorMessage(error) });
  }
};

// ADMIN: Permanently delete user
exports.adminDeleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (String(user._id) === String(req.user.id)) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    await User.deleteOne({ _id: user._id });

    logAudit({
      userId: req.user.id,
      action: "user_deleted",
      resourceType: "user",
      resourceId: String(user._id),
      details: { targetEmail: user.email },
    });

    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: buildErrorMessage(error) });
  }
};

// ADMIN: Reset password with admin-defined temporary password
exports.adminResetUserPassword = async (req, res) => {
  try {
    const { temporaryPassword } = req.body;
    if (!isStrongPassword(temporaryPassword)) {
      return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(temporaryPassword, 12);
    user.isVerified = false;
    user.otp = null;
    user.otpExpiry = null;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    user.trustedDevices = [];
    await user.save();

    await sendVerificationOtpToUser(user);
    await sendWelcomeEmail(user.email, user.name, temporaryPassword);
    await sendPasswordChangedAlertEmail(user.email, user.name, "admin temporary reset");

    logAudit({
      userId: req.user.id,
      action: "password_reset_triggered_by_admin",
      resourceType: "user",
      resourceId: String(user._id),
      details: { targetEmail: user.email, forcedReverify: true },
    });

    return res.json({ message: `Temporary password set. Security alerts sent to ${user.email}.` });
  } catch (error) {
    return res.status(500).json({ message: buildErrorMessage(error) });
  }
};
