import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { getAuditLogs } from "../../services/auditService";

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
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 768;
  });

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
    if (!search) return logs;
    const normalized = search.toLowerCase();
    return logs.filter(
      (l) =>
        l.action?.toLowerCase().includes(normalized) ||
        (l.userId?.name || "").toLowerCase().includes(normalized) ||
        (l.userId?.email || "").toLowerCase().includes(normalized) ||
        (l.resourceType || "").toLowerCase().includes(normalized)
    );
  }, [logs, search]);

  const ACTION_TYPES = [
    { label: "All Actions", value: "" },
    { label: "Login", value: "login" },
    { label: "Login Failed", value: "login_failed" },
    { label: "Account Created", value: "account_created" },
    { label: "Account Activated", value: "account_activated" },
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
      {/* Header */}
      <div className="page-header-row" style={{ marginBottom: 16 }}>
        <div>
          <p className="admin-subtitle">
            Full system activity log — immutable record of all user and admin actions
          </p>
        </div>
        <button
          onClick={() => load(page, actionFilter, true)}
          title="Refresh"
          className="ui-btn ui-btn--secondary"
          style={{ padding: "8px 10px" }}
          disabled={refreshing}
        >
          <RefreshCw size={14} className={refreshing ? "spin-anim" : ""} />
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="info-banner info-banner--danger" style={{ marginBottom: 16 }}>
          <strong>{error}</strong>
        </div>
      )}

      {/* Filters */}
      <div className="admin-controls-row">
        <div className="admin-search-wrap">
          <Search size={14} className="admin-search-icon" />
          <input
            className="ui-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter in current page…"
            style={{ width: "100%", paddingLeft: 34 }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 220 }}>
          <button
            onClick={() => setFiltersOpen((prev) => !prev)}
            className="ui-btn ui-btn--secondary"
            style={{ justifyContent: "space-between", width: "100%" }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <SlidersHorizontal size={14} />
              Filter Options
            </span>
            {filtersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {filtersOpen ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ACTION_TYPES.map((a) => (
                <button
                  key={a.value || "all"}
                  onClick={() => handleActionFilter(a.value)}
                  className={`ui-btn ${actionFilter === a.value ? "ui-btn--primary" : "ui-btn--secondary"}`}
                  style={{ padding: "7px 10px", fontSize: 11 }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-card" style={{ marginBottom: 16 }}>
        {loading ? (
          <table className="admin-table admin-table--min-960">
            <thead>
              <tr>
                {["Timestamp", "Action", "User", "Resource", "Details"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(6)].map((_, i) => (
                <tr key={`sk-${i}`}>
                  <td><span className="skeleton-block skeleton-text" /></td>
                  <td><span className="skeleton-block skeleton-pill" /></td>
                  <td><span className="skeleton-block skeleton-text" /></td>
                  <td><span className="skeleton-block skeleton-text" /></td>
                  <td><span className="skeleton-block skeleton-text" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : filtered.length === 0 ? (
          <div className="admin-table-empty">
            <Activity size={32} color="var(--border-strong)" className="admin-table-empty-icon" />
            No audit logs found.
          </div>
        ) : (
          <table className="admin-table admin-table--min-960">
            <thead>
              <tr>
                {["Timestamp", "Action", "User", "Resource", "Details"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => {
                const style = actionStyle(log.action);
                return (
                  <motion.tr
                    key={log._id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}
                  >
                    <td className="admin-cell-small-muted" style={{ whiteSpace: "nowrap" }}>
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td>
                      {prettyAction(log.action)}
                    </td>
                    <td>
                      {log.userId ? (
                        <>
                          <div className="admin-cell-strong">{log.userId.name || "—"}</div>
                          <div className="admin-cell-mono">{log.userId.email || ""}</div>
                        </>
                      ) : (
                        <span className="admin-cell-small-muted" style={{ fontStyle: "italic" }}>System</span>
                      )}
                    </td>
                    <td className="admin-cell-small-muted" style={{ color: "var(--text-secondary)" }}>
                      {log.resourceId
                        ? <span>{String(log.resourceId).slice(-7).toUpperCase()}</span>
                        : (log.resourceType ? log.resourceType.charAt(0).toUpperCase() + log.resourceType.slice(1) : "—")}
                    </td>
                    <td className="admin-cell-small-muted" style={{ color: "var(--text-secondary)", maxWidth: 240 }}>
                      <div className="admin-cell-ellipsis" title={formatAuditDetails(log)}>
                        {formatAuditDetails(log)}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
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

