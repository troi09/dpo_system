import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import {
  login as loginService,
  verifyOtp,
  register as registerService,
  forgotPassword,
} from "../services/authService";
import "../components/Landing.css";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/auth`;

// ── Modes: "login" | "register" | "otp" | "forgot" | "forgot-sent"
const Landing = () => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [pendingEmail, setPendingEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const onChange = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const resetToLogin = () => {
    setMode("login");
    setForm({ name: "", email: "", password: "" });
    setOtp("");
    setPendingEmail("");
    setForgotEmail("");
  };

  const handleLoginRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const data = await loginService(form.email, form.password);
        if (data.requiresOtp) {
          setPendingEmail(data.email);
          setMode("otp");
        }
        return;
      }

      // Register
      await registerService(form.name, form.email, form.password);
      alert("Registered successfully! Please log in.");
      setMode("login");
      setForm({ name: "", email: "", password: "" });
    } catch (err) {
      alert(
        err.response?.data?.message ||
          (mode === "login" ? "Invalid credentials" : "Registration failed")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await verifyOtp(pendingEmail, otp);
      login(data.user);
      navigate(data.user.role === "admin" ? "/admin" : "/student");
    } catch (err) {
      alert(err.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(forgotEmail);
      setMode("forgot-sent");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  // ── OTP Verification Screen
  if (mode === "otp") {
    return (
      <div className="landing">
        <div className="landing-panel">
          <form onSubmit={handleOtpVerify} className="landing-card">
            <h2 className="landing-title">Verify OTP</h2>
            <p style={{ color: "#4b5563", fontSize: 14, margin: "0 0 4px" }}>
              Enter the 6-digit code sent to<br />
              <strong>{pendingEmail}</strong>
            </p>
            <input
              type="text"
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength={6}
              className="landing-field"
              style={{ textAlign: "center", letterSpacing: "6px", fontSize: 20, fontWeight: 700 }}
            />
            <button type="submit" className="landing-submit" disabled={loading}>
              {loading ? "Verifying…" : "Verify OTP"}
            </button>
            <button
              type="button"
              onClick={resetToLogin}
              style={{ background: "none", border: "none", color: "#0f2d6b", cursor: "pointer", fontSize: 13 }}
            >
              ← Back to Login
            </button>
          </form>
        </div>
        <div className="landing-brand">
          <img src="/dpo-logo.png" alt="RTU DPO Logo" className="landing-brand-logo" />
          <div className="landing-brand-text">
            <div className="landing-brand-title">Data Protection Office</div>
            <div className="landing-brand-subtitle">Rizal Technological University</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Forgot Password Screen
  if (mode === "forgot") {
    return (
      <div className="landing">
        <div className="landing-panel">
          <form onSubmit={handleForgotPassword} className="landing-card">
            <h2 className="landing-title">Forgot Password</h2>
            <p style={{ color: "#4b5563", fontSize: 14, margin: "0 0 4px" }}>
              Enter your email and we'll send a reset link.
            </p>
            <input
              type="email"
              placeholder="Email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
              className="landing-field"
            />
            <button type="submit" className="landing-submit" disabled={loading}>
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
            <button
              type="button"
              onClick={resetToLogin}
              style={{ background: "none", border: "none", color: "#0f2d6b", cursor: "pointer", fontSize: 13 }}
            >
              ← Back to Login
            </button>
          </form>
        </div>
        <div className="landing-brand">
          <img src="/dpo-logo.png" alt="RTU DPO Logo" className="landing-brand-logo" />
          <div className="landing-brand-text">
            <div className="landing-brand-title">Data Protection Office</div>
            <div className="landing-brand-subtitle">Rizal Technological University</div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "forgot-sent") {
    return (
      <div className="landing">
        <div className="landing-panel">
          <div className="landing-card">
            <h2 className="landing-title">Check Your Email</h2>
            <p style={{ color: "#4b5563", fontSize: 14 }}>
              If <strong>{forgotEmail}</strong> is registered, a password reset link has been sent.
            </p>
            <button type="button" className="landing-submit" onClick={resetToLogin}>
              Back to Login
            </button>
          </div>
        </div>
        <div className="landing-brand">
          <img src="/dpo-logo.png" alt="RTU DPO Logo" className="landing-brand-logo" />
          <div className="landing-brand-text">
            <div className="landing-brand-title">Data Protection Office</div>
            <div className="landing-brand-subtitle">Rizal Technological University</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Default Login / Register Screen
  return (
    <div className="landing">
      <div className="landing-panel">
        <div className="landing-toggle">
          <button
            type="button"
            className={`landing-toggle-btn ${isLogin ? "active" : ""}`}
            onClick={() => { setMode("login"); setForm({ name: "", email: "", password: "" }); }}
          >
            Login
          </button>
          <button
            type="button"
            className={`landing-toggle-btn ${!isLogin ? "active" : ""}`}
            onClick={() => { setMode("register"); setForm({ name: "", email: "", password: "" }); }}
          >
            Register
          </button>
          <div className={`landing-toggle-indicator ${isLogin ? "left" : "right"}`} />
        </div>

        <form onSubmit={handleLoginRegister} className="landing-card">
          <h2 className="landing-title">{isLogin ? "Log in" : "Create an Account"}</h2>

          <div className={`landing-name-row ${isLogin ? "hidden" : ""}`}>
            <input
              type="text"
              placeholder="Full Name"
              value={form.name}
              onChange={onChange("name")}
              required={!isLogin}
              className="landing-field"
            />
          </div>

          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={onChange("email")}
            required
            className="landing-field"
          />

          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={onChange("password")}
            required
            className="landing-field"
          />

          {isLogin && (
            <button
              type="button"
              onClick={() => setMode("forgot")}
              style={{
                alignSelf: "flex-end",
                background: "none",
                border: "none",
                color: "#0f2d6b",
                cursor: "pointer",
                fontSize: 13,
                marginTop: -8,
                padding: 0,
                textDecoration: "underline",
              }}
            >
              Forgot Password?
            </button>
          )}

          <button type="submit" className="landing-submit" disabled={loading}>
            {loading ? "Please wait…" : isLogin ? "Log in" : "Create an Account"}
          </button>
        </form>
      </div>

      <div className="landing-brand">
        <img src="/dpo-logo.png" alt="RTU DPO Logo" className="landing-brand-logo" />
        <div className="landing-brand-text">
          <div className="landing-brand-title">Data Protection Office</div>
          <div className="landing-brand-subtitle">Rizal Technological University</div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
