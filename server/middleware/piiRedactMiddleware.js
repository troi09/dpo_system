/**
 * PII Redaction Middleware
 * Strips Personally Identifiable Information (PII) before passing data to AI agents.
 * Per Phase 1 security requirements: names, emails, and specific student IDs must
 * be removed before any data is sent to an LLM or AI processing layer.
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?\d{1,3}[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}/g;
const STUDENT_ID_REGEX = /\b\d{4}[-\s]?\d{4,6}\b/g;

// Field names that are considered PII and should be redacted
const PII_FIELD_NAMES = [
  "name", "email", "studentid", "studentno", "phone", "mobile",
  "address", "fullname", "firstname", "lastname", "contactno",
];

/**
 * Checks if a field key is a PII field based on common naming conventions.
 */
const isPiiFieldName = (key) => {
  const lower = key.toLowerCase();
  return PII_FIELD_NAMES.some((pii) => lower.includes(pii));
};

/**
 * Recursively redact PII from a plain object or string.
 * - Known PII field names are replaced with "[REDACTED]"
 * - Email and phone patterns within string values are also replaced
 */
const redactPII = (data) => {
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    return data
      .replace(EMAIL_REGEX, "[EMAIL REDACTED]")
      .replace(PHONE_REGEX, "[PHONE REDACTED]")
      .replace(STUDENT_ID_REGEX, "[ID REDACTED]");
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactPII(item));
  }

  if (typeof data === "object") {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      if (isPiiFieldName(key)) {
        result[key] = "[REDACTED]";
      } else {
        result[key] = redactPII(value);
      }
    }
    return result;
  }

  return data;
};

/**
 * Express middleware that redacts PII from req.body before AI processing.
 * Attaches the redacted copy to req.redactedBody so controllers can use it.
 */
const piiRedactMiddleware = (req, res, next) => {
  req.redactedBody = redactPII(req.body);
  next();
};

module.exports = { piiRedactMiddleware, redactPII };
