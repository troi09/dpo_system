import { useState, useContext, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import {
  login as loginService,
  verifyLoginOtp,
  resendLoginOtp,
  forgotPassword,
  resendResetOtp,
  verifyResetOtp,
  resetPassword,
} from "../services/authService";
import PasswordChecklist from "../components/PasswordChecklist";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "../utils/passwordPolicy";
import { notify } from "../utils/inPageFeedback";
import "../components/Landing.css";
import "../components/FloatingLabel.css";

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
  const [resendSeconds, setResendSeconds] = useState(0);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const forgotPwRef = useRef(null);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) { notify("Please enter your email address.", { type: "error", title: "Failed" }); return; }
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setStep("otp");
      setResendSeconds(60);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to send OTP. Try again.", { type: "error", title: "Failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendSeconds > 0) return;
    setLoading(true);
    try {
      await resendResetOtp(email.trim());
      setResendSeconds(60);
      notify("OTP resent successfully.", { type: "success", title: "Sent" });
    } catch (err) {
      notify(err.response?.data?.message || "Failed to resend OTP.", { type: "error", title: "Failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) { notify("Please enter the OTP.", { type: "error", title: "Failed" }); return; }
    setLoading(true);
    try {
      const data = await verifyResetOtp(email.trim(), otp.trim());
      setResetToken(data.resetToken);
      setStep("newpass");
    } catch (err) {
      notify(err.response?.data?.message || "Invalid or expired OTP.", { type: "error", title: "Failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!isStrongPassword(newPassword)) { notify(PASSWORD_POLICY_MESSAGE, { type: "error", title: "Failed" }); return; }
    if (newPassword !== confirmPassword) { notify("Passwords do not match.", { type: "error", title: "Failed" }); return; }
    setLoading(true);
    try {
      await resetPassword(email.trim(), resetToken, newPassword);
      notify("Password reset successfully! Please log in with your new password.", { type: "success" });
      onCancel();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to reset password.", { type: "error", title: "Failed" });
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
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>
            Enter your registered email and we&apos;ll send you an OTP.
          </p>
          <div className="landing-field-group fl-wrap">
            <input type="email" className="fl-input landing-field" placeholder=" " value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label className="fl-label fl-label--glass">Email address</label>
          </div>
          <button type="submit" className="landing-submit" disabled={loading}>
            {loading ? "Sending…" : "Send OTP"}
          </button>
          <button type="button" className="landing-link-btn" onClick={onCancel}>← Back to Login</button>
        </form>
      )}
      {step === "otp" && (
        <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>
                  A 6-digit OTP was sent to <strong>{email}</strong>. It expires in 10 minutes.
                </p>
          <div className="landing-field-group fl-wrap">
            <input type="text" className="fl-input landing-field" placeholder=" " value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} required />
            <label className="fl-label fl-label--glass">OTP Code</label>
          </div>
          <button type="submit" className="landing-submit" disabled={loading}>
            {loading ? "Verifying…" : "Verify OTP"}
          </button>
          <button type="button" className="landing-link-btn" onClick={handleResendOtp} disabled={loading || resendSeconds > 0}>
            {resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : "Resend OTP"}
          </button>
        </form>
      )}
      {step === "newpass" && (
        <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div ref={forgotPwRef} className="landing-field-group">
            <div className="landing-password-wrap fl-wrap">
              <input type={showNewPass ? "text" : "password"} className="fl-input landing-field" placeholder=" " value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
              <label className="fl-label fl-label--glass fl-label--pw">New Password</label>
              <button type="button" className="landing-password-toggle" onClick={() => setShowNewPass((v) => !v)} tabIndex={-1} aria-label={showNewPass ? "Hide password" : "Show password"}>
                {showNewPass ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            <PasswordChecklist focused={newPassword.length > 0 && !isStrongPassword(newPassword)} anchorRef={forgotPwRef} side="left" />
          </div>
          <div className="landing-field-group">
            <div className="landing-password-wrap fl-wrap">
              <input type={showConfirmPass ? "text" : "password"} className="fl-input landing-field" placeholder=" " value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              <label className="fl-label fl-label--glass fl-label--pw">Confirm Password</label>
              <button type="button" className="landing-password-toggle" onClick={() => setShowConfirmPass((v) => !v)} tabIndex={-1} aria-label={showConfirmPass ? "Hide password" : "Show password"}>
                {showConfirmPass ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
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
  const [form, setForm] = useState({ firstName: "", middleInitial: "", lastName: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Parallax state
  const bgRef = useRef(null);
  const passwordHintAnchorRef = useRef(null);
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
  const [loginResendSeconds, setLoginResendSeconds] = useState(0);

  useEffect(() => {
    if (loginResendSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setLoginResendSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loginResendSeconds]);

  const onChange = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const resetForm = () => {
    setForm({ firstName: "", middleInitial: "", lastName: "", email: "", password: "" });
    setOtpStep(false);
    setLoginOtp("");
    setPendingEmail("");
    setLoginResendSeconds(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const data = await loginService(form.email, form.password);
        if (data.requireOtp) {
          setPendingEmail(form.email);
          setOtpStep(true);
          setLoginResendSeconds(60);
          setLoading(false);
          return;
        }
        if (data.requireVerification) {
          navigate(`/verify-email?email=${encodeURIComponent(data.email || form.email)}`);
          return;
        }
        login(data.user);
        navigate(data.user.role === "student" ? "/student" : "/admin");
        return;
      }
      if (!isLogin && !isStrongPassword(form.password)) {
        setLoading(false);
        return;
      }
      const res = await axios.post(`${API_URL}/register`, {
        firstName: form.firstName,
        middleInitial: form.middleInitial,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      });
      if (res.data.requireVerification) {
        navigate(`/verify-email?email=${encodeURIComponent(res.data.email)}`);
        return;
      }
      notify(res.data.message || "Registered! Check your email to verify your account.", { type: "success", title: "Success" });
      resetForm();
      setMode("login");
    } catch (err) {
      if (mode === "login" && err.response?.data?.requireVerification) {
        navigate(`/verify-email?email=${encodeURIComponent(err.response?.data?.email || form.email)}`);
        return;
      }
      notify(
        err.response?.data?.message ||
          (mode === "login" ? "Invalid credentials" : "Registration failed"),
        { type: "error", title: "Failed" }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLoginOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await verifyLoginOtp(pendingEmail, loginOtp.trim());
      login(data.user);
      navigate(data.user.role === "student" ? "/student" : "/admin");
    } catch (err) {
      notify(err.response?.data?.message || "Invalid or expired OTP.", { type: "error", title: "Failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendLoginOtp = async () => {
    if (!pendingEmail || loginResendSeconds > 0) return;
    setLoading(true);
    try {
      const data = await resendLoginOtp(pendingEmail);
      notify(data.message || "A new OTP has been sent to your email.", { type: "success", title: "Sent" });
      setLoginResendSeconds(60);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to resend OTP.", { type: "error", title: "Failed" });
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  useEffect(() => {
    setHasMounted(true);

    const preload = new Image();
    preload.src = "/RTU-Background.webp";
    preload.onload = () => setBgLoaded(true);
    preload.onerror = () => setBgLoaded(false);
  }, []);

  useEffect(() => {
    // Lock page scroll while on the landing/auth route for app-like immersion.
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  return (
    <div className={`landing ${hasMounted ? "is-mounted" : ""}`} onMouseMove={handleMouseMove}>
      <div
        ref={bgRef}
        className={`landing-parallax-bg ${bgLoaded ? "is-loaded" : ""}`}
        style={{ backgroundImage: "url('/RTU-Background.webp')" }}
      />
      <img
        src="/RTU-Background.webp"
        alt=""
        width="1"
        height="1"
        loading="eager"
        fetchPriority="high"
        decoding="async"
        aria-hidden="true"
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      />
      <div className="landing-overlay" />
      <div className="landing-wrapper">
        {/* ── Brand Header (on blue background) ── */}
        <div className="landing-brand">
          <img
            src="/dpo-logo.webp"
            alt="RTU DPO Logo"
            className="landing-brand-logo"
            width="156"
            height="156"
            loading="eager"
            decoding="async"
          />
          <div className="landing-brand-text">
            <div className="landing-brand-title">Data Protection Office</div>
            <div className="landing-brand-subtitle">Rizal Technological University</div>
          </div>
        </div>

        {/* ── White Form Panel ── */}
        <div className={`landing-panel ${hasMounted ? "is-mounted" : ""}`}>
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
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>
                  A 6-digit OTP was sent to <strong>{pendingEmail}</strong>. Enter it below to continue.
                </p>
                <div className="landing-field-group fl-wrap">
                  <input
                    type="text"
                    className="fl-input landing-field"
                    placeholder=" "
                    value={loginOtp}
                    onChange={(e) => setLoginOtp(e.target.value)}
                    maxLength={6}
                    autoFocus
                    required
                  />
                  <label className="fl-label fl-label--glass">OTP Code</label>
                </div>
                <button type="submit" className="landing-submit" disabled={loading}>
                  {loading ? "Verifying…" : "Verify & Login"}
                </button>
                <button
                  type="button"
                  className="landing-link-btn"
                  onClick={handleResendLoginOtp}
                  disabled={loading || loginResendSeconds > 0}
                >
                  {loginResendSeconds > 0 ? `Resend OTP in ${loginResendSeconds}s` : "Resend OTP"}
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

              <form onSubmit={handleSubmit} className={`landing-card ${!isLogin ? "landing-card--register" : ""}`}>
                <h2 className="landing-title">{isLogin ? "Welcome back" : "Create an account"}</h2>

                {!isLogin && (
                  <div className="landing-name-grid">
                    <div className="landing-field-group fl-wrap">
                      <input id="landing-firstname" type="text" placeholder=" " value={form.firstName} onChange={onChange("firstName")} required className="fl-input landing-field" />
                      <label className="fl-label fl-label--glass">First Name</label>
                    </div>
                    <div className="landing-field-group fl-wrap">
                      <input id="landing-mi" type="text" placeholder=" " value={form.middleInitial} onChange={onChange("middleInitial")} className="fl-input landing-field" />
                      <label className="fl-label fl-label--glass">Middle Name</label>
                    </div>
                    <div className="landing-field-group fl-wrap">
                      <input id="landing-lastname" type="text" placeholder=" " value={form.lastName} onChange={onChange("lastName")} required className="fl-input landing-field" />
                      <label className="fl-label fl-label--glass">Last Name</label>
                    </div>
                  </div>
                )}

                <div className="landing-field-group fl-wrap">
                  <input id="landing-email" type="email" placeholder=" " value={form.email} onChange={onChange("email")} required className="fl-input landing-field" />
                  <label className="fl-label fl-label--glass">Email address</label>
                </div>

                <div ref={passwordHintAnchorRef} className="landing-field-group password-hint-anchor">
                  <div className="landing-password-wrap fl-wrap">
                    <input
                      id="landing-password"
                      type={showPassword ? "text" : "password"}
                      placeholder=" "
                      value={form.password}
                      onChange={onChange("password")}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      required
                      className="fl-input landing-field"
                    />
                    <label className="fl-label fl-label--glass fl-label--pw">Password</label>
                    <button
                      type="button"
                      className="landing-password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                  <PasswordChecklist focused={!isLogin && !isStrongPassword(form.password) && (passwordFocused || form.password.length > 0)} anchorRef={passwordHintAnchorRef} side="left" persistent />
                </div>

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

