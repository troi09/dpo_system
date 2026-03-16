import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, UserX, UserCheck, RefreshCw, KeyRound, Search } from "lucide-react";
import {
  getAllUsers,
  adminCreateUser,
  toggleUserActive,
  adminUpdateUser,
  adminDeleteUser,
  adminResetUserPassword,
} from "../../services/authService";
import PasswordChecklist from "../../components/PasswordChecklist";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "../../utils/passwordPolicy";

const ROLE_LABELS = { student: "Student", admin: "Admin", staff: "Staff" };

const ROLE_COLORS = {
  admin: { bg: "#e0e7ff", color: "#3730a3" },
  staff: { bg: "#d1fae5", color: "#065f46" },
  student: { bg: "#f1f5f9", color: "#475569" },
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionId, setActionId] = useState(null); // id of user being actioned
  const [flash, setFlash] = useState(null); // { type: "success"|"error", msg }
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [resettingUser, setResettingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "student", isActive: true });
  const [tempPassword, setTempPassword] = useState("");

  const [form, setForm] = useState({ name: "", email: "", role: "student", password: "" });

  const load = useCallback(async ({ withSpinner = false } = {}) => {
    setLoading(true);
    if (withSpinner) setRefreshing(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      setFlash({ type: "error", msg: err.response?.data?.message || "Failed to load users" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showFlash = (type, msg) => {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 4000);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      showFlash("error", "Name and email are required.");
      return;
    }
    if (!isStrongPassword(form.password)) {
      showFlash("error", PASSWORD_POLICY_MESSAGE);
      return;
    }
    setCreating(true);
    try {
      await adminCreateUser(form);
      showFlash("success", `User created. Temporary password and verification OTP were sent to ${form.email}.`);
      setForm({ name: "", email: "", role: "student", password: "" });
      setShowCreate(false);
      await load();
    } catch (err) {
      showFlash("error", err.response?.data?.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "student",
      isActive: user.isActive !== false,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    if (!editForm.name.trim()) return showFlash("error", "Name is required.");
    if (!editForm.email.trim()) return showFlash("error", "Email is required.");

    setActionId(editingUser._id);
    try {
      await adminUpdateUser(editingUser._id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        isActive: editForm.isActive,
      });
      showFlash("success", "User updated successfully.");
      setEditingUser(null);
      await load();
    } catch (err) {
      showFlash("error", err.response?.data?.message || "Failed to update user");
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setActionId(deletingUser._id);
    try {
      await adminDeleteUser(deletingUser._id);
      showFlash("success", "User deleted successfully.");
      setDeletingUser(null);
      await load();
    } catch (err) {
      showFlash("error", err.response?.data?.message || "Failed to delete user");
    } finally {
      setActionId(null);
    }
  };

  const handleResetPw = async () => {
    if (!resettingUser) return;
    if (!isStrongPassword(tempPassword)) {
      showFlash("error", PASSWORD_POLICY_MESSAGE);
      return;
    }

    setActionId(resettingUser._id);
    try {
      await adminResetUserPassword(resettingUser._id, tempPassword);
      showFlash("success", `Temporary password reset sent to ${resettingUser.email}.`);
      setResettingUser(null);
      setTempPassword("");
      await load();
    } catch (err) {
      showFlash("error", err.response?.data?.message || "Failed to reset password");
    } finally {
      setActionId(null);
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

  const filtered = useMemo(() => {
    const normalized = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(normalized) ||
        u.email?.toLowerCase().includes(normalized)
    );
  }, [search, users]);

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="page-header-row admin-header-gap-lg">
        <div>
          <p className="admin-subtitle">
            {users.length} user{users.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <div className="admin-inline-actions">
          <button
            onClick={() => load({ withSpinner: true })}
            title="Refresh"
            className="ui-btn ui-btn--secondary ui-btn--icon"
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? "spin-anim" : ""} />
          </button>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className={`ui-btn ${showCreate ? "ui-btn--secondary" : "ui-btn--primary"}`}
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
            className={`admin-flash-banner ${flash.type === "success" ? "admin-flash-banner--success" : "admin-flash-banner--error"}`}
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
            className="admin-create-panel"
          >
            <form
              onSubmit={handleCreate}
              className="admin-form-card"
            >
              <div className="admin-form-title">Create New User</div>
              <div className="admin-form-grid">
                <div className="ui-field">
                  <label>Full Name</label>
                  <input
                    className="ui-input"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    required
                    placeholder="Juan Dela Cruz"
                  />
                </div>
                <div className="ui-field">
                  <label>Email</label>
                  <input
                    className="ui-input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    required
                    placeholder="user@rtu.edu.ph"
                  />
                </div>
                <div className="ui-field">
                  <label>Role</label>
                  <select
                    className="ui-input"
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  >
                    <option value="student">Student</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="ui-field password-hint-anchor">
                  <label>Temporary Password</label>
                  <input
                    className="ui-input"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                  />
                  {form.password && !isStrongPassword(form.password) ? (
                    <PasswordChecklist password={form.password} popup side="left" />
                  ) : null}
                </div>
              </div>
              <div className="admin-form-footer">
                <button
                  type="submit"
                  disabled={creating}
                  className="ui-btn ui-btn--primary"
                >
                  {creating ? "Creating…" : "Create User"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="admin-search-wrap mb-16">
        <Search size={15} className="admin-search-icon" />
        <input
          className="ui-input admin-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
        />
      </div>

      {/* Table */}
      <div className="admin-table-card">
        {loading ? (
          <table className="admin-table admin-table--min-760">
            <thead>
              <tr>
                {["Name", "Email", "Role", "Status", "Joined", "Actions"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={`sk-${i}`}>
                  <td><span className="skeleton-block skeleton-text" /></td>
                  <td><span className="skeleton-block skeleton-text" /></td>
                  <td><span className="skeleton-block skeleton-pill" /></td>
                  <td><span className="skeleton-block skeleton-pill" /></td>
                  <td><span className="skeleton-block skeleton-text" /></td>
                  <td><span className="skeleton-block skeleton-btn" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : filtered.length === 0 ? (
          <div className="admin-table-empty admin-table-empty--compact">No users found.</div>
        ) : (
          <table className="admin-table admin-table--min-760">
            <thead>
              <tr>
                {["Name", "Email", "Role", "Status", "Joined", "Actions"].map((h) => (
                  <th key={h}>{h}</th>
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
                    className={user.isActive === false ? "admin-row-inactive" : ""}
                  >
                    <td className="admin-cell-strong">{user.name}</td>
                    <td className="admin-cell-muted">{user.email}</td>
                    <td>
                      <span className="tag-pill" style={{ background: roleStyle.bg, color: roleStyle.color }}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td>
                      <span className="tag-pill" style={{
                        background: user.isActive !== false ? "#d1fae5" : "#fee2e2",
                        color: user.isActive !== false ? "#065f46" : "#991b1b",
                      }}>
                        {user.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="admin-cell-muted">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button onClick={() => openEditModal(user)} className="ui-btn ui-btn--secondary ui-btn--sm">Edit</button>
                        <button
                          onClick={() => setResettingUser(user)}
                          disabled={busy}
                          title="Reset with temporary password"
                          className="ui-btn ui-btn--secondary ui-btn--sm"
                          style={{ opacity: busy ? 0.6 : 1 }}
                        >
                          <KeyRound size={13} />
                          Reset PW
                        </button>
                        <button
                          onClick={() => setDeletingUser(user)}
                          className="ui-btn ui-btn--danger ui-btn--sm"
                          disabled={busy}
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => handleToggle(user)}
                          disabled={busy}
                          title={user.isActive !== false ? "Deactivate user" : "Activate user"}
                          className={`ui-btn ui-btn--secondary ui-btn--sm ${user.isActive !== false ? "ui-btn--danger-text" : "ui-btn--success-text"}`}
                          style={{ opacity: busy ? 0.6 : 1 }}
                        >
                          {user.isActive !== false ? <UserX size={13} /> : <UserCheck size={13} />}
                          {user.isActive !== false ? "Deactivate" : "Activate"}
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

      <AnimatePresence>
        {editingUser && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
              <h3 className="modal-title">Edit User</h3>
              <div className="ui-field">
                <label>Full Name</label>
                <input className="ui-input" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="ui-field">
                <label>Email</label>
                <input className="ui-input" type="email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="ui-field">
                <label>Role</label>
                <select className="ui-input" value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}>
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="ui-field">
                <label>Status</label>
                <select className="ui-input" value={editForm.isActive ? "active" : "inactive"} onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.value === "active" }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="modal-actions">
                <button className="ui-btn ui-btn--secondary" onClick={() => setEditingUser(null)}>Cancel</button>
                <button className="ui-btn ui-btn--primary" onClick={handleSaveEdit}>Save Changes</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingUser && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
              <h3 className="modal-title">Delete User</h3>
              <p className="modal-text">Are you sure you want to permanently delete this user?</p>
              <p className="modal-text"><strong>{deletingUser.email}</strong></p>
              <div className="modal-actions">
                <button className="ui-btn ui-btn--secondary" onClick={() => setDeletingUser(null)}>Cancel</button>
                <button className="ui-btn ui-btn--danger" onClick={handleDeleteUser}>Delete Permanently</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {resettingUser && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
              <h3 className="modal-title">Reset Password</h3>
              <p className="modal-text">Set a temporary password for <strong>{resettingUser.email}</strong>.</p>
              <div className="ui-field password-hint-anchor">
                <label>Temporary Password</label>
                <input className="ui-input" type="password" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} />
                {tempPassword && !isStrongPassword(tempPassword) ? (
                  <PasswordChecklist password={tempPassword} popup side="left" />
                ) : null}
              </div>
              <div className="modal-actions">
                <button className="ui-btn ui-btn--secondary" onClick={() => { setResettingUser(null); setTempPassword(""); }}>Cancel</button>
                <button className="ui-btn ui-btn--primary" onClick={handleResetPw}>Reset Password</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

