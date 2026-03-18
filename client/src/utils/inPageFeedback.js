const NOTIFY_EVENT = "dpo:notify";
const CONFIRM_EVENT = "dpo:confirm";

const STATUS_LABELS = {
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
