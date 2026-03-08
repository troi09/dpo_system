import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { ClipboardList, Users, CheckCircle, Clock, AlertCircle, Activity } from "lucide-react";
import { getAllRequests } from "../../services/requestService";
import { getAuditLogs } from "../../services/auditService";

const COLORS = { pending: "#f59e0b", approved: "#10b981", revision_required: "#ef4444", archived: "#6b7280" };

const prettyStatus = (s) =>
  s === "revision_required" ? "Revision Required" : s.charAt(0).toUpperCase() + s.slice(1);

const statusClass = (s) => {
  if (s === "pending") return "status-pill status-pill--pending";
  if (s === "approved") return "status-pill status-pill--approved";
  if (s === "revision_required") return "status-pill status-pill--revision";
  return "status-pill";
};

const getMonthName = (d) =>
  new Date(d).toLocaleString("en-US", { month: "short" });

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    getAllRequests()
      .then(setRequests)
      .catch((err) => console.error("requests:", err.message));
    getAuditLogs(5)
      .then(setAuditLogs)
      .catch((err) => console.error("audit:", err.message));
  }, []);

  // ─── Donut chart data – status distribution
  const statusCounts = requests.reduce(
    (acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; },
    {}
  );
  const donutData = Object.entries(statusCounts).map(([name, value]) => ({
    name: prettyStatus(name),
    value,
    color: COLORS[name] || "#94a3b8",
  }));

  // ─── Bar chart data – document types this month
  const now = new Date();
  const thisMonth = requests.filter(
    (r) =>
      new Date(r.createdAt).getMonth() === now.getMonth() &&
      new Date(r.createdAt).getFullYear() === now.getFullYear()
  );
  const barData = [
    {
      name: getMonthName(now),
      NDA: thisMonth.filter((r) => r.type === "nda").length,
      Agreement: thisMonth.filter((r) => r.type === "agreement").length,
    },
  ];

  const recent = requests.slice(0, 4);

  const statCards = [
    { label: "Total Requests", value: requests.length, icon: ClipboardList, color: "#0f2d6b" },
    { label: "Pending", value: statusCounts.pending || 0, icon: Clock, color: "#f59e0b" },
    { label: "Approved", value: statusCounts.approved || 0, icon: CheckCircle, color: "#10b981" },
    { label: "Revision Required", value: statusCounts.revision_required || 0, icon: AlertCircle, color: "#ef4444" },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px 48px" }}>

      {/* ── Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={22} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#0f2d6b" }}>{value}</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
        {/* Donut */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#0f2d6b", fontWeight: 700 }}>Request Status Distribution</h3>
          {donutData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: "#9ca3af", textAlign: "center", paddingTop: 60 }}>No data yet.</p>
          )}
        </div>

        {/* Bar */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#0f2d6b", fontWeight: 700 }}>Document Types – This Month</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="NDA" fill="#0f2d6b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Agreement" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Bottom row: recent requests + audit trail */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>

        {/* Recent Requests */}
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f3f4f6" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#0f2d6b", display: "flex", alignItems: "center", gap: 8 }}>
              <ClipboardList size={18} /> Recent Requests
            </span>
            <Link to="/admin/requests" style={{ fontSize: 13, color: "#3b82f6", textDecoration: "none" }}>View All →</Link>
          </div>
          <table className="dashboard-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Type</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td colSpan={5} className="dashboard-empty">No requests yet.</td></tr>
              ) : (
                recent.map((r) => (
                  <tr key={r._id}>
                    <td>
                      {r.userId?.name || "Unknown"}
                      <br />
                      <span className="dashboard-subtext">{r.userId?.email || ""}</span>
                    </td>
                    <td>{r.type === "nda" ? `NDA${r.formData?.ndaTypeLabel ? ` - ${r.formData.ndaTypeLabel}` : ""}` : "Agreement"}</td>
                    <td><span className={statusClass(r.status)}>{prettyStatus(r.status)}</span></td>
                    <td>{new Date(r.createdAt).toLocaleDateString("en-US")}</td>
                    <td>
                      <button className="dashboard-action" onClick={() => navigate(`/admin/requests/${r._id}`)}>View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Audit Trail Widget */}
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={18} color="#0f2d6b" />
            <span style={{ fontWeight: 700, fontSize: 15, color: "#0f2d6b" }}>Recent Activity</span>
          </div>
          <div style={{ padding: "12px 16px" }}>
            {auditLogs.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 13 }}>No activity yet.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log._id} style={{ padding: "10px 0", borderBottom: "1px solid #f9fafb" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f2d6b" }}>{log.action.replace(/_/g, " ")}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{log.details}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                    {new Date(log.createdAt).toLocaleString("en-US")}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
