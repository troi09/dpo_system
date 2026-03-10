import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle } from "lucide-react";
import { verifyEmail, verifyEmailByToken, resendVerificationOtp } from "../services/authService";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const emailParam = params.get("email") || "";
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [status, setStatus] = useState(token ? "loading" : "form"); // "loading" | "form" | "success" | "error"
  const [message, setMessage] = useState("");

  // Legacy token-based auto-verification
  useEffect(() => {
    if (!token) return;
    verifyEmailByToken(token)
      .then((data) => {
        setStatus("success");
        setMessage(data.message || "Email verified successfully!");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.message || "Verification failed.");
      });
  }, [token]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    setMessage("");
    try {
      const data = await verifyEmail(emailParam, otp.trim());
      setStatus("success");
      setMessage(data.message || "Email verified successfully!");
    } catch (err) {
      setMessage(err.response?.data?.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setMessage("");
    try {
      const data = await resendVerificationOtp(emailParam);
      setMessage(data.message || "A new OTP has been sent.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  const containerStyle = {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "#f1f5f9", fontFamily: "'Inter', system-ui, sans-serif",
  };

  const cardStyle = {
    background: "#fff", borderRadius: 14, padding: "40px 36px",
    maxWidth: 420, width: "90%", textAlign: "center",
    boxShadow: "0 1px 3px rgba(15,23,42,0.06), 0 4px 12px rgba(15,23,42,0.06)",
    border: "1px solid #e2e8f0",
  };

  if (status === "loading") {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <p style={{ fontSize: 14, color: "#475569" }}>Verifying your email…</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <CheckCircle size={48} color="#16a34a" style={{ marginBottom: 12 }} />
          <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Email Verified!</h2>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "#475569" }}>{message}</p>
          <Link to="/" style={{
            display: "inline-block", padding: "10px 24px", borderRadius: 10,
            background: "#0f2d6b", color: "#fff", textDecoration: "none",
            fontWeight: 600, fontSize: 14,
          }}>Go to Login</Link>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <XCircle size={48} color="#dc2626" style={{ marginBottom: 12 }} />
          <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Verification Failed</h2>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "#475569" }}>{message}</p>
          <Link to="/" style={{
            display: "inline-block", padding: "10px 24px", borderRadius: 10,
            background: "#0f2d6b", color: "#fff", textDecoration: "none",
            fontWeight: 600, fontSize: 14,
          }}>Go to Login</Link>
        </div>
      </div>
    );
  }

  // OTP form
  return (
    <div style={containerStyle}>
      <div style={{ ...cardStyle, textAlign: "left" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "#0f172a", textAlign: "center" }}>
          Verify Your Email
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#475569", textAlign: "center" }}>
          A 6-digit OTP was sent to <strong>{emailParam}</strong>. Enter it below to activate your account.
        </p>
        {message && (
          <div style={{
            marginBottom: 14, padding: "8px 12px", borderRadius: 10,
            background: message.includes("sent") ? "#d1fae5" : "#fee2e2",
            color: message.includes("sent") ? "#065f46" : "#991b1b",
            border: `1px solid ${message.includes("sent") ? "#a7f3d0" : "#fca5a5"}`,
            fontSize: 13,
          }}>{message}</div>
        )}
        <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>OTP Code</label>
            <input
              type="text" value={otp} onChange={(e) => setOtp(e.target.value)}
              placeholder="123456" required maxLength={6} autoFocus
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                border: "1px solid #cbd5e1", fontSize: 18, fontFamily: "inherit",
                color: "#0f172a", boxSizing: "border-box", letterSpacing: "6px",
                textAlign: "center", fontWeight: 700,
              }}
            />
          </div>
          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "10px 16px", borderRadius: 10, border: "none",
            background: "#0f2d6b", color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
            opacity: loading ? 0.65 : 1, marginTop: 4,
          }}>
            {loading ? "Verifying…" : "Verify Email"}
          </button>
        </form>
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button
            type="button" onClick={handleResend} disabled={resending}
            style={{
              background: "none", border: "none", color: "#0f2d6b",
              fontSize: 13, fontWeight: 600, cursor: resending ? "not-allowed" : "pointer",
              fontFamily: "inherit", opacity: resending ? 0.65 : 1,
            }}
          >
            {resending ? "Resending…" : "Resend OTP"}
          </button>
          <span style={{ color: "#94a3b8", margin: "0 8px" }}>|</span>
          <Link to="/" style={{ color: "#0f2d6b", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
