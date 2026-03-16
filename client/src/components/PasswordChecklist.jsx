import { getPasswordChecks } from "../utils/passwordPolicy";

export default function PasswordChecklist({
  password,
  compact = false,
  popup = false,
  side = "left",
}) {
  const checks = getPasswordChecks(password);

  if (compact) {
    const isStrong = checks.every((item) => item.pass);
    return (
      <div
        className={`password-checklist-item ${isStrong ? "is-pass" : "is-fail"}`}
        role="status"
        aria-live="polite"
        style={{ marginTop: 6 }}
      >
        <span className="password-checklist-dot" aria-hidden="true" />
        <span>
          {isStrong
            ? "Password strength requirement met"
            : "Use 8+ chars with uppercase, lowercase, number, and symbol"}
        </span>
      </div>
    );
  }

  if (popup) {
    const failedChecks = checks.filter((item) => !item.pass);
    if (!password || failedChecks.length === 0) return null;

    return (
      <div
        className={`password-checklist password-checklist--popup password-checklist--${side}`}
        role="status"
        aria-live="polite"
      >
        <div className="password-checklist-popup-title">Password needs:</div>
        {failedChecks.map((item) => (
          <div key={item.key} className="password-checklist-item is-fail">
            <span className="password-checklist-dot" aria-hidden="true" />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="password-checklist" role="status" aria-live="polite">
      {checks.map((item) => (
        <div key={item.key} className={`password-checklist-item ${item.pass ? "is-pass" : "is-fail"}`}>
          <span className="password-checklist-dot" aria-hidden="true" />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
