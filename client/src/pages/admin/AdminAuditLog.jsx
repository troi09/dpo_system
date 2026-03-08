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
};

const actionStyle = (action = "") => {
  const key = action.toUpperCase().split("_")[0];
  return ACTION_COLORS[action.toUpperCase()] || ACTION_COLORS[key] || { bg: "#f1f5f9", color: "#64748b" };
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
      if (res.totalPages) setTotalPages(res.totalPages);
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

  const ACTION_TYPES = ["", "CREATE", "UPDATE", "LOGIN", "LOGOUT", "PASSWORD_RESET", "REGISTER", "ARCHIVE"];

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
              key={a || "all"}
              onClick={() => handleActionFilter(a)}
              style={{
                padding: "8px 12px", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: 11,
                border: "1px solid var(--border-strong)", fontFamily: "inherit", cursor: "pointer",
                background: actionFilter === a ? "var(--primary)" : "var(--surface)",
                color: actionFilter === a ? "#fff" : "var(--text-secondary)",
              }}
            >
              {a || "All Actions"}
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
                        {log.action || "—"}
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
                      {log.resourceType || "—"}
                      {log.resourceId ? <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{String(log.resourceId).slice(-8)}</div> : null}
                    </td>
                    <td style={{ padding: "11px 14px", color: "var(--text-secondary)", fontSize: 12, maxWidth: 240 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.details ? (typeof log.details === "string" ? log.details : JSON.stringify(log.details)) : "—"}
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
