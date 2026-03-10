import { useEffect, useState } from "react";

export default function SessionWarningModal({ onExtend }) {
  const [secondsLeft, setSecondsLeft] = useState(120);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#fff", borderRadius: 14, padding: "32px 36px",
        maxWidth: 400, width: "90%", textAlign: "center",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
        <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
          Session Expiring
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "#475569", lineHeight: 1.5 }}>
          Your session will expire in{" "}
          <strong style={{ color: "#dc2626" }}>
            {minutes}:{seconds.toString().padStart(2, "0")}
          </strong>{" "}
          due to inactivity.
        </p>
        <button
          onClick={onExtend}
          style={{
            padding: "10px 28px", borderRadius: 10, border: "none",
            background: "#0f2d6b", color: "#fff", fontSize: 14,
            fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Stay Logged In
        </button>
      </div>
    </div>
  );
}
