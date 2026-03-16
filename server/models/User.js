const mongoose = require("mongoose");

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])[A-Za-z\d\W]{8,}$/;

const trustedDeviceSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true },
    userAgent: { type: String, default: "" },
    label: { type: String, default: "" },
    lastOtpVerifiedAt: { type: Date, default: null },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  // Structured name fields (preferred)
  firstName: { type: String, trim: true, default: "" },
  middleInitial: { type: String, trim: true, default: "" },
  lastName: { type: String, trim: true, default: "" },
  // Legacy single-name field kept for backward compatibility
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["student", "admin", "staff"],
    default: "student",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Email verification
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String, default: null },
  verificationExpires: { type: Date, default: null },
  // OTP for login verification
  otp: { type: String, default: null },
  otpExpiry: { type: Date, default: null },
  otpLastSentAt: { type: Date, default: null },
  // Password reset
  resetToken: { type: String, default: null },
  resetTokenExpiry: { type: Date, default: null },
  // Trusted devices for context-aware OTP
  trustedDevices: { type: [trustedDeviceSchema], default: [] },
}, { timestamps: true });

userSchema.statics.isStrongPassword = (password) => PASSWORD_REGEX.test(String(password || ""));

userSchema.path("password").validate(function validatePasswordStrength(value) {
  const v = String(value || "");
  // Bcrypt hashes are already processed and should pass schema validation.
  if (v.startsWith("$2a$") || v.startsWith("$2b$") || v.startsWith("$2y$")) return true;
  return PASSWORD_REGEX.test(v);
}, "Password does not meet complexity policy");

// Query indexes for admin user management and role-based reporting views.
userSchema.index({ role: 1, isActive: 1, createdAt: -1 });
userSchema.index({ isVerified: 1, createdAt: -1 });

module.exports = mongoose.model("User", userSchema);
