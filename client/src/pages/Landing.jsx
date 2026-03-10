import { useState, useContext, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import {
  login as loginService,
  verifyLoginOtp,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from "../services/authService";
import "../components/Landing.css";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/auth`;

// ── Forgot-password steps: "email" → "otp" → "newpass"
function ForgotPasswordFlow({ onCancel }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return setError("Please enter your email address.");
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!otp.trim()) return setError("Please enter the OTP.");
    setLoading(true);
    try {
      const data = await verifyResetOtp(email.trim(), otp.trim());
      setResetToken(data.resetToken);
      setStep("newpass");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) return setError("Password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return setError("Passwords do not match.");
    setLoading(true);
    try {
      await resetPassword(email.trim(), resetToken, newPassword);
      alert("Password reset successfully! Please log in with your new password.");
      onCancel();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-card">
      <h2 className="landing-title">
        {step === "email" && "Forgot Password"}
        {step === "otp" && "Enter OTP"}
        {step === "newpass" && "New Password"}
      </h2>
      {step === "email" && (
        <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
            Enter your registered email and we&apos;ll send you an OTP.
          </p>
          {error && <div className="landing-error">{error}</div>}
          <div className="landing-field-group">
            <label className="landing-label">Email address</label>
            <input type="email" className="landing-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@rtu.edu.ph" required />
          </div>
          <button type="submit" className="landing-submit" disabled={loading}>
            {loading ? "Sending…" : "Send OTP"}
          </button>
          <button type="button" className="landing-link-btn" onClick={onCancel}>← Back to Login</button>
        </form>
      )}
      {step === "otp" && (
        <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
            A 6-digit OTP was sent to <strong>{email}</strong>. It expires in 10 minutes.
          </p>
          {error && <div className="landing-error">{error}</div>}
          <div className="landing-field-group">
            <label className="landing-label">OTP Code</label>
            <input type="text" className="landing-field" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" maxLength={6} required />
          </div>
          <button type="submit" className="landing-submit" disabled={loading}>
            {loading ? "Verifying…" : "Verify OTP"}
          </button>
          <button type="button" className="landing-link-btn" onClick={() => setStep("email")}>← Resend OTP</button>
        </form>
      )}
      {step === "newpass" && (
        <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <div className="landing-error">{error}</div>}
          <div className="landing-field-group">
            <label className="landing-label">New Password</label>
            <input type="password" className="landing-field" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" minLength={8} required />
          </div>
          <div className="landing-field-group">
            <label className="landing-label">Confirm Password</label>
            <input type="password" className="landing-field" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" className="landing-submit" disabled={loading}>
            {loading ? "Resetting…" : "Reset Password"}
          </button>
        </form>
      )}
    </div>
  );
}

const Landing = () => {
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Parallax state
  const bgRef = useRef(null);
  const handleMouseMove = useCallback((e) => {
    if (!bgRef.current) return;
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = ((clientX / innerWidth) - 0.5) * -20;
    const y = ((clientY / innerHeight) - 0.5) * -20;
    bgRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.05)`;
  }, []);

  // OTP step state (for context-aware login OTP)
  const [otpStep, setOtpStep] = useState(false);
  const [loginOtp, setLoginOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  const onChange = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const resetForm = () => {
    setForm({ name: "", email: "", password: "" });
    setError("");
    setSuccess("");
    setOtpStep(false);
    setLoginOtp("");
    setPendingEmail("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      if (mode === "login") {
        const data = await loginService(form.email, form.password);
        if (data.requireOtp) {
          setPendingEmail(form.email);
          setOtpStep(true);
          setLoading(false);
          return;
        }
        login(data.user);
        navigate(data.user.role === "admin" ? "/admin" : "/student");
        return;
      }
      const res = await axios.post(`${API_URL}/register`, {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      if (res.data.requireVerification) {
        navigate(`/verify-email?email=${encodeURIComponent(res.data.email)}`);
        return;
      }
      setSuccess(res.data.message || "Registered! Check your email to verify your account.");
      resetForm();
      setMode("login");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (mode === "login" ? "Invalid credentials" : "Registration failed")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLoginOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await verifyLoginOtp(pendingEmail, loginOtp.trim());
      login(data.user);
      navigate(data.user.role === "admin" ? "/admin" : "/student");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className="landing" onMouseMove={handleMouseMove}>
      <div
        ref={bgRef}
        className="landing-parallax-bg"
        style={{ backgroundImage: "url('/RTU-Background.jpg')" }}
      />
      <div className="landing-overlay" />
      <div className="landing-wrapper">
        {/* ── Brand Header (on blue background) ── */}
        <div className="landing-brand">
          <img src="/dpo-logo.png" alt="RTU DPO Logo" className="landing-brand-logo" />
          <div className="landing-brand-text">
            <div className="landing-brand-title">Data Protection Office</div>
            <div className="landing-brand-subtitle">Rizal Technological University</div>
          </div>
        </div>

        {/* ── White Form Panel ── */}
        <div className="landing-panel">
        {/* ── Form Area ── */}
        <AnimatePresence mode="wait">
          {/* Login OTP step */}
          {otpStep ? (
            <motion.div
              key="login-otp"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
              style={{ width: "100%", maxWidth: 380 }}
            >
              <form onSubmit={handleVerifyLoginOtp} className="landing-card">
                <h2 className="landing-title">Verify Your Identity</h2>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
                  A 6-digit OTP was sent to <strong>{pendingEmail}</strong>. Enter it below to continue.
                </p>
                {error && <div className="landing-error">{error}</div>}
                <div className="landing-field-group">
                  <label className="landing-label">OTP Code</label>
                  <input
                    type="text"
                    className="landing-field"
                    value={loginOtp}
                    onChange={(e) => setLoginOtp(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    autoFocus
                    required
                  />
                </div>
                <button type="submit" className="landing-submit" disabled={loading}>
                  {loading ? "Verifying…" : "Verify & Login"}
                </button>
                <button type="button" className="landing-link-btn" onClick={resetForm}>
                  ← Back to Login
                </button>
              </form>
            </motion.div>
          ) : mode === "forgot" ? (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
              style={{ width: "100%", maxWidth: 380 }}
            >
              <ForgotPasswordFlow onCancel={() => { setMode("login"); resetForm(); }} />
            </motion.div>
          ) : (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: "100%" }}
            >
              <div className="landing-toggle">
                <button
                  type="button"
                  className={`landing-toggle-btn ${isLogin ? "active" : ""}`}
                  onClick={() => { setMode("login"); resetForm(); }}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={`landing-toggle-btn ${!isLogin ? "active" : ""}`}
                  onClick={() => { setMode("register"); resetForm(); }}
                >
                  Register
                </button>
                <div className={`landing-toggle-indicator ${isLogin ? "left" : "right"}`} />
              </div>

              <form onSubmit={handleSubmit} className="landing-card">
                <h2 className="landing-title">{isLogin ? "Welcome back" : "Create an account"}</h2>

                {success && <div className="landing-success">{success}</div>}

                {!isLogin && (
                  <div className="landing-field-group">
                    <label className="landing-label" htmlFor="landing-name">Full Name</label>
                    <input
                      id="landing-name"
                      type="text"
                      placeholder="Juan Dela Cruz"
                      value={form.name}
                      onChange={onChange("name")}
                      required
                      className="landing-field"
                    />
                  </div>
                )}

                <div className="landing-field-group">
                  <label className="landing-label" htmlFor="landing-email">Email address</label>
                  <input
                    id="landing-email"
                    type="email"
                    placeholder="you@rtu.edu.ph"
                    value={form.email}
                    onChange={onChange("email")}
                    required
                    className="landing-field"
                  />
                </div>

                <div className="landing-field-group">
                  <label className="landing-label" htmlFor="landing-password">Password</label>
                  <div className="landing-password-wrap">
                    <input
                      id="landing-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={onChange("password")}
                      required
                      className="landing-field"
                    />
                    <button
                      type="button"
                      className="landing-password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && <div className="landing-error">{error}</div>}

                {isLogin && (
                  <button
                    type="button"
                    className="landing-link-btn"
                    style={{ textAlign: "right", marginTop: -6 }}
                    onClick={() => { setMode("forgot"); resetForm(); }}
                  >
                    Forgot password?
                  </button>
                )}

                <button type="submit" className="landing-submit" disabled={loading}>
                  {loading ? "Please wait…" : (isLogin ? "Log in" : "Create Account")}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Landing;
