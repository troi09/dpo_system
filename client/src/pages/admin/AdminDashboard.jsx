import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line,
} from "recharts";
import {
  FileText, Clock, CheckCircle, Archive, Activity,
  ArrowRight, RefreshCw,
} from "lucide-react";
import { getAllRequests } from "../../services/requestService";
import { getRecentAuditLogs } from "../../services/auditService";
import { AuthContext } from "../../context/AuthContext";
import {
  APPROVED_STATUSES,
  PENDING_STATUSES,
  CHART_LABELS,
  CHART_COLORS,
  normalizeStatusForChart,
} from "../../utils/requestStatusCharts";

const STATUS_LABEL = {
  nda_submitted:              "Submitted",
  nda_admin_reviewal:         "Admin Reviewal",
  nda_approved:               "Approved",
  nda_revision_requested:      "Revision Requested",
  agreement_submitted:                "Submitted",
  agreement_initial_admin_reviewal:   "Initial Admin Reviewal",
  agreement_awaiting_rep_approval:    "Awaiting Representative Approval",
  agreement_final_admin_reviewal:     "Final Admin Reviewal",
  agreement_approved:                 "Approved",
  agreement_rep_declined:             "Representative Declined",
  agreement_rep_revision_requested:   "Representative Revision Requested",

  // Legacy fallback labels
  nda_pending:                "Admin Reviewal",
  revision_requested:         "Revision Requested",
  agr_pending_1:              "Initial Admin Reviewal",
  agr_awaiting_rep_signature: "Awaiting Representative Approval",
  agr_pending_2:              "Final Admin Reviewal",
  agr_approved:               "Approved",
  agr_rep_declined:           "Representative Declined",
  agr_rep_revision_requested: "Representative Revision Requested",
};

