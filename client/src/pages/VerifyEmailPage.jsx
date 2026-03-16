import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle } from "lucide-react";
import { verifyEmail, verifyEmailByToken, resendVerificationOtp } from "../services/authService";
import { AuthContext } from "../context/AuthContext";
import "../components/Landing.css";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const token = params.get("token");
  const emailParam = params.get("email") || "";
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [status, setStatus] = useState(token ? "loading" : "form"); // "loading" | "form" | "success" | "error"
  const [message, setMessage] = useState("");
  const [resendSeconds, setResendSeconds] = useState(token ? 0 : 60);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  const finalizeLogin = (data) => {
    if (!data?.user) return;
    login(data.user);
    navigate(data.user.role === "student" ? "/student" : "/admin", { replace: true });
  };

  // Legacy token-based auto-verification
  useEffect(() => {
    if (!token) return;
    verifyEmailByToken(token)
      .then((data) => {
        if (data?.token && data?.user) {
          finalizeLogin(data);
          return;
        }
        setStatus("success");
        setMessage(data.message || "Email verified successfully!");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.message || "Verification failed.");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    setMessage("");
    try {
      const data = await verifyEmail(emailParam, otp.trim());
      if (data?.token && data?.user) {
        finalizeLogin(data);
        return;
      }
      setStatus("success");
      setMessage(data.message || "Email verified successfully!");
    } catch (err) {
      setMessage(err.response?.data?.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0) return;
    setResending(true);
    setMessage("");
    try {
      const data = await resendVerificationOtp(emailParam);
      setMessage(data.message || "A new OTP has been sent.");
      setResendSeconds(60);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  const statusTone = useMemo(() => {
    if (!message) return null;
    return message.toLowerCase().includes("sent") ? "landing-success" : "landing-error";
  }, [message]);

  if (status === "loading") {
    return (
      <div className="landing is-mounted">
        <div className="landing-parallax-bg is-loaded" style={{ backgroundImage: "url('/RTU-Background.jpg')" }} />
        <div className="landing-overlay" />
        <div className="landing-wrapper">
          <div className="landing-brand">
            <img src="/dpo-logo.png" alt="RTU DPO Logo" className="landing-brand-logo" />
            <div className="landing-brand-text">
              <div className="landing-brand-title">Data Protection Office</div>
              <div className="landing-brand-subtitle">Rizal Technological University</div>
            </div>
          </div>
          <div className="landing-panel is-mounted">
            <div className="landing-card">
              <h2 className="landing-title">Verifying Your Email</h2>
              <p>Please wait while we verify your account.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="landing is-mounted">
        <div className="landing-parallax-bg is-loaded" style={{ backgroundImage: "url('/RTU-Background.jpg')" }} />
        <div className="landing-overlay" />
        <div className="landing-wrapper">
          <div className="landing-brand">
            <img src="/dpo-logo.png" alt="RTU DPO Logo" className="landing-brand-logo" />
            <div className="landing-brand-text">
              <div className="landing-brand-title">Data Protection Office</div>
              <div className="landing-brand-subtitle">Rizal Technological University</div>
            </div>
          </div>
          <div className="landing-panel is-mounted">
            <div className="landing-card">
              <CheckCircle size={42} color="#16a34a" />
              <h2 className="landing-title">Email Verified</h2>
              <p>{message}</p>
              <Link to="/" className="landing-submit" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="landing is-mounted">
        <div className="landing-parallax-bg is-loaded" style={{ backgroundImage: "url('/RTU-Background.jpg')" }} />
        <div className="landing-overlay" />
        <div className="landing-wrapper">
          <div className="landing-brand">
            <img src="/dpo-logo.png" alt="RTU DPO Logo" className="landing-brand-logo" />
            <div className="landing-brand-text">
              <div className="landing-brand-title">Data Protection Office</div>
              <div className="landing-brand-subtitle">Rizal Technological University</div>
            </div>
          </div>
          <div className="landing-panel is-mounted">
            <div className="landing-card">
              <XCircle size={42} color="#dc2626" />
              <h2 className="landing-title">Verification Failed</h2>
              <p>{message}</p>
              <Link to="/" className="landing-submit" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // OTP form
  return (
    <div className="landing is-mounted">
      <div className="landing-parallax-bg is-loaded" style={{ backgroundImage: "url('/RTU-Background.jpg')" }} />
      <div className="landing-overlay" />
      <div className="landing-wrapper">
        <div className="landing-brand">
          <img src="/dpo-logo.png" alt="RTU DPO Logo" className="landing-brand-logo" />
          <div className="landing-brand-text">
            <div className="landing-brand-title">Data Protection Office</div>
            <div className="landing-brand-subtitle">Rizal Technological University</div>
          </div>
        </div>

        <div className="landing-panel is-mounted">
          <form onSubmit={handleVerify} className="landing-card">
            <h2 className="landing-title">Verify Your Email</h2>
            <p>
              A 6-digit OTP was sent to <strong>{emailParam}</strong>. Enter it below to activate your account.
            </p>

            {message ? <div className={statusTone}>{message}</div> : null}

            <div className="landing-field-group">
              <label className="landing-label">OTP Code</label>
              <input
                type="text"
                className="landing-field"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                required
                maxLength={6}
                autoFocus
                inputMode="numeric"
              />
            </div>

            <button type="submit" className="landing-submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify Email"}
            </button>

            <button
              type="button"
              className="landing-link-btn"
              onClick={handleResend}
              disabled={resending || resendSeconds > 0}
            >
              {resending ? "Resending..." : resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : "Resend OTP"}
            </button>

            <Link to="/" className="landing-link-btn" style={{ textDecoration: "none" }}>
              Back to Login
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
