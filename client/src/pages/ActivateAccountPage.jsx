import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle } from "lucide-react";
import { activateAccount } from "../services/authService";
import PasswordChecklist from "../components/PasswordChecklist";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "../utils/passwordPolicy";

export default function ActivateAccountPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordAttempted, setPasswordAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("form"); // "form" | "success" | "error"
  const [message, setMessage] = useState("");

  if (!token) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#f1f5f9", fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <div style={{
          background: "#fff", borderRadius: 14, padding: "40px 36px",
          maxWidth: 420, width: "90%", textAlign: "center",
          boxShadow: "0 1px 3px rgba(15,23,42,0.06), 0 4px 12px rgba(15,23,42,0.06)",
          border: "1px solid #e2e8f0",
        }}>
          <XCircle size={48} color="#dc2626" style={{ marginBottom: 12 }} />
          <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Invalid Link</h2>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "#475569" }}>Missing activation token.</p>
          <Link to="/" style={{
            display: "inline-block", padding: "10px 24px", borderRadius: 10,
            background: "#0f2d6b", color: "#fff", textDecoration: "none",
            fontWeight: 600, fontSize: 14,
          }}>Go to Login</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!isStrongPassword(password)) { setPasswordAttempted(true); setMessage(PASSWORD_POLICY_MESSAGE); return; }
    if (password !== confirmPassword) { setMessage("Passwords do not match."); return; }
    setLoading(true);
    try {
      const data = await activateAccount(token, password);
      setStatus("success");
      setMessage(data.message || "Account activated!");
    } catch (err) {
      setStatus("error");
      setMessage(err.response?.data?.message || "Activation failed.");
    } finally {
      setLoading(false);
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

  if (status === "success") {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <CheckCircle size={48} color="#16a34a" style={{ marginBottom: 12 }} />
          <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Account Activated!</h2>
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
          <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Activation Failed</h2>
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

  return (
    <div style={containerStyle}>
      <div style={{ ...cardStyle, textAlign: "left" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "#0f172a", textAlign: "center" }}>
          Set Your Password
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#475569", textAlign: "center" }}>
          Choose a secure password to activate your account.
        </p>
        {message && (
          <div style={{
            marginBottom: 14, padding: "8px 12px", borderRadius: 10,
            background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", fontSize: 13,
          }}>{message}</div>
        )}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>New Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required minLength={8}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                border: "1px solid #cbd5e1", fontSize: 14, fontFamily: "inherit",
                color: "#0f172a", boxSizing: "border-box",
              }}
            />
            {passwordAttempted ? <PasswordChecklist password={password} compact /> : null}
          </div>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Confirm Password</label>
            <input
              type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••" required
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                border: "1px solid #cbd5e1", fontSize: 14, fontFamily: "inherit",
                color: "#0f172a", boxSizing: "border-box",
              }}
            />
          </div>
          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "10px 16px", borderRadius: 10, border: "none",
            background: "#0f2d6b", color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
            opacity: loading ? 0.65 : 1, marginTop: 4,
          }}>
            {loading ? "Activating…" : "Activate Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
