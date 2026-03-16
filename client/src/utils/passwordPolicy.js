export const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])[A-Za-z\d\W]{8,}$/;

export const PASSWORD_POLICY_MESSAGE =
  "Minimum 8 chars, with uppercase, lowercase, number, and at least one special symbol";

export const getPasswordChecks = (value = "") => {
  const password = String(value || "");
  return [
    { key: "length", label: "At least 8 characters", pass: password.length >= 8 },
    { key: "upper", label: "At least one uppercase letter", pass: /[A-Z]/.test(password) },
    { key: "lower", label: "At least one lowercase letter", pass: /[a-z]/.test(password) },
    { key: "number", label: "At least one number", pass: /\d/.test(password) },
    { key: "symbol", label: "At least one special symbol (e.g. @$!%*?&#)", pass: /[^A-Za-z\d]/.test(password) },
  ];
};

export const isStrongPassword = (value = "") => PASSWORD_POLICY_REGEX.test(String(value || ""));
