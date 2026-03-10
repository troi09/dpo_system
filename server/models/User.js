const mongoose = require("mongoose");

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
  // Password reset
  resetToken: { type: String, default: null },
  resetTokenExpiry: { type: Date, default: null },
  // Trusted devices for context-aware OTP
  trustedDevices: { type: [trustedDeviceSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
