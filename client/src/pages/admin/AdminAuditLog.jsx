import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
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
  rep_signature_submitted: "Rep Signature Submitted",
  rep_signature_declined: "Rep Signature Declined",
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

const PAGE_SIZE = 20;

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const load = async (p = page, action = actionFilter) => {
    setLoading(true);
    try {
      const res = await getAuditLogs({ page: p, limit: PAGE_SIZE, action: action || undefined });
      setLogs(res.logs || res);
      if (res.total) setTotalPages(Math.ceil(res.total / PAGE_SIZE));
      else if (res.totalPages) setTotalPages(res.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page, actionFilter); }, [page, actionFilter]);

  const handleActionFilter = (v) => {
    setActionFilter(v);
    setPage(1);
  };

  const filtered = search
    ? logs.filter(
        (l) =>
          l.action?.toLowerCase().includes(search.toLowerCase()) ||
          (l.userId?.name || "").toLowerCase().includes(search.toLowerCase()) ||
          (l.userId?.email || "").toLowerCase().includes(search.toLowerCase()) ||
          (l.resourceType || "").toLowerCase().includes(search.toLowerCase())
      )
    : logs;

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
    { label: "Rep Signature Submitted", value: "rep_signature_submitted" },
    { label: "Rep Signature Declined", value: "rep_signature_declined" },
  ];

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={18} color="var(--text-muted)" />
            Audit Trail
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
            Full system activity log — immutable record of all user and admin actions
          </p>
        </div>
        <button
          onClick={() => load(page, actionFilter)}
          title="Refresh"
          style={{
            padding: "8px 10px", borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-strong)", background: "var(--surface)",
            cursor: "pointer", display: "flex", alignItems: "center",
          }}
        >
          <RefreshCw size={14} color="var(--text-secondary)" />
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} color="var(--text-muted)" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter in current page…"
            style={{
              width: "100%", padding: "9px 12px 9px 34px", borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-strong)", background: "var(--surface)",
              fontSize: 13, fontFamily: "inherit", color: "var(--text-primary)", boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ACTION_TYPES.map((a) => (
            <button
              key={a.value || "all"}
              onClick={() => handleActionFilter(a.value)}
              style={{
                padding: "8px 12px", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: 11,
                border: "1px solid var(--border-strong)", fontFamily: "inherit", cursor: "pointer",
                background: actionFilter === a.value ? "var(--primary)" : "var(--surface)",
                color: actionFilter === a.value ? "#fff" : "var(--text-secondary)",
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-sm)",
        marginBottom: 16,
      }}>
        {loading ? (
          <div style={{ padding: "24px 20px", color: "var(--text-muted)", fontStyle: "italic", fontSize: 13 }}>Loading logs…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "32px 20px", color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>
            <Activity size={32} color="var(--border-strong)" style={{ display: "block", margin: "0 auto 10px" }} />
            No audit logs found.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                {["Timestamp", "Action", "User", "Resource", "Details", "IP"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</th>
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
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td style={{ padding: "11px 14px", color: "var(--text-muted)", fontSize: 12, whiteSpace: "nowrap" }}>
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: style.bg, color: style.color, whiteSpace: "nowrap" }}>
                        {prettyAction(log.action)}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      {log.userId ? (
                        <>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{log.userId.name || "—"}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{log.userId.email || ""}</div>
                        </>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>System</span>
                      )}
                    </td>
                    <td style={{ padding: "11px 14px", color: "var(--text-secondary)", fontSize: 12 }}>
                      {log.resourceType ? log.resourceType.charAt(0).toUpperCase() + log.resourceType.slice(1) : "—"}
                      {log.resourceId ? <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{String(log.resourceId).slice(-8)}</div> : null}
                    </td>
                    <td style={{ padding: "11px 14px", color: "var(--text-secondary)", fontSize: 12, maxWidth: 240 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.details && typeof log.details === "object" && Object.keys(log.details).length > 0
                          ? Object.entries(log.details).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(", ")
                          : log.details && typeof log.details === "string"
                          ? log.details
                          : "—"}
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", color: "var(--text-muted)", fontSize: 11, fontFamily: "monospace" }}>
                      {log.ipAddress || "—"}
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              display: "flex", alignItems: "center", padding: "7px 12px",
              borderRadius: "var(--radius-md)", border: "1px solid var(--border-strong)",
              background: "var(--surface)", cursor: page <= 1 ? "not-allowed" : "pointer",
              opacity: page <= 1 ? 0.4 : 1,
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{
              display: "flex", alignItems: "center", padding: "7px 12px",
              borderRadius: "var(--radius-md)", border: "1px solid var(--border-strong)",
              background: "var(--surface)", cursor: page >= totalPages ? "not-allowed" : "pointer",
              opacity: page >= totalPages ? 0.4 : 1,
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
