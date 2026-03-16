import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";
import { TrendingUp, RefreshCw } from "lucide-react";
import { getAllRequests } from "../../services/requestService";
import {
  APPROVED_STATUSES,
  PENDING_STATUSES,
  REVISION_STATUSES,
  CHART_LABELS,
  CHART_COLORS,
  normalizeStatusForChart,
} from "../../utils/requestStatusCharts";

const DONUT_COLORS = ["#059669", "#ea580c", "#7c3aed", "#ca8a04", "#2563eb", "#dc2626", "#64748b", "#3b82f6"];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Build a smart textual summary from the data
function buildSummary(requests, filter) {
  if (!requests.length) return "No requests found for the selected period.";

  const total = requests.length;
  const pending = requests.filter((r) => PENDING_STATUSES.includes(r.status)).length;
  const approved = requests.filter((r) => APPROVED_STATUSES.includes(r.status)).length;
  const ndaCount = requests.filter((r) => r.type === "nda").length;
  const agreementCount = requests.filter((r) => r.type === "agreement").length;
  const revisions = requests.filter((r) => REVISION_STATUSES.includes(r.status)).length;

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
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("30d"); // "7d" | "30d" | "90d" | "all"
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async ({ withToast = false } = {}) => {
    setLoading(true);
    if (withToast) setRefreshing(true);
    setError("");
    try {
      const data = await getAllRequests();
      setRequests(Array.isArray(data) ? data : []);
      if (withToast) {
        setNotice("Data updated");
        setTimeout(() => setNotice(""), 1800);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to load reports data";
      const status = err.response?.status;
      setError(`${msg}${status ? ` (HTTP ${status})` : ""}`);
      console.error("Reports load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    filteredRequests.forEach((r) => {
      const key = normalizeStatusForChart(r.status);
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([id, value]) => ({
      id,
      name: CHART_LABELS[id] || id,
      value,
    }));
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
        approved: inMonth.filter((r) => APPROVED_STATUSES.includes(r.status)).length,
        pending: inMonth.filter((r) => PENDING_STATUSES.includes(r.status)).length,
      };
    });
  }, [requests]);

  const summary = useMemo(() => buildSummary(filteredRequests, filter), [filteredRequests, filter]);

  const total = filteredRequests.length;
  const approved = filteredRequests.filter((r) => APPROVED_STATUSES.includes(r.status)).length;
  const pending = filteredRequests.filter((r) => PENDING_STATUSES.includes(r.status)).length;
  const revisions = filteredRequests.filter((r) => REVISION_STATUSES.includes(r.status)).length;

  const filterOptions = [
    { label: "Last 7 Days", value: "7d" },
    { label: "Last 30 Days", value: "30d" },
    { label: "Last 90 Days", value: "90d" },
    { label: "All Time", value: "all" },
  ];

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="page-header-row mb-16">
        <div>
          <h2 className="page-title">Reports &amp; Analytics</h2>
          <p className="admin-subtitle">System-wide request data and trends</p>
        </div>
        <div className="admin-inline-actions">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`ui-btn ui-btn--compact ${filter === opt.value ? "ui-btn--primary" : "ui-btn--secondary"}`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => load({ withToast: true })}
            title="Refresh"
            className="ui-btn ui-btn--secondary ui-btn--icon"
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? "spin-anim" : ""} />
          </button>
        </div>
      </div>

      {notice ? (
        <div className="info-banner info-banner--success mb-12">
          <strong>{notice}</strong>
        </div>
      ) : null}

      {error && (
        <div className="admin-flash-banner admin-flash-banner--error">
          {error}
        </div>
      )}

      {loading && (
        <div className="responsive-grid-4 admin-metric-grid">
          {[...Array(4)].map((_, i) => (
            <div
              key={`sk-${i}`}
              className="admin-metric-card"
            >
              <span className="skeleton-block" style={{ width: 60, height: 28, margin: "0 auto 8px", borderRadius: "var(--radius-md)" }} />
              <span className="skeleton-block skeleton-text" style={{ width: 70, margin: "0 auto" }} />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* KPI Cards */}
          <div className="responsive-grid-4 admin-metric-grid">
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
                className="admin-metric-card"
              >
                <div className="admin-metric-value" style={{ color: c.color }}>{c.value}</div>
                <div className="admin-metric-label">{c.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Smart Summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="admin-insight-card"
          >
            <TrendingUp size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p className="admin-insight-text">
              {summary}
            </p>
          </motion.div>

          {/* Charts Grid */}
          <div className="responsive-grid-2" style={{ marginBottom: 24 }}>
            {/* Donut – Status distribution */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="admin-chart-card"
            >
              <div className="admin-chart-title">Status Distribution</div>
              <div className="admin-chart-subtitle">Breakdown by current request status</div>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                      {(statusData || []).map((entry, index) => (
                        <Cell key={index} fill={CHART_COLORS[entry.id] || DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="admin-chart-empty">
                  No data for this period
                </div>
              )}
            </motion.div>

            {/* Bar – Type comparison */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
              className="admin-chart-card"
            >
              <div className="admin-chart-title">Document Type Breakdown</div>
              <div className="admin-chart-subtitle">NDA vs Agreement requests in this period</div>
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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42 }}
            className="admin-chart-card"
          >
            <div className="admin-chart-title">Monthly Trend</div>
            <div className="admin-chart-subtitle">Request volume over the last 6 months</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Total" />
                <Line type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Approved/Completed" />
                <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Pending" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </>
      )}
    </div>
  );
}


