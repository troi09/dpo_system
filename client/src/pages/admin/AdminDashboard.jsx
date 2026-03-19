import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line,
} from "recharts";
import {
  FileText, Check, X, Archive,
  ArrowRight, RefreshCw, MoreHorizontal,
} from "lucide-react";
import FilterSelect from "../../components/FilterSelect";
import { getAllRequests } from "../../services/requestService";
import { getRecentAuditLogs } from "../../services/auditService";
import { AuthContext } from "../../context/AuthContext";
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

const ACTION_LABEL = {
  login: "User logged in",
  login_failed: "Failed login attempt",
  login_otp_sent: "Login OTP sent",
  account_created: "New account created",
  account_activated: "Account activated",
  email_verified: "Email verified",
  request_created: "Request submitted",
  request_approved: "Request approved",
  request_revision_required: "Revision requested",
  password_changed: "Password changed",
  password_reset_requested: "Password reset requested",
  user_deactivated: "User deactivated",
  user_activated: "User activated",
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
};

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });

  // Date filter for charts
  const [dateMode, setDateMode] = useState("preset");
  const [preset, setPreset] = useState("all");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const load = async ({ withToast = false } = {}) => {
      if (withToast) setRefreshing(true);
      const errors = [];

      // Fetch independently so one failure doesn't block the other
      try {
        const reqData = await getAllRequests();
        setRequests(reqData);
      } catch (err) {
        const msg = err.response?.data?.message || err.message || "Failed to load requests";
        const status = err.response?.status;
        errors.push(`Requests: ${msg}${status ? ` (HTTP ${status})` : ""}`);
        console.error("Dashboard requests error:", err);
      }

      try {
        if (user?.role === "admin") {
          const auditData = await getRecentAuditLogs(6);
          setAuditLogs(auditData);
        } else {
          setAuditLogs([]);
        }
      } catch (err) {
        const msg = err.response?.data?.message || err.message || "Failed to load audit logs";
        const status = err.response?.status;
        errors.push(`Audit logs: ${msg}${status ? ` (HTTP ${status})` : ""}`);
        console.error("Dashboard audit error:", err);
      }

      if (errors.length) setError(errors.join(" | "));
      setRefreshing(false);
    };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered requests for charts based on date filter
  const chartFilteredRequests = useMemo(() => {
    const now = new Date();
    if (dateMode === "preset") {
      if (preset === "all") return requests;
      if (preset === "today") {
        const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const e = new Date(s.getTime() + 86400000 - 1);
        return requests.filter((r) => { const d = new Date(r.createdAt); return d >= s && d <= e; });
      }
      if (preset === "thisWeek") {
        const day = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((day + 6) % 7));
        monday.setHours(0, 0, 0, 0);
        return requests.filter((r) => new Date(r.createdAt) >= monday);
      }
      if (preset === "thisMonth") {
        const s = new Date(now.getFullYear(), now.getMonth(), 1);
        return requests.filter((r) => new Date(r.createdAt) >= s);
      }
      if (preset === "thisYear") {
        const s = new Date(now.getFullYear(), 0, 1);
        return requests.filter((r) => new Date(r.createdAt) >= s);
      }
    }
    if (dateMode === "single" && singleDate) {
      const s = new Date(singleDate);
      const e = new Date(singleDate + "T23:59:59");
      return requests.filter((r) => { const d = new Date(r.createdAt); return d >= s && d <= e; });
    }
    if (dateMode === "range") {
      return requests.filter((r) => {
        const d = new Date(r.createdAt);
        if (startDate && d < new Date(startDate)) return false;
        if (endDate && d > new Date(endDate + "T23:59:59")) return false;
        return true;
      });
    }
    return requests;
  }, [requests, dateMode, preset, singleDate, startDate, endDate]);

  // Derived chart data (same approach as Reports page)
  const statusData = useMemo(() => {
    const counts = {};
    chartFilteredRequests.forEach((r) => {
      if (!r.isArchived) {
        const key = normalizeStatusForChart(r.status);
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([id, value]) => ({
      id,
      name: CHART_LABELS[id] || id,
      value,
    }));
  }, [chartFilteredRequests]);

  const typeData = useMemo(() => [
    { name: "NDA", count: chartFilteredRequests.filter((r) => r.type === "nda").length },
    { name: "Agreement", count: chartFilteredRequests.filter((r) => r.type === "agreement").length },
  ], [chartFilteredRequests]);

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

  const totalActive = requests.filter((r) => !r.isArchived).length;
  const totalPending = requests.filter((r) => PENDING_STATUSES.includes(r.status)).length;
  const totalApproved = requests.filter((r) => APPROVED_STATUSES.includes(r.status)).length;
  const totalRevisions = requests.filter((r) => REVISION_STATUSES.includes(r.status)).length;
  const totalArchived = requests.filter((r) => r.isArchived).length;

  const summaryCards = [
    { icon: FileText, label: "Total Requests", value: totalActive, color: "#3b82f6" },
    { icon: MoreHorizontal, label: "Reviewal", value: totalPending, color: "#f59e0b" },
    { icon: Check, label: "Approved", value: totalApproved, color: "#10b981" },
    { icon: X, label: "Revisions", value: totalRevisions, color: "#ea580c" },
    { icon: Archive, label: "Archived", value: totalArchived, color: "#64748b" },
  ];

  return (
    <div className="dashboard-page">

      {/* ── Error Banner ── */}
      {error && <div className="admin-flash-banner admin-flash-banner--error">{error}</div>}
      {/* ── Summary Cards ── */}
      <div className="responsive-grid-5 dashboard-section-gap">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "20px 24px",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: "var(--radius-md)",
              background: `${card.color}18`, display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <card.icon size={20} color={card.color} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
                {card.value}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{card.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Filtered Charts Container ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
        className="dashboard-card dashboard-section-gap"
        style={{ padding: "16px 20px 20px" }}
      >
        {/* Toolbar */}
        <div className="req-toolbar" style={{ marginBottom: 16, boxShadow: "none", border: "none", padding: 0, background: "transparent" }}>
          <div className="req-toolbar__filters req-toolbar__filters--open" style={{ borderTop: "none", paddingTop: 0 }}>
            <div className="req-toolbar__filter-group">
              <label className="req-toolbar__filter-label">Date</label>
              <FilterSelect
                value={dateMode}
                onChange={setDateMode}
                options={[
                  { value: "preset", label: "Preset" },
                  { value: "single", label: "Specific Date" },
                  { value: "range", label: "Date Range" },
                ]}
                defaultValue="preset"
              />
            </div>

            {dateMode === "preset" && (
              <div className="req-toolbar__filter-group">
                <label className="req-toolbar__filter-label">Period</label>
                <FilterSelect
                  value={preset}
                  onChange={setPreset}
                  options={[
                    { value: "all", label: "All Time" },
                    { value: "today", label: "Today" },
                    { value: "thisWeek", label: "This Week" },
                    { value: "thisMonth", label: "This Month" },
                    { value: "thisYear", label: "This Year" },
                  ]}
                />
              </div>
            )}

            {dateMode === "single" && (
              <div className="req-toolbar__filter-group">
                <label className="req-toolbar__filter-label">Date</label>
                <input className={`req-toolbar__filter-select${singleDate !== "" ? " req-toolbar__filter-select--active" : ""}`} type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} />
              </div>
            )}

            {dateMode === "range" && (
              <>
                <div className="req-toolbar__filter-group">
                  <label className="req-toolbar__filter-label">From</label>
                  <input className={`req-toolbar__filter-select${startDate !== "" ? " req-toolbar__filter-select--active" : ""}`} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="req-toolbar__filter-group">
                  <label className="req-toolbar__filter-label">To</label>
                  <input className={`req-toolbar__filter-select${endDate !== "" ? " req-toolbar__filter-select--active" : ""}`} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </>
            )}

            <button
              type="button"
              className="req-toolbar__reset-btn"
              onClick={() => {
                setDateMode("preset");
                setPreset("all");
                setSingleDate("");
                setStartDate("");
                setEndDate("");
                load({ withToast: true });
              }}
              disabled={refreshing}
              title="Reset filters and refresh"
              style={{ alignSelf: "flex-start" }}
            >
              <RefreshCw size={14} className={refreshing ? "spin-anim" : ""} />
            </button>
          </div>
        </div>

        {/* Charts */}
        <div className="responsive-grid-2">
          {/* Donut Chart – Status Distribution */}
          <div className="admin-chart-card dashboard-chart-card" style={{ boxShadow: "none", border: "1px solid var(--border)" }}>
            <div className="dashboard-chart-title">Request Status Distribution</div>
            <div className="dashboard-chart-subtitle">Current active requests by status</div>
            {statusData.length > 0 ? (
              <div className="dashboard-chart-canvas">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 8, right: 12, bottom: isCompact ? 32 : 8, left: 12 }}>
                    <Pie
                      data={statusData}
                      cx={isCompact ? "50%" : "36%"}
                      cy={isCompact ? "45%" : "50%"}
                      innerRadius={isCompact ? 45 : 55}
                      outerRadius={isCompact ? 68 : 85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[entry.id] || DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      layout={isCompact ? "horizontal" : "vertical"}
                      align={isCompact ? "center" : "right"}
                      verticalAlign={isCompact ? "bottom" : "middle"}
                      wrapperStyle={{ fontSize: 12, paddingLeft: isCompact ? 0 : 24 }}
                      formatter={(value) => {
                        const total = statusData.reduce((sum, d) => sum + d.value, 0);
                        const entry = statusData.find((d) => d.name === value);
                        const pct = entry && total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0;
                        return `${value} (${pct}%)`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="dashboard-chart-canvas dashboard-chart-empty">No data available</div>
            )}
          </div>

          {/* Bar Chart – Document Types */}
          <div className="admin-chart-card dashboard-chart-card" style={{ boxShadow: "none", border: "1px solid var(--border)" }}>
            <div className="dashboard-chart-title">Document Types</div>
            <div className="dashboard-chart-subtitle">NDA vs Agreement requests submitted</div>
            <div className="dashboard-chart-canvas">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "var(--primary-light)" }} />
                  <Bar dataKey="count" name="Requests" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Monthly Trend Line Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.49 }}
        className="admin-chart-card dashboard-chart-card dashboard-section-gap"
      >
        <div className="dashboard-chart-title">Monthly Trend</div>
        <div className="dashboard-chart-subtitle">Request volume over the last 6 months</div>
        <div className="dashboard-chart-canvas">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Total" />
            <Line type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Approved" />
            <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Pending" />
          </LineChart>
        </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── Recent Audit Logs (admin-only) ── */}
      {user?.role === "admin" ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.56 }}
          className="dashboard-audit-card"
        >
          <div className="dashboard-audit-header">
            <div className="dashboard-audit-header-title">
              <span className="dashboard-audit-title-text">Most Recent Activity</span>
            </div>
            <Link to="/admin/audit" className="dashboard-view-all-link">
              View All <ArrowRight size={13} />
            </Link>
          </div>
          <div className="dashboard-audit-list">
            {auditLogs.length === 0 ? (
              <div className="dashboard-audit-empty">
                No activity yet
              </div>
            ) : (
              auditLogs.map((log, idx) => (
                <div
                  key={log._id}
                  className={`dashboard-audit-item ${idx < auditLogs.length - 1 ? "dashboard-audit-item--bordered" : ""}`}
                >
                  <span className="dashboard-audit-action">
                    {ACTION_LABEL[log.action] || log.action}
                  </span>
                  <span className="dashboard-audit-meta">
                    {log.userId?.name || "System"}
                    {" · "}
                    {new Date(log.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      ) : null}

    </div>
  );
}


