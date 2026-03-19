import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { getAuditLogs } from "../../services/auditService";
import FilterSelect from "../../components/FilterSelect";

const ACTION_COLORS = {
  CREATE: { bg: "#d1fae5", color: "#065f46" },
  UPDATE: { bg: "#dbeafe", color: "#1e3a8a" },
  DELETE: { bg: "#fee2e2", color: "#991b1b" },
  LOGIN: { bg: "#ede9fe", color: "#4c1d95" },
  LOGOUT: { bg: "#f1f5f9", color: "#475569" },
  ARCHIVE: { bg: "#fef9c3", color: "#78350f" },
  PASSWORD_RESET: { bg: "#ffedd5", color: "#9a3412" },
  REGISTER: { bg: "#d1fae5", color: "#065f46" },
  SIGNATURE: { bg: "#e0e7ff", color: "#3730a3" },
  DECLINED: { bg: "#fee2e2", color: "#991b1b" },
};

const ACTION_LABELS = {
  login: "Login",
  login_failed: "Login Failed",
  login_otp_sent: "Login OTP Sent",
  account_created: "Account Created",
  account_activated: "Account Activated",
  email_verified: "Email Verified",
  request_created: "Request Created",
  request_approved: "Request Approved",
  request_revision_required: "Revision Requested",
  request_resubmitted: "Request Resubmitted",
  password_changed: "Password Changed",
  password_reset_requested: "Password Reset Requested",
  password_reset_triggered_by_admin: "Password Reset (Admin)",
  user_activated: "User Activated",
  user_deactivated: "User Deactivated",
  signing_link_generated: "Signing Link Generated",
  rep_signature_submitted: "Representative Signature Submitted",
  rep_signature_declined: "Representative Signature Declined",
};

