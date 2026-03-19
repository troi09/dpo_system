import { useContext, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { updateProfile } from "../../services/authService";
import PasswordChecklist from "../../components/PasswordChecklist";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "../../utils/passwordPolicy";

const StudentProfile = () => {
  const { user, updateUser } = useContext(AuthContext);
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [middleName, setMiddleName] = useState(user?.middleInitial || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(null);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const showFlash = (type, msg) => {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 4000);
  };

  const handleNameUpdate = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return showFlash("error", "First name and last name are required.");
    const hasChanges = firstName.trim() !== (user?.firstName || "") ||
      middleName.trim() !== (user?.middleInitial || "") ||
      lastName.trim() !== (user?.lastName || "");
    if (!hasChanges) return showFlash("error", "No changes to save.");
    setLoading(true);
    try {
      const data = await updateProfile({ firstName: firstName.trim(), middleInitial: middleName.trim(), lastName: lastName.trim() });
      updateUser(data.user);
      showFlash("success", "Name updated successfully.");
    } catch (err) {
      showFlash("error", err.response?.data?.message || "Failed to update name.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!currentPassword) return showFlash("error", "Current password is required.");
    if (!isStrongPassword(newPassword)) {
      return showFlash("error", PASSWORD_POLICY_MESSAGE);
    }
    if (newPassword !== confirmPassword) return showFlash("error", "Passwords do not match.");
    setLoading(true);
    try {
      await updateProfile({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showFlash("success", "Password changed successfully.");
    } catch (err) {
      showFlash("error", err.response?.data?.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = {
    width: "100%", padding: "10px 14px", borderRadius: "var(--radius-md)",
    border: "1px solid var(--border-strong)", background: "var(--surface)",
    fontSize: 14, fontFamily: "inherit", color: "var(--text-primary)", boxSizing: "border-box",
  };

  const labelStyle = { fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 };

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
    <div style={{ maxWidth: 520, width: "100%" }}>
      {/* Flash */}
      {flash && (
        <div style={{
          marginBottom: 16, padding: "12px 16px", borderRadius: "var(--radius-md)",
          background: flash.type === "success" ? "#d1fae5" : "#fee2e2",
          color: flash.type === "success" ? "#065f46" : "#991b1b",
          border: `1px solid ${flash.type === "success" ? "#a7f3d0" : "#fca5a5"}`,
          fontSize: 13,
        }}>
          {flash.msg}
        </div>
      )}

      {/* Profile Header */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", padding: "28px 32px", marginBottom: 20,
        boxShadow: "var(--shadow-sm)", textAlign: "center",
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%", background: "var(--primary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px", color: "#fff", fontSize: 24, fontWeight: 700,
        }}>{initials}</div>
        <p style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{user?.name}</p>
        <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-muted)" }}>{user?.email}</p>
        <span style={{
          padding: "3px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700,
          background: "#f1f5f9", color: "#475569",
        }}>{user?.role}</span>
      </div>

      {/* Update Name */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", padding: "20px 24px", marginBottom: 20,
        boxShadow: "var(--shadow-sm)",
      }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Update Display Name</h3>
        <form onSubmit={handleNameUpdate} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>First Name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} style={fieldStyle} placeholder="Juan" required />
            </div>
            <div>
              <label style={labelStyle}>Middle Name</label>
              <input value={middleName} onChange={(e) => setMiddleName(e.target.value)} style={fieldStyle} placeholder="Santos" />
            </div>
            <div>
              <label style={labelStyle}>Last Name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} style={fieldStyle} placeholder="Dela Cruz" required />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={loading} style={{
              padding: "10px 20px", borderRadius: "var(--radius-md)", border: "none",
              background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: 13,
              fontFamily: "inherit", cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1, whiteSpace: "nowrap",
            }}>Save</button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", padding: "20px 24px",
        boxShadow: "var(--shadow-sm)",
      }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Change Password</h3>
        <form onSubmit={handlePasswordUpdate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Current Password</label>
            <div style={{ position: "relative" }}>
              <input type={showCurrentPw ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" style={{ ...fieldStyle, paddingRight: 42 }} />
              <button type="button" onClick={() => setShowCurrentPw((v) => !v)} tabIndex={-1} aria-label={showCurrentPw ? "Hide password" : "Show password"} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 4, cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
                {showCurrentPw ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>
          <div className="password-hint-anchor" style={{ position: "relative" }}>
            <label style={labelStyle}>New Password</label>
            <div style={{ position: "relative" }}>
              <input type={showNewPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" minLength={8} style={{ ...fieldStyle, paddingRight: 42 }} />
              <button type="button" onClick={() => setShowNewPw((v) => !v)} tabIndex={-1} aria-label={showNewPw ? "Hide password" : "Show password"} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 4, cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
                {showNewPw ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            {newPassword && !isStrongPassword(newPassword) ? <PasswordChecklist password={newPassword} popup side="left" /> : null}
          </div>
          <div>
            <label style={labelStyle}>Confirm New Password</label>
            <div style={{ position: "relative" }}>
              <input type={showConfirmPw ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" style={{ ...fieldStyle, paddingRight: 42 }} />
              <button type="button" onClick={() => setShowConfirmPw((v) => !v)} tabIndex={-1} aria-label={showConfirmPw ? "Hide password" : "Show password"} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 4, cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
                {showConfirmPw ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} style={{
            padding: "10px 20px", borderRadius: "var(--radius-md)", border: "none",
            background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: 13,
            fontFamily: "inherit", cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1, alignSelf: "flex-end",
          }}>Change Password</button>
        </form>
      </div>
    </div>
    </div>
  );
};

export default StudentProfile;
