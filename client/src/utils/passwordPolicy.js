export const PASSWORD_POLICY_MESSAGE =
  "Minimum 8 chars, with uppercase, lowercase, number, and at least one special character";

export const getPasswordChecks = (value = "") => {
  const p = String(value || "");
  return [
    { key: "length",  label: "At least 8 characters",          pass: p.length >= 8 },
    { key: "upper",   label: "At least 1 uppercase letter",     pass: /[A-Z]/.test(p) },
    { key: "lower",   label: "At least 1 lowercase letter",     pass: /[a-z]/.test(p) },
    { key: "number",  label: "At least 1 number",               pass: /[0-9]/.test(p) },
    { key: "symbol",  label: "At least 1 special character",    pass: /[^A-Za-z0-9]/.test(p) },
  ];
};

export const isStrongPassword = (value = "") => {
  const p = String(value || "");
  return (
    p.length >= 8 &&
    /[A-Z]/.test(p) &&
    /[a-z]/.test(p) &&
    /[0-9]/.test(p) &&
    /[^A-Za-z0-9]/.test(p)
  );
};
