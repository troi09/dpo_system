const nodemailer = require("nodemailer");

const createTransport = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

/**
 * Send a generic email.
 */
const sendMail = async ({ to, subject, html }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[email] SMTP not configured – skipping email to:", to);
    return;
  }
  const transporter = createTransport();
  await transporter.sendMail({
    from: `"RTU DPO System" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
};

/**
 * Send a 6-digit OTP for login verification.
 */
const sendOtpEmail = (to, otp) =>
  sendMail({
    to,
    subject: "RTU DPO – Login OTP",
    html: `
      <p>Your one-time password (OTP) for RTU DPO login is:</p>
      <h2 style="letter-spacing:6px">${otp}</h2>
      <p>This code expires in <strong>10 minutes</strong>.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  });

/**
 * Send a password-reset link.
 */
const sendPasswordResetEmail = (to, resetLink) =>
  sendMail({
    to,
    subject: "RTU DPO – Password Reset",
    html: `
      <p>You requested a password reset for your RTU DPO account.</p>
      <p><a href="${resetLink}">Click here to reset your password</a></p>
      <p>This link expires in <strong>1 hour</strong>.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  });

/**
 * Notify user about a request status change.
 */
const sendStatusUpdateEmail = (to, { status, requestType, remarks }) => {
  const prettyStatus =
    status === "revision_required" ? "Revision Required" : status.charAt(0).toUpperCase() + status.slice(1);
  const prettyType =
    requestType === "nda" ? "NDA" : "General Agreement";

  return sendMail({
    to,
    subject: `RTU DPO – Your ${prettyType} Request has been ${prettyStatus}`,
    html: `
      <p>Dear Student/Staff,</p>
      <p>Your <strong>${prettyType}</strong> request has been updated to: <strong>${prettyStatus}</strong>.</p>
      ${remarks ? `<p><strong>Remarks:</strong> ${remarks}</p>` : ""}
      <p>Please log in to the RTU DPO System to view your request details.</p>
    `,
  });
};

module.exports = { sendOtpEmail, sendPasswordResetEmail, sendStatusUpdateEmail };
