import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, UserX, UserCheck, RefreshCw, KeyRound, Search } from "lucide-react";
import {
  getAllUsers,
  adminCreateUser,
  toggleUserActive,
  adminTriggerPasswordReset,
} from "../../services/authService";

const ROLE_LABELS = { student: "Student", admin: "Admin", staff: "Staff" };

const ROLE_COLORS = {
  admin: { bg: "#e0e7ff", color: "#3730a3" },
  staff: { bg: "#d1fae5", color: "#065f46" },
  student: { bg: "#f1f5f9", color: "#475569" },
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionId, setActionId] = useState(null); // id of user being actioned
  const [flash, setFlash] = useState(null); // { type: "success"|"error", msg }

  const [form, setForm] = useState({ name: "", email: "", role: "student" });

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      setFlash({ type: "error", msg: err.response?.data?.message || "Failed to load users" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const showFlash = (type, msg) => {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 4000);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setCreating(true);
    try {
      await adminCreateUser(form);
      showFlash("success", `User created. A welcome email with a temporary password has been sent to ${form.email}.`);
      setForm({ name: "", email: "", role: "student" });
      setShowCreate(false);
      await load();
    } catch (err) {
      showFlash("error", err.response?.data?.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (user) => {
    setActionId(user._id);
    try {
      await toggleUserActive(user._id);
      showFlash("success", `User ${user.isActive ? "deactivated" : "activated"} successfully.`);
      await load();
    } catch (err) {
      showFlash("error", err.response?.data?.message || "Action failed");
    } finally {
      setActionId(null);
    }
  };

  const handleResetPw = async (user) => {
    if (!window.confirm(`Send a password reset OTP to ${user.email}?`)) return;
    setActionId(user._id);
    try {
      await adminTriggerPasswordReset(user._id);
      showFlash("success", `Password reset email sent to ${user.email}.`);
    } catch (err) {
      showFlash("error", err.response?.data?.message || "Failed to trigger reset");
    } finally {
      setActionId(null);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Manage Users</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
            {users.length} user{users.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={load}
            title="Refresh"
            style={{
              padding: "8px 10px", borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-strong)", background: "var(--surface)",
              cursor: "pointer", display: "flex", alignItems: "center",
            }}
          >
            <RefreshCw size={14} color="var(--text-secondary)" />
          </button>
          <button
            onClick={() => setShowCreate((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
              borderRadius: "var(--radius-md)",
              background: showCreate ? "var(--surface)" : "var(--primary)", color: showCreate ? "var(--text-primary)" : "#fff",
              cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit",
              border: showCreate ? "1px solid var(--border-strong)" : "none",
            }}
          >
            <UserPlus size={15} />
            {showCreate ? "Cancel" : "New User"}
          </button>
        </div>
      </div>

      {/* Flash message */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{
              marginBottom: 16, padding: "12px 16px", borderRadius: "var(--radius-md)",
              background: flash.type === "success" ? "#d1fae5" : "#fee2e2",
              color: flash.type === "success" ? "#065f46" : "#991b1b",
              border: `1px solid ${flash.type === "success" ? "#a7f3d0" : "#fca5a5"}`,
              fontSize: 13,
            }}
          >
            {flash.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create User Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden", marginBottom: 20 }}
          >
            <form
              onSubmit={handleCreate}
              style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)", padding: "20px 24px",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Create New User</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "flex-end" }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Full Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    required
                    placeholder="Juan Dela Cruz"
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-strong)", background: "var(--surface)",
                      fontSize: 14, fontFamily: "inherit", color: "var(--text-primary)", boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    required
                    placeholder="user@rtu.edu.ph"
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-strong)", background: "var(--surface)",
                      fontSize: 14, fontFamily: "inherit", color: "var(--text-primary)", boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                    style={{
                      padding: "9px 12px", borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-strong)", background: "var(--surface)",
                      fontSize: 14, fontFamily: "inherit", color: "var(--text-primary)", cursor: "pointer",
                    }}
                  >
                    <option value="student">Student</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: "9px 20px", borderRadius: "var(--radius-md)", border: "none",
                    background: "var(--primary)", color: "#fff", fontWeight: 600,
                    fontSize: 13, fontFamily: "inherit", cursor: creating ? "not-allowed" : "pointer",
                    opacity: creating ? 0.7 : 1,
                  }}
                >
                  {creating ? "Creating…" : "Create User"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={15} color="var(--text-muted)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          style={{
            width: "100%", padding: "9px 12px 9px 36px", borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-strong)", background: "var(--surface)",
            fontSize: 13, fontFamily: "inherit", color: "var(--text-primary)", boxSizing: "border-box",
          }}
        />
      </div>

      {/* Table */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-sm)",
      }}>
        {loading ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                {["Name", "Email", "Role", "Status", "Joined", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={`sk-${i}`} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 16px" }}><span className="skeleton-block skeleton-text" /></td>
                  <td style={{ padding: "12px 16px" }}><span className="skeleton-block skeleton-text" /></td>
                  <td style={{ padding: "12px 16px" }}><span className="skeleton-block skeleton-pill" /></td>
                  <td style={{ padding: "12px 16px" }}><span className="skeleton-block skeleton-pill" /></td>
                  <td style={{ padding: "12px 16px" }}><span className="skeleton-block skeleton-text" /></td>
                  <td style={{ padding: "12px 16px" }}><span className="skeleton-block skeleton-btn" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "24px 20px", color: "var(--text-muted)", fontSize: 13 }}>No users found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                {["Name", "Email", "Role", "Status", "Joined", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, i) => {
                const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.student;
                const busy = actionId === user._id;
                return (
                  <motion.tr
                    key={user._id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: user.isActive === false ? "#fef2f2" : "transparent",
                    }}
                  >
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text-primary)" }}>{user.name}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>{user.email}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: roleStyle.bg, color: roleStyle.color }}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                        background: user.isActive !== false ? "#d1fae5" : "#fee2e2",
                        color: user.isActive !== false ? "#065f46" : "#991b1b",
                      }}>
                        {user.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => handleToggle(user)}
                          disabled={busy}
                          title={user.isActive !== false ? "Deactivate user" : "Activate user"}
                          style={{
                            display: "flex", alignItems: "center", gap: 4, padding: "6px 10px",
                            borderRadius: "var(--radius-md)", border: "1px solid var(--border-strong)",
                            background: "var(--surface)", cursor: busy ? "not-allowed" : "pointer",
                            fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                            color: user.isActive !== false ? "#dc2626" : "#059669",
                            opacity: busy ? 0.6 : 1,
                          }}
                        >
                          {user.isActive !== false ? <UserX size={13} /> : <UserCheck size={13} />}
                          {user.isActive !== false ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleResetPw(user)}
                          disabled={busy}
                          title="Trigger password reset"
                          style={{
                            display: "flex", alignItems: "center", gap: 4, padding: "6px 10px",
                            borderRadius: "var(--radius-md)", border: "1px solid var(--border-strong)",
                            background: "var(--surface)", cursor: busy ? "not-allowed" : "pointer",
                            fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                            color: "var(--text-secondary)", opacity: busy ? 0.6 : 1,
                          }}
                        >
                          <KeyRound size={13} />
                          Reset PW
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
