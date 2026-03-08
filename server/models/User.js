const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["student", "staff", "admin"],
    default: "student",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // OTP for login verification
  otp: { type: String, default: null },
  otpExpiry: { type: Date, default: null },
  // Password reset
  resetToken: { type: String, default: null },
  resetTokenExpiry: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
