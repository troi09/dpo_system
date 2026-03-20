import { useContext, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../../context/AuthContext";
import { updateProfile } from "../../services/authService";
import PasswordChecklist, { ErrorTooltip } from "../../components/PasswordChecklist";
import { isStrongPassword } from "../../utils/passwordPolicy";
import { notify } from "../../utils/inPageFeedback";
import "../../components/RequestForm.css";
import "../../components/FloatingLabel.css";

const StudentProfile = () => {
  const { user, updateUser } = useContext(AuthContext);
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [middleName, setMiddleName] = useState(user?.middleInitial || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [confirmName, setConfirmName] = useState(false);
  const [confirmPw, setConfirmPw] = useState(false);

  const [newPwFocused, setNewPwFocused] = useState(false);
  const [confirmPwFocused, setConfirmPwFocused] = useState(false);

  // Refs for tooltip anchoring
  const newPwAnchorRef = useRef(null);
  const confirmPwAnchorRef = useRef(null);

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      notify("Failed.", { type: "error", title: "Failed" });
      return;
    }
    const hasChanges =
      firstName.trim() !== (user?.firstName || "") ||
      middleName.trim() !== (user?.middleInitial || "") ||
      lastName.trim() !== (user?.lastName || "");
    if (!hasChanges) {
      notify("No changes to save.", { type: "warning", title: "Notice" });
      return;
    }
    setConfirmName(true);
  };

  const handleConfirmNameUpdate = async () => {
    setLoading(true);
    try {
      const data = await updateProfile({ firstName: firstName.trim(), middleInitial: middleName.trim(), lastName: lastName.trim() });
      updateUser(data.user);
      notify("Name updated successfully.", { type: "success", title: "Success" });
      setConfirmName(false);
    } catch {
      notify("Failed.", { type: "error", title: "Failed" });
      setConfirmName(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!currentPassword || !isStrongPassword(newPassword) || newPassword !== confirmPassword) return;
    setConfirmPw(true);
  };

  const handleConfirmPasswordUpdate = async () => {
    setLoading(true);
    try {
      await updateProfile({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setConfirmPwFocused(false);
      notify("Password changed successfully.", { type: "success", title: "Success" });
      setConfirmPw(false);
    } catch {
      notify("Current password is incorrect.", { type: "error", title: "Failed" });
      setConfirmPw(false);
    } finally {
      setLoading(false);
    }
  };

  const pwToggleStyle = {
    position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", padding: 4, cursor: "pointer",
    color: "var(--text-muted)", display: "flex", alignItems: "center",
  };

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
    <div style={{ maxWidth: 520, width: "100%" }}>

      {/* Profile Header */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "28px 32px", marginBottom: 20, boxShadow: "var(--shadow-sm)", textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: "#fff", fontSize: 24, fontWeight: 700 }}>{initials}</div>
        <p style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{user?.name}</p>
        <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-muted)" }}>{user?.email}</p>
        <span style={{ padding: "3px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: "#f1f5f9", color: "#475569" }}>{user?.role}</span>
      </div>

      {/* Change Name */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px 24px", marginBottom: 20, boxShadow: "var(--shadow-sm)" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Change Name</h3>
        <form onSubmit={handleNameSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div className="fl-wrap">
              <input placeholder=" " value={firstName} onChange={(e) => setFirstName(e.target.value)} className="fl-input request-input" required />
              <label className="fl-label">First Name</label>
            </div>
            <div className="fl-wrap">
              <input placeholder=" " value={middleName} onChange={(e) => setMiddleName(e.target.value)} className="fl-input request-input" />
              <label className="fl-label">Middle Name</label>
            </div>
            <div className="fl-wrap">
              <input placeholder=" " value={lastName} onChange={(e) => setLastName(e.target.value)} className="fl-input request-input" required />
              <label className="fl-label">Last Name</label>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="ui-btn ui-btn--primary" disabled={loading}>Save Changes</button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px 24px", boxShadow: "var(--shadow-sm)" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Change Password</h3>
        <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Current Password */}
          <div className="fl-wrap">
            <input
              type={showCurrentPw ? "text" : "password"}
              placeholder=" "
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="fl-input request-input"
              style={{ paddingRight: 42 }}
            />
            <label className="fl-label fl-label--pw">Current Password</label>
            <button type="button" onClick={() => setShowCurrentPw((v) => !v)} tabIndex={-1} aria-label={showCurrentPw ? "Hide" : "Show"} style={pwToggleStyle}>
              {showCurrentPw ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>

          {/* New Password */}
          <div className="fl-wrap" ref={newPwAnchorRef}>
            <input
              type={showNewPw ? "text" : "password"}
              placeholder=" "
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onFocus={() => setNewPwFocused(true)}
              onBlur={() => setNewPwFocused(false)}
              minLength={8}
              className="fl-input request-input"
              style={{ paddingRight: 42 }}
            />
            <label className="fl-label fl-label--pw">New Password</label>
            <button type="button" onClick={() => setShowNewPw((v) => !v)} tabIndex={-1} aria-label={showNewPw ? "Hide" : "Show"} style={pwToggleStyle}>
              {showNewPw ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
            <PasswordChecklist focused={!isStrongPassword(newPassword) && (newPwFocused || newPassword.length > 0)} anchorRef={newPwAnchorRef} side="left" persistent />
          </div>

          {/* Confirm Password */}
          <div className="fl-wrap" ref={confirmPwAnchorRef}>
            <input
              type={showConfirmPw ? "text" : "password"}
              placeholder=" "
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={() => setConfirmPwFocused(true)}
              onBlur={() => setConfirmPwFocused(false)}
              className="fl-input request-input"
              style={{ paddingRight: 42 }}
            />
            <label className="fl-label fl-label--pw">Confirm New Password</label>
            <button type="button" onClick={() => setShowConfirmPw((v) => !v)} tabIndex={-1} aria-label={showConfirmPw ? "Hide" : "Show"} style={pwToggleStyle}>
              {showConfirmPw ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
            <ErrorTooltip
              show={confirmPassword !== newPassword && (confirmPwFocused || confirmPassword.length > 0)}
              message="Passwords do not match"
              anchorRef={confirmPwAnchorRef}
              side="right"
              persistent
            />
          </div>

          <button type="submit" className="ui-btn ui-btn--primary" disabled={loading} style={{ alignSelf: "flex-end" }}>Save Changes</button>
        </form>
      </div>
    </div>

    {/* Confirm Name Change Modal */}
    <AnimatePresence>
      {confirmName && (
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="modal-card" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
            <h3 className="modal-title">Confirm Change Name</h3>
            <p className="modal-text">Are you sure you want to update your name?</p>
            <p className="modal-text"><strong>{firstName.trim()} {middleName.trim() ? middleName.trim() + " " : ""}{lastName.trim()}</strong></p>
            <div className="modal-actions">
              <button className="ui-btn ui-btn--secondary" onClick={() => setConfirmName(false)} disabled={loading}>Cancel</button>
              <button className="ui-btn ui-btn--primary" onClick={handleConfirmNameUpdate} disabled={loading}>{loading ? "Saving…" : "Confirm"}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Confirm Password Change Modal */}
    <AnimatePresence>
      {confirmPw && (
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="modal-card" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
            <h3 className="modal-title">Confirm Change Password</h3>
            <p className="modal-text">Are you sure you want to change your password?</p>
            <div className="modal-actions">
              <button className="ui-btn ui-btn--secondary" onClick={() => setConfirmPw(false)} disabled={loading}>Cancel</button>
              <button className="ui-btn ui-btn--primary" onClick={handleConfirmPasswordUpdate} disabled={loading}>{loading ? "Saving…" : "Confirm"}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
  );
};

export default StudentProfile;