const prettyAction = (action) =>
  ACTION_LABELS[action] || (action ? action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—");

const actionStyle = (action = "") => {
  // Direct match
  const upper = action.toUpperCase();
  if (ACTION_COLORS[upper]) return ACTION_COLORS[upper];
  // Category match
  if (upper.includes("LOGIN") || upper.includes("OTP")) return ACTION_COLORS.LOGIN;
  if (upper.includes("DECLINED") || upper.includes("FAILED") || upper.includes("DEACTIVATED")) return ACTION_COLORS.DECLINED;
  if (upper.includes("CREATED") || upper.includes("REGISTER") || upper.includes("ACTIVATED") || upper.includes("VERIFIED")) return ACTION_COLORS.CREATE;
  if (upper.includes("APPROVED") || upper.includes("UPDATED") || upper.includes("RESUBMIT")) return ACTION_COLORS.UPDATE;
  if (upper.includes("PASSWORD") || upper.includes("RESET")) return ACTION_COLORS.PASSWORD_RESET;
  if (upper.includes("SIGN")) return ACTION_COLORS.SIGNATURE;
  if (upper.includes("ARCHIVE")) return ACTION_COLORS.ARCHIVE;
  return { bg: "#f1f5f9", color: "#64748b" };
};

const formatActor = (user) => {
  if (!user) return "System";
  const role = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "User";
  return `${role} ${user.name || user.email || "User"}`;
};

const formatAuditDetails = (log) => {
  const actor = formatActor(log.userId);
  const details = log.details && typeof log.details === "object" ? log.details : {};
  const resourceLabel = log.resourceType || "record";
  const resourceId = log.resourceId ? ` (${String(log.resourceId).slice(-8)})` : "";

  switch (log.action) {
    case "login":
      return `${actor} signed in successfully.`;
    case "login_failed":
      return `${actor} failed to sign in (${details.reason || "invalid credentials"}).`;
    case "login_otp_sent":
      return `A login OTP was sent to ${actor}.`;
    case "verification_otp_sent":
      return `A verification OTP was sent to ${actor} before account access.`;
    case "account_created":
      if (details.createdBy === "admin") {
        return `${actor} created an account for ${details.targetEmail || "a user"} with role ${details.role || "student"}.`;
      }
      return `${actor} created a new account.`;
    case "account_activated":
      return `${actor} activated their account.`;
    case "email_verified":
      return `${actor} verified their email address.`;
    case "request_created":
      return `${actor} submitted a ${String(details.type || "document").toUpperCase()} request.`;
    case "request_resubmitted":
      return `${actor} resubmitted a ${String(details.type || "document").toUpperCase()} request.`;
    case "request_approved":
      return `${actor} approved a ${resourceLabel}${resourceId}.`;
    case "request_revision_required":
      return `${actor} requested revisions for a ${resourceLabel}${resourceId}.`;
    case "signing_link_generated":
      return `${actor} generated a representative signing link.`;
    case "rep_signature_submitted":
      return `Representative ${details.repName || "user"} submitted a signature.`;
    case "rep_signature_declined":
      return `The representative declined the signing request.`;
    case "password_changed":
      return `${actor} changed their password (${details.method || "profile"}).`;
    case "password_reset_requested":
      return `${actor} requested a password reset OTP.`;
    case "password_reset_triggered_by_admin":
      return `${actor} triggered a password reset OTP for ${details.targetEmail || "a user"}.`;
    case "user_activated":
      return `${actor} reactivated ${details.targetEmail || "a user account"}.`;
    case "user_deactivated":
      return `${actor} deactivated ${details.targetEmail || "a user account"}.`;
    default:
      if (typeof log.details === "string" && log.details.trim()) return log.details;
      if (log.details && typeof log.details === "object" && Object.keys(log.details).length > 0) {
        return Object.entries(log.details).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(", ");
      }
      return "No additional details were recorded.";
  }
};

const PAGE_SIZE = 20;

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [isPillsOpen, setIsPillsOpen] = useState(false);
  const [dateMode, setDateMode] = useState("preset");
  const [preset, setPreset] = useState("all");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const load = useCallback(async (p = page, action = actionFilter, withToast = false) => {
    setLoading(true);
    if (withToast) setRefreshing(true);
    setError("");
    try {
      const res = await getAuditLogs({ page: p, limit: PAGE_SIZE, action: action || undefined });
      setLogs(res.logs || res);
      if (res.total) setTotalPages(Math.ceil(res.total / PAGE_SIZE));
      else if (res.totalPages) setTotalPages(res.totalPages);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to load audit logs";
      const status = err.response?.status;
      setError(`${msg}${status ? ` (HTTP ${status})` : ""}`);
      console.error("Audit log load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [actionFilter, page]);

  useEffect(() => { load(page, actionFilter); }, [actionFilter, load, page]);

  const handleActionFilter = (v) => {
    setActionFilter(v);
    setPage(1);
  };

  const filtered = useMemo(() => {
    let result = logs;

    if (dateMode === "preset" && preset !== "all") {
      const now = new Date();
      let from = null;
      if (preset === "today") {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (preset === "thisWeek") {
        const day = now.getDay();
        from = new Date(now); from.setDate(now.getDate() - ((day + 6) % 7)); from.setHours(0,0,0,0);
      } else if (preset === "thisMonth") {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (preset === "thisYear") {
        from = new Date(now.getFullYear(), 0, 1);
      }
      if (from) result = result.filter((l) => new Date(l.createdAt) >= from);
    }
    if (dateMode === "single" && singleDate) {
      const d = new Date(singleDate);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      result = result.filter((l) => { const t = new Date(l.createdAt); return t >= d && t < next; });
    }
    if (dateMode === "range") {
      if (startDate) result = result.filter((l) => new Date(l.createdAt) >= new Date(startDate));
      if (endDate) { const end = new Date(endDate); end.setDate(end.getDate() + 1); result = result.filter((l) => new Date(l.createdAt) < end); }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((l) => {
        const name = (l.userId?.name || "").toLowerCase();
        const email = (l.userId?.email || "").toLowerCase();
        const resource = (l.resourceType || "").toLowerCase();
        const resourceId = (l.resourceId ? String(l.resourceId).slice(-7).toLowerCase() : "");
        return name.includes(q) || email.includes(q) || resource.includes(q) || resourceId.includes(q);
      });
    }

    return result;
  }, [logs, dateMode, preset, singleDate, startDate, endDate, searchQuery]);

  const ACTION_TYPES = [
    { label: "All Actions", value: "" },
    { label: "Login", value: "login" },
    { label: "Login Failed", value: "login_failed" },
    { label: "Account Created", value: "account_created" },
    { label: "Request Created", value: "request_created" },
    { label: "Request Approved", value: "request_approved" },
    { label: "Revision Requested", value: "request_revision_required" },
    { label: "Request Resubmitted", value: "request_resubmitted" },
    { label: "Password Changed", value: "password_changed" },
    { label: "Password Reset", value: "password_reset_requested" },
    { label: "User Activated", value: "user_activated" },
    { label: "User Deactivated", value: "user_deactivated" },
    { label: "Email Verified", value: "email_verified" },
    { label: "Signing Link Generated", value: "signing_link_generated" },
    { label: "Representative Signature Submitted", value: "rep_signature_submitted" },
    { label: "Representative Signature Declined", value: "rep_signature_declined" },
  ];

  return (
    <div className="page-shell">
      {/* Error Banner */}
      {error && (
        <div className="info-banner info-banner--danger" style={{ marginBottom: 16 }}>
          <strong>{error}</strong>
        </div>
      )}

      {/* Toolbar */}
      <div className="req-toolbar" style={{ borderTop: "none" }}>
        {/* Search row */}
        <div className="req-toolbar__search-row">
          <div className="req-toolbar__search-box">
            <input
              type="text"
              className="req-toolbar__search-input"
              placeholder="Search by name or resource..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery ? (
              <button type="button" className="req-toolbar__search-clear" onClick={() => setSearchQuery("")} aria-label="Clear search">
                ×
              </button>
            ) : null}
            <span className="req-toolbar__search-inline-btn" style={{ pointerEvents: "none" }}>
              <Search size={14} />
            </span>
          </div>
        </div>

        {/* Filters row: Action + date filters + refresh */}
        <div className="req-toolbar__filters">
          <div className="req-toolbar__filter-group">
            <label className="req-toolbar__filter-label">Action</label>
            <button
              type="button"
              className="req-toolbar__filter-btn"
              data-open={isPillsOpen}
              onClick={() => setIsPillsOpen((p) => !p)}
            >
              <span>{ACTION_TYPES.find((a) => a.value === actionFilter)?.label ?? "All Actions"}</span>
            </button>
          </div>

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
            onClick={() => { load(page, actionFilter, true); setPreset("all"); setDateMode("preset"); setSingleDate(""); setStartDate(""); setEndDate(""); }}
            disabled={refreshing}
            title="Reset filters and refresh"
          >
            <RefreshCw size={14} className={refreshing ? "spin-anim" : ""} />
          </button>
        </div>

        {/* Row 3: Action pills */}
        {isPillsOpen && (
          <div className="req-toolbar__pills-row" style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
            {ACTION_TYPES.map((a) => (
              <button
                key={a.value || "all"}
                type="button"
                onClick={() => handleActionFilter(a.value)}
                className={`req-toolbar__pill ${actionFilter === a.value ? "req-toolbar__pill--active" : ""}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="dashboard-card">
        <div className="table-scroll">
          <table className="dashboard-table">
            <thead>
              <tr className="dashboard-table-title-row">
                <th colSpan={5}>
                  <div className="dashboard-table-title-wrap">
                    <span className="dashboard-table-title">Logs</span>
                  </div>
                </th>
              </tr>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>User</th>
                <th>Resource</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={`sk-${i}`}>
                    <td><span className="skeleton-block skeleton-text" /></td>
                    <td><span className="skeleton-block skeleton-pill" /></td>
                    <td><span className="skeleton-block skeleton-text" /></td>
                    <td><span className="skeleton-block skeleton-text" /></td>
                    <td><span className="skeleton-block skeleton-text" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="dashboard-empty">
                      <p className="dashboard-empty-title">No audit logs found</p>
                      <p className="dashboard-empty-text">No logs match the current filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((log, i) => (
                  <motion.tr
                    key={log._id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}
                  >
                    <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)", fontSize: 13 }}>
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td style={{ fontWeight: 500 }}>{prettyAction(log.action)}</td>
                    <td>
                      {log.userId ? (
                        <>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{log.userId.name || "—"}</div>
                          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{log.userId.email || ""}</div>
                        </>
                      ) : (
                        <span style={{ fontStyle: "italic", color: "var(--text-muted)", fontSize: 13 }}>System</span>
                      )}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                      {log.resourceId
                        ? <span>{String(log.resourceId).slice(-7).toUpperCase()}</span>
                        : (log.resourceType ? log.resourceType.charAt(0).toUpperCase() + log.resourceType.slice(1) : "—")}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: 13, maxWidth: 260 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={formatAuditDetails(log)}>
                        {formatAuditDetails(log)}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="admin-pagination">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="admin-pagination-btn"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="admin-pagination-text">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="admin-pagination-btn"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

