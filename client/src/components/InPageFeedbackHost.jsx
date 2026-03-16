import { useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, CircleCheck, CircleX, Info } from "lucide-react";
import { FEEDBACK_EVENTS, inferFeedbackType, notify } from "../utils/inPageFeedback";

const TYPE_META = {
  success: {
    icon: CircleCheck,
    title: "Success",
  },
  error: {
    icon: CircleX,
    title: "Something went wrong",
  },
  warning: {
    icon: CircleAlert,
    title: "Action needed",
  },
  info: {
    icon: Info,
    title: "Notice",
  },
};

export default function InPageFeedbackHost() {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const nativeAlertRef = useRef(null);

  useEffect(() => {
    const onNotify = (event) => {
      const detail = event.detail || {};
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const toast = {
        id,
        type: detail.type || inferFeedbackType(detail.message),
        title: detail.title,
        message: detail.message || "",
        duration: typeof detail.duration === "number" ? detail.duration : 3800,
      };

      setToasts((prev) => {
        const next = [...prev, toast];
        return next.slice(-4);
      });

      if (toast.duration > 0) {
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((item) => item.id !== id));
        }, toast.duration);
      }
    };

    const onConfirm = (event) => {
      const detail = event.detail || {};
      setConfirmState({
        title: detail.title,
        message: detail.message,
        confirmText: detail.confirmText,
        cancelText: detail.cancelText,
        tone: detail.tone,
        resolve: detail.resolve,
      });
    };

    window.addEventListener(FEEDBACK_EVENTS.NOTIFY_EVENT, onNotify);
    window.addEventListener(FEEDBACK_EVENTS.CONFIRM_EVENT, onConfirm);

    nativeAlertRef.current = window.alert;
    window.alert = (message) => {
      notify(String(message ?? ""));
    };

    return () => {
      window.removeEventListener(FEEDBACK_EVENTS.NOTIFY_EVENT, onNotify);
      window.removeEventListener(FEEDBACK_EVENTS.CONFIRM_EVENT, onConfirm);
      if (nativeAlertRef.current) {
        window.alert = nativeAlertRef.current;
      }
    };
  }, []);

  const confirmMeta = useMemo(() => {
    const tone = confirmState?.tone || "warning";
    return TYPE_META[tone] || TYPE_META.warning;
  }, [confirmState]);
  const ConfirmIcon = confirmMeta.icon;

  const closeConfirm = (accepted) => {
    if (confirmState?.resolve) confirmState.resolve(Boolean(accepted));
    setConfirmState(null);
  };

  useEffect(() => {
    if (!confirmState) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeConfirm(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmState]);

  return (
    <>
      <div className="inpage-feedback-stack" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => {
          const meta = TYPE_META[toast.type] || TYPE_META.info;
          const Icon = meta.icon;
          return (
            <div key={toast.id} className={`inpage-toast inpage-toast--${toast.type}`}>
              <div className="inpage-toast-icon-wrap" aria-hidden="true">
                <Icon size={18} strokeWidth={2} />
              </div>
              <div className="inpage-toast-content">
                <div className="inpage-toast-title">{toast.title || meta.title}</div>
                <div className="inpage-toast-message">{toast.message}</div>
              </div>
              <button
                type="button"
                className="inpage-toast-close"
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {confirmState && (
        <div className="inpage-confirm-backdrop" role="presentation" onClick={() => closeConfirm(false)}>
          <div
            className="inpage-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="inpage-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`inpage-confirm-icon inpage-confirm-icon--${confirmState.tone || "warning"}`} aria-hidden="true">
              <ConfirmIcon size={22} strokeWidth={2} />
            </div>
            <h3 id="inpage-confirm-title" className="inpage-confirm-title">
              {confirmState.title || "Please confirm"}
            </h3>
            <p className="inpage-confirm-message">{confirmState.message}</p>
            <div className="inpage-confirm-actions">
              <button type="button" className="inpage-btn inpage-btn--ghost" onClick={() => closeConfirm(false)}>
                {confirmState.cancelText || "Cancel"}
              </button>
              <button type="button" className="inpage-btn inpage-btn--primary" onClick={() => closeConfirm(true)}>
                {confirmState.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
