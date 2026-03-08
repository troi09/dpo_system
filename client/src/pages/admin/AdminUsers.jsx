import { useEffect, useState } from "react";
import { UserPlus, Power, Mail, Users } from "lucide-react";
import {
  getAllUsers,
  createUser,
  setUserActive,
  triggerPasswordReset,
} from "../../services/userService";

const ROLES = ["student", "staff", "admin"];

const ROLE_BADGE_STYLE = {
  admin:   { background: "#dbeafe", color: "#1e40af" },
  staff:   { background: "#f0fdf4", color: "#15803d" },
  student: { background: "#fef9c3", color: "#854d0e" },
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student" });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try { setUsers(await getAllUsers()); }
    catch (err) { alert(err.response?.data?.message || "Failed to load users"); }
  };

  useEffect(() => { load(); }, []);

  const onChange = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createUser(form);
      setForm({ name: "", email: "", password: "", role: "student" });
      setShowForm(false);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create user");
    } finally { setLoading(false); }
  };

  const handleToggleActive = async (user) => {
    const confirmed = window.confirm(
      `${user.isActive ? "Deactivate" : "Activate"} ${user.name}?`
    );
    if (!confirmed) return;
    try {
      await setUserActive(user._id, !user.isActive);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update user");
    }
  };

  const handleResetPassword = async (user) => {
    const confirmed = window.confirm(`Send password reset email to ${user.email}?`);
    if (!confirmed) return;
    try {
      const res = await triggerPasswordReset(user._id);
      alert(res.message);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send reset email");
    }
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px 48px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ margin: 0, color: "#0f2d6b", display: "flex", alignItems: "center", gap: 8 }}>
          <Users size={22} /> Manage Users
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#0f2d6b", color: "#fff", border: "none",
            borderRadius: 8, padding: "10px 18px", cursor: "pointer", fontSize: 14, fontWeight: 600,
          }}
        >
          <UserPlus size={16} /> New User
        </button>
      </div>

      {showForm && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 16px", color: "#0f2d6b", fontSize: 15 }}>Create New User</h3>
          <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {["name", "email", "password"].map((field) => (
              <input
                key={field}
                type={field === "password" ? "password" : field === "email" ? "email" : "text"}
                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                value={form[field]}
                onChange={onChange(field)}
                required
                style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14 }}
              />
            ))}
            <select
              value={form.role}
              onChange={onChange("role")}
              style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14 }}
            >
              {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: "10px 18px", background: "#10b981", border: "none", borderRadius: 8, color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14 }}
            >
              {loading ? "Creating…" : "Create User"}
            </button>
          </form>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <table className="dashboard-table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={6} className="dashboard-empty">No users found.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u._id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td><span className="dashboard-subtext">{u.email}</span></td>
                  <td>
                    <span style={{
                      ...ROLE_BADGE_STYLE[u.role],
                      padding: "2px 10px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                    }}>
                      {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      padding: "2px 10px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: u.isActive ? "#dcfce7" : "#fee2e2",
                      color: u.isActive ? "#15803d" : "#b91c1c",
                    }}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString("en-US")}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        title={u.isActive ? "Deactivate" : "Activate"}
                        onClick={() => handleToggleActive(u)}
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "6px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                          background: u.isActive ? "#fee2e2" : "#dcfce7",
                          color: u.isActive ? "#b91c1c" : "#15803d",
                        }}
                      >
                        <Power size={13} /> {u.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        title="Send Password Reset"
                        onClick={() => handleResetPassword(u)}
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "6px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                          background: "#eff6ff", color: "#1d4ed8",
                        }}
                      >
                        <Mail size={13} /> Reset Password
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
