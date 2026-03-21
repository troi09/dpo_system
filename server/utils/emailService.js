const SibApiV3Sdk = require("sib-api-v3-sdk");

const EMAIL_FAILURE_MESSAGE = "Failed to send verification email. Please try again later.";

class EmailDeliveryError extends Error {
  constructor(message, statusCode, details) {
    super(message || EMAIL_FAILURE_MESSAGE);
    this.name = "EmailDeliveryError";
    this.isEmailError = true;
    this.statusCode = statusCode || 500;
    this.publicMessage = EMAIL_FAILURE_MESSAGE;
    this.details = details || null;
  }
}

const getBrevoClient = () => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new EmailDeliveryError("Missing BREVO_API_KEY", 500);
  }

  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  defaultClient.authentications["api-key"].apiKey = apiKey;
  return new SibApiV3Sdk.TransactionalEmailsApi();
};

const getSender = () => {
  const email = process.env.BREVO_SENDER_EMAIL;
  const name = process.env.BREVO_SENDER_NAME || "RTU DPO Portal";

  if (!email) {
    throw new EmailDeliveryError("Missing BREVO_SENDER_EMAIL", 500);
  }

  return { email, name };
};

const normalizeRecipients = (to) => {
  if (!to) return [];

  if (Array.isArray(to)) {
    return to
      .filter(Boolean)
      .map((email) => ({ email: String(email).trim() }))
      .filter((recipient) => recipient.email.length > 0);
  }

  return [{ email: String(to).trim() }].filter((recipient) => recipient.email.length > 0);
};

const sendBrevoEmail = async ({ to, subject, htmlContent }) => {
  try {
    const client = getBrevoClient();
    const recipients = normalizeRecipients(to);
    if (!recipients.length) {
      throw new EmailDeliveryError("Recipient email is required", 400);
    }

    const payload = new SibApiV3Sdk.SendSmtpEmail();
    payload.sender = getSender();
    payload.to = recipients;
    payload.subject = subject;
    payload.htmlContent = htmlContent;

    return await client.sendTransacEmail(payload);
  } catch (error) {
    if (error?.isEmailError) {
      throw error;
    }

    const statusCode = error?.status || error?.response?.status || error?.response?.statusCode || 500;
    const details = error?.response?.body || error?.response?.data || error?.message || "Unknown Brevo error";
    const brevoMessage = typeof details === "string" ? details : JSON.stringify(details);

    console.error(`[Brevo] Email send failed (${statusCode}): ${brevoMessage}`);

    throw new EmailDeliveryError(`Brevo API request failed (${statusCode})`, statusCode, details);
  }
};

/**
 * Send a 6-digit OTP for login verification or password reset.
 */