const DONUT_COLORS = ["#059669", "#ea580c", "#7c3aed", "#ca8a04", "#2563eb", "#dc2626", "#64748b", "#3b82f6"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const prettyStatus = (s) => STATUS_LABEL[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "—");

const statusPillClass = (s) => {
  if (s === "nda_approved" || s === "agreement_approved" || s === "agr_approved") return "status-pill status-pill--green";
  if (s === "nda_submitted" || s === "agreement_submitted" || s === "agr_pending_1") return "status-pill status-pill--orange";
  if (s === "nda_admin_reviewal" || s === "agreement_initial_admin_reviewal" || s === "agreement_final_admin_reviewal" || s === "nda_pending" || s === "agr_pending_2") return "status-pill status-pill--yellow";
  if (s === "nda_revision_requested" || s === "agreement_rep_revision_requested" || s === "revision_requested" || s === "agr_rep_revision_requested") return "status-pill status-pill--red";
  if (s === "agreement_awaiting_rep_approval" || s === "agr_awaiting_rep_signature") return "status-pill status-pill--blue";
  if (s === "agreement_rep_declined" || s === "agr_rep_declined") return "status-pill status-pill--violet";
  return "status-pill";
};

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
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });

  // Date range filter for charts
  const [chartStartDate, setChartStartDate] = useState("");
  const [chartEndDate, setChartEndDate] = useState("");
  const hasDateFilter = Boolean(chartStartDate || chartEndDate);

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
      if (withToast && errors.length === 0) {
        setNotice("Data updated");
        setTimeout(() => setNotice(""), 1800);
      }
      setLoading(false);
      setRefreshing(false);
    };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recentRequests = requests.slice(0, 4);

  // Filtered requests for charts based on date range
  const chartFilteredRequests = useMemo(() => {
    if (!chartStartDate && !chartEndDate) return requests;
    return requests.filter((r) => {
      const d = new Date(r.createdAt);
      if (chartStartDate && d < new Date(chartStartDate)) return false;
      if (chartEndDate && d > new Date(chartEndDate + "T23:59:59")) return false;
      return true;
    });
  }, [requests, chartStartDate, chartEndDate]);

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

  const typeData = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const dataset = hasDateFilter
      ? chartFilteredRequests
      : requests.filter((r) => {
          const created = new Date(r.createdAt);
          return created >= monthStart && created <= monthEnd;
        });

    return [
      { name: "NDA", count: dataset.filter((r) => r.type === "nda").length },
      { name: "Agreement", count: dataset.filter((r) => r.type === "agreement").length },
    ];
  }, [chartFilteredRequests, hasDateFilter, requests]);

  const documentTypesTitle = useMemo(() => {
    if (hasDateFilter) return "Document Types";
    return `Document Types - Month of ${new Date().toLocaleString("en-US", { month: "long" })}`;
  }, [hasDateFilter]);

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
  const totalArchived = requests.filter((r) => r.isArchived).length;

  const summaryCards = [
    { icon: FileText, label: "Total Requests", value: totalActive, color: "#3b82f6" },
    { icon: Clock, label: "Pending", value: totalPending, color: "#f59e0b" },
    { icon: CheckCircle, label: "Approved/Completed", value: totalApproved, color: "#10b981" },
    { icon: Archive, label: "Archived", value: totalArchived, color: "#64748b" },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Date Range Picker for chart filtering */}
          <input
            type="date"
            className="ui-input"
            value={chartStartDate}
            onChange={(e) => setChartStartDate(e.target.value)}
            style={{ height: 32, fontSize: 12, padding: "0 8px" }}
            title="Chart Start Date"
          />
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>–</span>
          <input
            type="date"
            className="ui-input"
            value={chartEndDate}
            onChange={(e) => setChartEndDate(e.target.value)}
            style={{ height: 32, fontSize: 12, padding: "0 8px" }}
            title="Chart End Date"
          />
          {(chartStartDate || chartEndDate) && (
            <button
              type="button"
              className="ui-btn ui-btn--secondary ui-btn--compact"
              onClick={() => { setChartStartDate(""); setChartEndDate(""); }}
              style={{ fontSize: 11 }}
            >
              Clear
            </button>
          )}
          <button
            className="dashboard-action ui-btn--compact"
            type="button"
            onClick={() => load({ withToast: true })}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? "spin-anim" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {notice ? (
        <div className="info-banner info-banner--success mb-12">
          <strong>{notice}</strong>
        </div>
      ) : null}

      {/* ── Error Banner ── */}
      {error && <div className="admin-flash-banner admin-flash-banner--error">{error}</div>}
      {/* ── Summary Cards ── */}
      <div className="responsive-grid-4 dashboard-section-gap">
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

      {/* ── TOP: Analytics Charts ── */}
      <div className="responsive-grid-2 dashboard-section-gap">
        {/* Donut Chart – Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="admin-chart-card dashboard-chart-card"
        >
          <div className="dashboard-chart-title">
            Request Status Distribution
          </div>
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
                />
              </PieChart>
            </ResponsiveContainer>
            </div>
          ) : (
            <div className="dashboard-chart-canvas dashboard-chart-empty">
              No data available
            </div>
          )}
        </motion.div>

        {/* Bar Chart – Document Types */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
          className="admin-chart-card dashboard-chart-card"
        >
          <div className="dashboard-chart-title">
            {documentTypesTitle}
          </div>
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
        </motion.div>
      </div>

      {/* ── MIDDLE: Recent Requests ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
        className="dashboard-card dashboard-section-gap"
      >
        <div className="table-scroll">
        <table className="dashboard-table">
          <thead>
            <tr className="dashboard-table-title-row">
              <th colSpan={5}>
                <div className="dashboard-table-title-wrap">
                  <span className="dashboard-table-title">Recent Requests</span>
                  <Link
                    to="/admin/requests"
                    className="dashboard-view-all-link"
                  >
                    View All <ArrowRight size={13} />
                  </Link>
                </div>
              </th>
            </tr>
            <tr>
              <th>Student</th>
              <th>Type</th>
              <th>Status</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <tr key={i}>
                  <td><div className="skeleton-row" style={{ padding: 0, border: "none" }}><div className="skeleton-block skeleton-block--lg" /><div className="skeleton-block skeleton-block--md" style={{ height: 10 }} /></div></td>
                  <td><div className="skeleton-block skeleton-block--md" /></td>
                  <td><div className="skeleton-block skeleton-block--sm" style={{ borderRadius: 99 }} /></td>
                  <td><div className="skeleton-block skeleton-block--sm" /></td>
                  <td><div className="skeleton-block skeleton-block--sm" /></td>
                </tr>
              ))
            ) : recentRequests.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="dashboard-empty">
                    <FileText size={32} strokeWidth={1.5} color="var(--text-muted)" />
                    <p className="dashboard-empty-title">No requests yet</p>
                    <p className="dashboard-empty-text">Student requests will appear here once submitted.</p>
                  </div>
                </td>
              </tr>
            ) : (
              recentRequests.map((r) => (
                <tr key={r._id}>
                  <td>
                    <span className="dashboard-student-name">{r.userId?.name || "Unknown"}</span>
                    <span className="dashboard-subtext">{r.userId?.email || ""}</span>
                  </td>
                  <td>
                    {r.type === "nda"
                      ? `NDA${r.formData?.ndaTypeLabel ? ` — ${r.formData.ndaTypeLabel}` : ""}`
                      : "Agreement"}
                  </td>
                  <td>
                    <span className={statusPillClass(r.status)}>{prettyStatus(r.status)}</span>
                  </td>
                  <td>{new Date(r.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>
                  <td>
                    <button
                      className="dashboard-action"
                      onClick={() => navigate(`/admin/requests/${r._id}`)}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
            <Line type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Approved/Completed" />
            <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Pending" />
          </LineChart>
        </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── BOTTOM: Recent Audit Logs (admin-only) ── */}
      {user?.role === "admin" ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.56 }}
          className="dashboard-audit-card"
        >
          <div className="dashboard-audit-header">
            <div className="dashboard-audit-header-title">
              <Activity size={16} color="var(--primary)" />
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


