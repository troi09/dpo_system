const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send a generic email. Returns a promise.
 */
const sendMail = ({ to, subject, html }) =>
  transporter.sendMail({
    from: `"RTU DPO Portal" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });

/**
 * Send a 6-digit OTP for login verification or password reset.
 */
exports.sendOtpEmail = (email, otp, purpose = "login") => {
  const label = purpose === "reset" ? "Password Reset" : "Login Verification";
  return sendMail({
    to: email,
    subject: `RTU DPO Portal – Your ${label} OTP`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:#0f2d6b;padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:18px">RTU Data Protection Office</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#0f172a;font-size:15px;margin-top:0">Your <strong>${label} OTP</strong> is:</p>
          <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#0f2d6b;padding:16px 0">${otp}</div>
          <p style="color:#64748b;font-size:13px">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
          <p style="color:#94a3b8;font-size:12px;margin:0">If you did not request this, please ignore this email or contact your administrator.</p>
        </div>
      </div>`,
  });
};

/**
 * Send a password-reset link.
 */
exports.sendPasswordResetEmail = (email, resetUrl) =>
  sendMail({
    to: email,
    subject: "RTU DPO Portal – Password Reset Request",
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:#0f2d6b;padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:18px">RTU Data Protection Office</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#0f172a;font-size:15px;margin-top:0">We received a request to reset your password.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#0f2d6b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Reset Password</a>
          <p style="color:#64748b;font-size:13px;margin-top:20px">This link expires in <strong>1 hour</strong>. If you did not request this, ignore this email.</p>
        </div>
      </div>`,
  });

/**
 * Notify a user that their request status has changed.
 */
exports.sendStatusUpdateEmail = (email, name, requestType, newStatus, remarks) => {
  const statusLabels = {
    pending: "Pending Review",
    approved: "Approved",
    revision_requested: "Revision Requested",
    submitted: "Submitted",
    awaiting_signature: "Awaiting Representative Signature",
    pending_approval: "Pending Final Approval",
    completed: "Completed",
    declined: "Declined by Representative",
    rep_revision_requested: "Representative Revision Requested",
  };
  const label = statusLabels[newStatus] || newStatus;
  const remarksBlock = remarks
    ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-top:16px"><strong>Remarks:</strong><br>${remarks}</div>`
    : "";

  return sendMail({
    to: email,
    subject: `RTU DPO Portal – Your ${requestType.toUpperCase()} Request has been updated`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:#0f2d6b;padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:18px">RTU Data Protection Office</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#0f172a;font-size:15px;margin-top:0">Hi <strong>${name}</strong>,</p>
          <p style="color:#475569;font-size:14px">Your <strong>${requestType.toUpperCase()}</strong> request status has been updated to:</p>
          <div style="font-size:20px;font-weight:700;color:#0f2d6b;padding:8px 0">${label}</div>
          ${remarksBlock}
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">Log in to the RTU DPO Portal for more details.</p>
        </div>
      </div>`,
  });
};

/**
 * Send a welcome / account-created email with a temporary password.
 */
exports.sendWelcomeEmail = (email, name, tempPassword) =>
  sendMail({
    to: email,
    subject: "RTU DPO Portal – Your Account Has Been Created",
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:#0f2d6b;padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:18px">RTU Data Protection Office</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#0f172a;font-size:15px;margin-top:0">Hi <strong>${name}</strong>, your account has been created.</p>
          <p style="color:#475569;font-size:14px">Temporary password: <strong style="color:#0f2d6b">${tempPassword}</strong></p>
          <p style="color:#64748b;font-size:13px">Please log in and change your password immediately.</p>
        </div>
      </div>`,
  });
