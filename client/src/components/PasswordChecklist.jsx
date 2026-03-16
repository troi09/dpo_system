import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getPasswordChecks } from "../utils/passwordPolicy";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function PasswordChecklist({
  password,
  compact = false,
  popup = false,
  side = "left",
  anchorRef,
}) {
  const checks = getPasswordChecks(password);
  const [portalStyle, setPortalStyle] = useState(null);
  const failedChecks = checks.filter((item) => !item.pass);

  useIsoLayoutEffect(() => {
    if (!popup || !password || failedChecks.length === 0 || !anchorRef?.current) return undefined;

    const recompute = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth <= 900;
      const popupWidth = Math.min(isMobile ? 280 : 220, Math.floor(window.innerWidth * (isMobile ? 0.9 : 0.72)));
      const gap = 10;

      if (isMobile || side === "top") {
        setPortalStyle({
          position: "fixed",
          top: Math.max(8, rect.top - gap - 10),
          left: Math.max(8, Math.min(rect.left, window.innerWidth - popupWidth - 8)),
          width: `${popupWidth}px`,
          transform: "translateY(-100%)",
          zIndex: 9999,
        });
        return;
      }

      if (side === "right") {
        setPortalStyle({
          position: "fixed",
          top: rect.top + rect.height / 2,
          left: Math.min(rect.right + gap, window.innerWidth - popupWidth - 8),
          width: `${popupWidth}px`,
          transform: "translateY(-50%)",
          zIndex: 9999,
        });
        return;
      }

      setPortalStyle({
        position: "fixed",
        top: rect.top + rect.height / 2,
        left: Math.max(8, rect.left - popupWidth - gap),
        width: `${popupWidth}px`,
        transform: "translateY(-50%)",
        zIndex: 9999,
      });
    };

    recompute();
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);

    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
  }, [anchorRef, failedChecks.length, password, popup, side]);

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
    if (!password || failedChecks.length === 0) return null;

    const popupContent = (
      <div
        className={`password-checklist password-checklist--popup password-checklist--${side}`}
        role="status"
        aria-live="polite"
        style={portalStyle || undefined}
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

    if (typeof document !== "undefined") {
      return createPortal(popupContent, document.body);
    }

    return popupContent;
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
