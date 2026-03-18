import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, RefreshCw, Search, X } from "lucide-react";
import {
  getAllUsers,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
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
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [flash, setFlash] = useState(null); // { type: "success"|"error", msg }
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [editForm, setEditForm] = useState({ role: "student", isActive: true });

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
    setEditForm({ role: user.role || "student", isActive: user.isActive !== false });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setActionId(editingUser._id);
    try {
      await adminUpdateUser(editingUser._id, { role: editForm.role, isActive: editForm.isActive });
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

  const resetAndRefresh = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    load({ withSpinner: true });
  };

  const filtered = useMemo(() => {
    const normalized = search.toLowerCase();
    let result = users.filter(
      (u) =>
        u.name?.toLowerCase().includes(normalized) ||
        u.email?.toLowerCase().includes(normalized)
    );
    if (roleFilter !== "all") result = result.filter((u) => u.role === roleFilter);
    if (statusFilter === "active") result = result.filter((u) => u.isActive !== false);
    if (statusFilter === "inactive") result = result.filter((u) => u.isActive === false);
    return result;
  }, [search, roleFilter, statusFilter, users]);

  return (
    <div className="page-shell">

      {/* Flash message */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className={`admin-flash-banner ${flash.type === "success" ? "admin-flash-banner--success" : "admin-flash-banner--error"}`}
            style={{ marginBottom: 12 }}
          >
            {flash.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toolbar ── */}
      <div className="req-toolbar">
        {/* Search row */}
        <div className="req-toolbar__search-row">
          <div className="req-toolbar__search-box">
            <input
              type="text"
              className="req-toolbar__search-input"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? (
              <button type="button" className="req-toolbar__search-clear" onClick={() => setSearch("")} aria-label="Clear search">
                ×
              </button>
            ) : null}
            <span className="req-toolbar__search-inline-btn" style={{ pointerEvents: "none" }}>
              <Search size={14} />
            </span>
          </div>
        </div>

        {/* Filter row */}
        <div className="req-toolbar__filters req-toolbar__filters--open">
          <div className="req-toolbar__filter-group">
            <label className="req-toolbar__filter-label">Role</label>
            <select className="req-toolbar__filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="req-toolbar__filter-group">
            <label className="req-toolbar__filter-label">Status</label>
            <select className="req-toolbar__filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <button
            type="button"
            className="req-toolbar__reset-btn"
            onClick={resetAndRefresh}
            disabled={refreshing}
            title="Reset filters and refresh"
          >
            <RefreshCw size={14} className={refreshing ? "spin-anim" : ""} />
          </button>
        </div>
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowCreate(false); setForm({ name: "", email: "", role: "student", password: "" }); } }}
          >
            <motion.div className="user-edit-modal" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}>

              {/* Title row */}
              <div className="user-edit-modal__title-row">
                <span className="user-edit-modal__title">Create User</span>
                <button
                  type="button"
                  className="user-edit-modal__close user-edit-modal__close--danger"
                  onClick={() => { setShowCreate(false); setForm({ name: "", email: "", role: "student", password: "" }); }}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="user-edit-modal__divider" />

              {/* Form */}
              <form onSubmit={handleCreate}>
                <div className="user-edit-modal__fields" style={{ gridTemplateColumns: "1fr" }}>
                  <div className="user-edit-modal__field">
                    <label className="user-edit-modal__label">Full Name</label>
                    <input
                      className="ui-input"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      required
                      placeholder="Juan Dela Cruz"
                    />
                  </div>
                  <div className="user-edit-modal__field">
                    <label className="user-edit-modal__label">Email</label>
                    <input
                      className="ui-input"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      required
                      placeholder="user@rtu.edu.ph"
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div className="user-edit-modal__field">
                      <label className="user-edit-modal__label">Role</label>
                      <select className="ui-input" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
                        <option value="student">Student</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="user-edit-modal__field password-hint-anchor">
                      <label className="user-edit-modal__label">Temporary Password</label>
                      <input
                        className="ui-input"
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                        required
                        minLength={8}
                        placeholder="Min. 8 characters"
                      />
                      {form.password && !isStrongPassword(form.password) ? (
                        <PasswordChecklist password={form.password} popup side="left" />
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="user-edit-modal__footer" style={{ justifyContent: "flex-end" }}>
                  <button type="submit" className="ui-btn ui-btn--primary" disabled={creating}>
                    {creating ? "Creating…" : "Create User"}
                  </button>
                </div>
              </form>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="dashboard-card">
        <div className="table-scroll">
        <table className="dashboard-table">
          <thead>
            <tr className="dashboard-table-title-row">
              <th colSpan={5}>
                <div className="dashboard-table-title-wrap">
                  <span className="dashboard-table-title">Users</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{filtered.length}</span>
                  <button
                    type="button"
                    onClick={() => { setForm({ name: "", email: "", role: "student", password: "" }); setShowCreate(true); }}
                    className="req-toolbar__action-btn"
                    style={{ marginLeft: "auto" }}
                  >
                    <UserPlus size={14} />
                    Create User
                  </button>
                </div>
              </th>
            </tr>
            <tr>
              {["Joined", "User", "Role", "Status"].map((h) => (
                <th key={h}>{h}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={`sk-${i}`}>
                  <td><span className="skeleton-block skeleton-text" /></td>
                  <td><span className="skeleton-block skeleton-text" /></td>
                  <td><span className="skeleton-block skeleton-pill" /></td>
                  <td><span className="skeleton-block skeleton-pill" /></td>
                  <td />
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="dashboard-empty">
                    <p className="dashboard-empty-title">No users found</p>
                    <p className="dashboard-empty-text">No accounts match the current filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((user, i) => {
                const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.student;
                return (
                  <motion.tr
                    key={user._id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className={user.isActive === false ? "admin-row-inactive" : ""}
                    onClick={() => openEditModal(user)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{user.name}</span>
                      <span className="dashboard-subtext">{user.email}</span>
                    </td>
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
                    <td className="row-caret">›</td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      <AnimatePresence>
        {editingUser && (() => {
          const initials = (editingUser.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
          const roleStyle = ROLE_COLORS[editingUser.role] || ROLE_COLORS.student;
          return (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="user-edit-modal" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}>

                {/* Title row */}
                <div className="user-edit-modal__title-row">
                  <span className="user-edit-modal__title">Edit User</span>
                  <button
                    type="button"
                    className="user-edit-modal__close user-edit-modal__close--danger"
                    onClick={() => setEditingUser(null)}
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Profile header */}
                <div className="user-edit-modal__header">
                  <div className="user-edit-modal__avatar" style={{ background: roleStyle.bg, color: roleStyle.color }}>
                    {initials}
                  </div>
                  <div className="user-edit-modal__identity">
                    <span className="user-edit-modal__name">{editingUser.name}</span>
                    <span className="user-edit-modal__email">{editingUser.email}</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="user-edit-modal__divider" />

                {/* Editable fields */}
                <div className="user-edit-modal__fields">
                  <div className="user-edit-modal__field">
                    <label className="user-edit-modal__label">Role</label>
                    <select className="ui-input" value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}>
                      <option value="student">Student</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="user-edit-modal__field">
                    <label className="user-edit-modal__label">Status</label>
                    <select className="ui-input" value={editForm.isActive ? "active" : "inactive"} onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.value === "active" }))}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Footer */}
                <div className="user-edit-modal__footer">
                  <button
                    className="ui-btn ui-btn--danger"
                    onClick={() => { setEditingUser(null); setDeletingUser(editingUser); }}
                  >
                    Delete User
                  </button>
                  <button className="ui-btn ui-btn--primary" onClick={handleSaveEdit} disabled={actionId === editingUser._id}>
                    {actionId === editingUser._id ? "Saving…" : "Save Changes"}
                  </button>
                </div>

              </motion.div>
            </motion.div>
          );
        })()}
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
    </div>
  );
}

