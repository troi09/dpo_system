import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../services/authService";
import "../components/Landing.css";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      alert("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      alert("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      alert(err.response?.data?.message || "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="landing">
        <div className="landing-panel">
          <div className="landing-card">
            <h2 className="landing-title">Invalid Link</h2>
            <p style={{ color: "#4b5563", fontSize: 14 }}>
              This password reset link is invalid or has expired.
            </p>
            <button className="landing-submit" onClick={() => navigate("/")}>
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="landing">
        <div className="landing-panel">
          <div className="landing-card">
            <h2 className="landing-title">Password Reset!</h2>
            <p style={{ color: "#4b5563", fontSize: 14 }}>
              Your password has been updated successfully.
            </p>
            <button className="landing-submit" onClick={() => navigate("/")}>
              Log in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="landing">
      <div className="landing-panel">
        <form onSubmit={handleSubmit} className="landing-card">
          <h2 className="landing-title">Set New Password</h2>
          <input
            type="password"
            placeholder="New Password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="landing-field"
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="landing-field"
          />
          <button type="submit" className="landing-submit" disabled={loading}>
            {loading ? "Updating…" : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
