const NOTIFY_EVENT = "dpo:notify";
const CONFIRM_EVENT = "dpo:confirm";

const STATUS_LABELS = {
  nda_submitted: "Submitted",
  nda_admin_reviewal: "Admin Review",
  nda_approved: "Approved",
  nda_revision_requested: "Revision Requested",
  agreement_submitted: "Submitted",
  agreement_initial_admin_reviewal: "Initial Admin Review",
  agreement_awaiting_rep_approval: "Awaiting Representative Approval",
  agreement_final_admin_reviewal: "Final Admin Review",
  agreement_approved: "Approved",
  agreement_rep_declined: "Declined by Representative",
  agreement_rep_revision_requested: "Representative Revision Requested",
};

const toTitleCase = (value) => String(value || "")
  .replace(/_/g, " ")
  .toLowerCase()
  .replace(/\b\w/g, (char) => char.toUpperCase());

const humanizeStatusCode = (status) => STATUS_LABELS[status] || toTitleCase(status);

export function normalizeFeedbackMessage(message = "") {
  const raw = String(message || "").trim();
  if (!raw) return "";

  const updatedMatch = raw.match(/^Updated to\s+([A-Za-z0-9_]+)$/i);
  if (updatedMatch) {
    return `Request status updated to ${humanizeStatusCode(updatedMatch[1])}.`;
  }

  const shortStatusMatch = raw.match(/^Request moved to\s+(.+)\.$/i);
  if (shortStatusMatch) {
    return `Request moved to ${shortStatusMatch[1]}.`;
  }

  if (/^Failed\b/i.test(raw)) {
    return raw.endsWith(".") ? raw : `${raw}.`;
  }

  if (/^Approved\b/i.test(raw) || /^Resubmitted\b/i.test(raw) || /^Copied!?$/i.test(raw)) {
    return raw.endsWith(".") ? raw : `${raw}.`;
  }

  return raw;
}

export function inferFeedbackType(message = "") {
  const text = String(message).toLowerCase();
  if (
    text.includes("fail")
    || text.includes("error")
    || text.includes("invalid")
    || text.includes("missing")
    || text.includes("declined")
  ) {
    return "error";
  }
  if (text.includes("warn") || text.includes("expired") || text.includes("required")) {
    return "warning";
  }
  if (
    text.includes("success")
    || text.includes("approved")
    || text.includes("submitted")
    || text.includes("copied")
    || text.includes("updated")
    || text.includes("generated")
  ) {
    return "success";
  }
  return "info";
}

export function notify(message, options = {}) {
  if (typeof window === "undefined") return;
  const normalizedMessage = normalizeFeedbackMessage(message);
  window.dispatchEvent(
    new CustomEvent(NOTIFY_EVENT, {
      detail: {
        message: normalizedMessage,
        type: options.type || inferFeedbackType(normalizedMessage),
        title: options.title,
        duration: options.duration,
      },
    })
  );
}

export function confirmInPage(options) {
  if (typeof window === "undefined") return Promise.resolve(false);
  const normalized = typeof options === "string" ? { message: options } : (options || {});

  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent(CONFIRM_EVENT, {
        detail: {
          title: normalized.title || "Please confirm",
          message: normalized.message || "Are you sure you want to continue?",
          confirmText: normalized.confirmText || "Confirm",
          cancelText: normalized.cancelText || "Cancel",
          tone: normalized.tone || "warning",
          resolve,
        },
      })
    );
  });
}

export const FEEDBACK_EVENTS = {
  NOTIFY_EVENT,
  CONFIRM_EVENT,
};