exports.sendOtpEmail = (email, otp, purpose = "login") => {
  const label = purpose === "reset" ? "Password Reset" : purpose === "change" ? "Password Change" : "Login Verification";
  return sendBrevoEmail({
    to: email,
    subject: `RTU DPO Portal – Your ${label} OTP`,
    htmlContent: `
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
  sendBrevoEmail({
    to: email,
    subject: "RTU DPO Portal – Password Reset Request",
    htmlContent: `
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
    nda_pending: "Reviewal",
    nda_approved: "Approved",
    stud_revision_requested: "Student Revisions",
    agr_pending_1: "Initial Reviewal",
    agr_awaiting_rep_signature: "Recipient Reviewal",
    agr_pending_2: "Final Reviewal",
    agr_approved: "Approved",
    agr_declined: "Recipient Declined",
    agr_rep_revision_requested: "Recipient Revisions",
  };
  const label = statusLabels[newStatus] || newStatus;
  const remarksBlock = remarks
    ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-top:16px"><strong>Remarks:</strong><br>${remarks}</div>`
    : "";

  return sendBrevoEmail({
    to: email,
    subject: `RTU DPO Portal – Your ${requestType.toUpperCase()} Request has been updated`,
    htmlContent: `
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
  sendBrevoEmail({
    to: email,
    subject: "RTU DPO Portal – Your Account Has Been Created",
    htmlContent: `
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

/**
 * Send an email verification link.
 */
exports.sendVerificationEmail = (email, name, verifyUrl) =>
  sendBrevoEmail({
    to: email,
    subject: "RTU DPO Portal – Verify Your Email",
    htmlContent: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:#0f2d6b;padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:18px">RTU Data Protection Office</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#0f172a;font-size:15px;margin-top:0">Hi <strong>${name}</strong>,</p>
          <p style="color:#475569;font-size:14px">Please verify your email address to activate your account.</p>
          <a href="${verifyUrl}" style="display:inline-block;background:#0f2d6b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:8px 0 16px">Verify Email</a>
          <p style="color:#64748b;font-size:13px">This link expires in <strong>24 hours</strong>. If you did not create this account, please ignore this email.</p>
        </div>
      </div>`,
  });

/**
 * Send a welcome email with a verification/activation link (admin-created user, no password set).
 */
exports.sendWelcomeVerificationEmail = (email, name, activateUrl) =>
  sendBrevoEmail({
    to: email,
    subject: "RTU DPO Portal – Welcome! Activate Your Account",
    htmlContent: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:#0f2d6b;padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:18px">RTU Data Protection Office</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#0f172a;font-size:15px;margin-top:0">Hi <strong>${name}</strong>,</p>
          <p style="color:#475569;font-size:14px">An administrator has created an account for you at the RTU DPO Portal. Click the button below to verify your email and set your password.</p>
          <a href="${activateUrl}" style="display:inline-block;background:#0f2d6b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:8px 0 16px">Activate Account</a>
          <p style="color:#64748b;font-size:13px">This link expires in <strong>24 hours</strong>. If you did not expect this, please contact your administrator.</p>
        </div>
      </div>`,
  });

/**
 * Send a verification OTP email for new account registration.
 */
exports.sendVerificationOtpEmail = (email, name, otp) =>
  sendBrevoEmail({
    to: email,
    subject: "RTU DPO Portal \u2013 Verify Your Email",
    htmlContent: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:#0f2d6b;padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:18px">RTU Data Protection Office</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#0f172a;font-size:15px;margin-top:0">Hi <strong>${name}</strong>,</p>
          <p style="color:#475569;font-size:14px">Use the code below to verify your email address and activate your account.</p>
          <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#0f2d6b;padding:16px 0">${otp}</div>
          <p style="color:#64748b;font-size:13px">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
          <p style="color:#94a3b8;font-size:12px;margin:0">If you did not create this account, please ignore this email.</p>
        </div>
      </div>`,
  });

/**
 * Send a login OTP email for device/IP verification.
 */
exports.sendLoginOtpEmail = (email, otp) =>
  sendBrevoEmail({
    to: email,
    subject: "RTU DPO Portal – Login Verification OTP",
    htmlContent: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:#0f2d6b;padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:18px">RTU Data Protection Office</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#0f172a;font-size:15px;margin-top:0">A login attempt was made from an unrecognized device or location.</p>
          <p style="color:#475569;font-size:14px">Your verification code is:</p>
          <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#0f2d6b;padding:16px 0">${otp}</div>
          <p style="color:#64748b;font-size:13px">This code expires in <strong>10 minutes</strong>. If you did not attempt to log in, your password may be compromised — please reset it immediately.</p>
        </div>
      </div>`,
  });

exports.sendPasswordChangedAlertEmail = (email, name, reason = "account security event") =>
  sendBrevoEmail({
    to: email,
    subject: "RTU DPO Portal – Security Alert: Password Changed",
    htmlContent: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:#7f1d1d;padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:18px">Security Alert</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#0f172a;font-size:15px;margin-top:0">Hi <strong>${name || "User"}</strong>,</p>
          <p style="color:#475569;font-size:14px">Your account password was changed due to <strong>${reason}</strong>.</p>
          <p style="color:#475569;font-size:14px">If this was not you, reset your password immediately and contact the DPO office.</p>
          <p style="color:#94a3b8;font-size:12px;margin-top:18px">Timestamp: ${new Date().toISOString()}</p>
        </div>
      </div>
    `,
  });
exports.sendSigningLinkEmail = (repEmail, repName, requestorName, signingLink, expiresAt, isRevision = false) => {
  const expiryStr = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : "7 days";
  const subject = isRevision
    ? "RTU DPO Portal – Agreement Revision Required"
    : "RTU DPO Portal – Agreement Signing Request";
  const headerBg = isRevision ? "#92400e" : "#0f2d6b";
  const bodyText = isRevision
    ? `Your previously submitted agreement for the request by <strong>${requestorName || "an RTU student"}</strong> has been reviewed by the RTU Data Protection Office and requires revision. Please revisit and resubmit your response by clicking the link below:`
    : `You have been designated as the authorized representative for an agreement request submitted by <strong>${requestorName || "an RTU student"}</strong> to the Rizal Technological University Data Protection Office. Please review the agreement by clicking the link below:`;
  return sendBrevoEmail({
    to: repEmail,
    subject,
    htmlContent: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:${headerBg};padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:18px">RTU Data Protection Office</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#0f172a;font-size:15px;margin-top:0">Dear <strong>${repName || "Representative"}</strong>,</p>
          <p style="color:#475569;font-size:14px">${bodyText}</p>
          <div style="text-align:center;margin:28px 0">
            <a href="${signingLink}" style="background:${headerBg};color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">Continue</a>
          </div>
          <p style="color:#64748b;font-size:13px">This link is valid until <strong>${expiryStr}</strong> and can only be used once. Do not share it with anyone.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
          <p style="color:#94a3b8;font-size:12px;margin:0">If you were not expecting this email, please disregard it or contact the RTU Data Protection Office.</p>
        </div>
      </div>`,
  });
};

exports.sendAgreementApprovedEmail = (repEmail, repName, requestorName, documentUrl, verificationUrl) =>
  sendBrevoEmail({
    to: repEmail,
    subject: "RTU DPO Portal – Agreement Approved",
    htmlContent: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:#065f46;padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:18px">RTU Data Protection Office</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#0f172a;font-size:15px;margin-top:0">Dear <strong>${repName || "Representative"}</strong>,</p>
          <p style="color:#475569;font-size:14px">We are pleased to inform you that the agreement request submitted by <strong>${requestorName || "an RTU student"}</strong>, for which you served as the authorized representative, has been reviewed and <strong>officially approved</strong> by the RTU Data Protection Office.</p>
          <p style="color:#475569;font-size:14px">You may access and download the approved agreement document using the button below:</p>
          <div style="text-align:center;margin:28px 0">
            <a href="${documentUrl}" style="background:#065f46;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">View Approved Document</a>
          </div>
          ${verificationUrl ? `<p style="color:#64748b;font-size:13px;text-align:center">You may also verify document authenticity at: <a href="${verificationUrl}" style="color:#0f2d6b">${verificationUrl}</a></p>` : ""}
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
          <p style="color:#94a3b8;font-size:12px;margin:0">This is an automated notification from the RTU Data Protection Office. Please do not reply to this email.</p>
        </div>
      </div>`,
  });

exports.sendBrevoEmail = sendBrevoEmail;
exports.EmailDeliveryError = EmailDeliveryError;

