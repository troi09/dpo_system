import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { getAllRequests } from "../../services/requestService";

const STATUS_COLORS = {
  pending: "#f59e0b",
  submitted: "#3b82f6",
  approved: "#10b981",
  completed: "#10b981",
  revision_requested: "#ef4444",
  rep_revision_requested: "#f97316",
  awaiting_signature: "#6366f1",
  pending_approval: "#8b5cf6",
  declined: "#dc2626",
};

const DONUT_COLORS = [
  "#f59e0b", "#10b981", "#3b82f6", "#ef4444",
  "#6366f1", "#f97316", "#8b5cf6", "#64748b"
];

const prettyStatus = (s) => {
  const map = {
    pending: "Pending", approved: "Approved", revision_requested: "Revision Requested",
    submitted: "Submitted", awaiting_signature: "Awaiting Signature",
    pending_approval: "Pending Approval", completed: "Completed",
    declined: "Declined", rep_revision_requested: "Rep Revision",
  };
  return map[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "—");
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Build a smart textual summary from the data
function buildSummary(requests, filter) {
  if (!requests.length) return "No requests found for the selected period.";

  const total = requests.length;
  const pending = requests.filter((r) => ["pending", "submitted"].includes(r.status)).length;
  const approved = requests.filter((r) => ["approved", "completed"].includes(r.status)).length;
  const ndaCount = requests.filter((r) => r.type === "nda").length;
  const agreementCount = requests.filter((r) => r.type === "agreement").length;
  const revisions = requests.filter((r) => ["revision_requested", "rep_revision_requested"].includes(r.status)).length;

  const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;
  const ndaPct = total > 0 ? Math.round((ndaCount / total) * 100) : 0;

  let summary = `In ${filter === "all" ? "all time" : `the last ${filter}`}, there are ${total} total request(s). `;
  summary += `${approved} (${Math.round((approved / total) * 100)}%) have been approved or completed. `;
  if (pending > 0) summary += `${pending} (${pendingPct}%) are still pending review. `;
  if (revisions > 0) summary += `${revisions} are awaiting revisions. `;
  summary += `NDA requests make up ${ndaPct}% of submissions`;
  if (agreementCount > 0) summary += `, while ${agreementCount} Agreement request(s) were filed`;
  summary += ".";

  if (pendingPct > 40) summary += " The high pending rate may indicate a backlog — consider prioritizing reviews.";
  else if (approved > pending) summary += " Overall processing is on track.";

  return summary;
}

export default function AdminReports() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("30d"); // "7d" | "30d" | "90d" | "all"

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredRequests = useMemo(() => {
    if (filter === "all") return requests;
    const days = filter === "7d" ? 7 : filter === "30d" ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return requests.filter((r) => new Date(r.createdAt) >= cutoff);
  }, [requests, filter]);

  const statusData = useMemo(() => {
    const counts = {};
    filteredRequests.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return Object.entries(counts).map(([id, value]) => ({ id, name: prettyStatus(id), value }));
  }, [filteredRequests]);

  const typeData = useMemo(() => [
    { name: "NDA", count: filteredRequests.filter((r) => r.type === "nda").length },
    { name: "Agreement", count: filteredRequests.filter((r) => r.type === "agreement").length },
  ], [filteredRequests]);

  // Monthly trend (last 6 months)
  const trendData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const inMonth = requests.filter((r) => {
        const c = new Date(r.createdAt);
        return c >= monthStart && c <= monthEnd;
      });
      return {
        month: MONTH_NAMES[d.getMonth()],
        total: inMonth.length,
        approved: inMonth.filter((r) => ["approved", "completed"].includes(r.status)).length,
        pending: inMonth.filter((r) => ["pending", "submitted"].includes(r.status)).length,
      };
    });
  }, [requests]);

  const summary = useMemo(() => buildSummary(filteredRequests, filter), [filteredRequests, filter]);

  const total = filteredRequests.length;
  const approved = filteredRequests.filter((r) => ["approved", "completed"].includes(r.status)).length;
  const pending = filteredRequests.filter((r) => ["pending", "submitted"].includes(r.status)).length;
  const revisions = filteredRequests.filter((r) => ["revision_requested", "rep_revision_requested"].includes(r.status)).length;

  const filterOptions = [
    { label: "Last 7 Days", value: "7d" },
    { label: "Last 30 Days", value: "30d" },
    { label: "Last 90 Days", value: "90d" },
    { label: "All Time", value: "all" },
  ];

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Reports &amp; Analytics</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>System-wide request data and trends</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              style={{
                padding: "7px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-strong)",
                background: filter === opt.value ? "var(--primary)" : "var(--surface)",
                color: filter === opt.value ? "#fff" : "var(--text-secondary)",
                cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: "inherit",
                transition: "all 0.15s ease",
              }}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={load}
            title="Refresh"
            style={{
              padding: "7px 10px", borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-strong)", background: "var(--surface)",
              cursor: "pointer", display: "flex", alignItems: "center",
            }}
          >
            <RefreshCw size={14} color="var(--text-secondary)" />
          </button>
        </div>
      </div>

      {loading && (
        <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: 13 }}>Loading data…</p>
      )}

      {!loading && (
        <>
          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Total", value: total, color: "#3b82f6" },
              { label: "Approved", value: approved, color: "#10b981" },
              { label: "Pending", value: pending, color: "#f59e0b" },
              { label: "Needs Revision", value: revisions, color: "#ef4444" },
            ].map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)", padding: "18px 20px",
                  boxShadow: "var(--shadow-sm)", textAlign: "center",
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 700, color: c.color }}>{c.value}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{c.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Smart Summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            style={{
              background: "var(--primary-light)", border: "1px solid #c7d8f8",
              borderRadius: "var(--radius-lg)", padding: "16px 20px", marginBottom: 24,
              display: "flex", gap: 12, alignItems: "flex-start",
            }}
          >
            <TrendingUp size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-primary)", lineHeight: 1.65 }}>
              {summary}
            </p>
          </motion.div>

          {/* Charts Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            {/* Donut – Status distribution */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)", padding: "20px 24px", boxShadow: "var(--shadow-sm)",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Status Distribution</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Breakdown by current request status</div>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                      {statusData.map((entry, index) => (
                        <Cell key={index} fill={STATUS_COLORS[entry.id] || DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 230, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  No data for this period
                </div>
              )}
            </motion.div>

            {/* Bar – Type comparison */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
              style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)", padding: "20px 24px", boxShadow: "var(--shadow-sm)",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Document Type Breakdown</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>NDA vs Agreement requests in this period</div>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={typeData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 13, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "var(--primary-light)" }} />
                  <Bar dataKey="count" name="Requests" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Line Chart – Monthly Trend */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
            style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", padding: "20px 24px", boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Monthly Trend</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Request volume over the last 6 months</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Total" />
                <Line type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Approved" />
                <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Pending" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </>
      )}
    </div>
  );
}

