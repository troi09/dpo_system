import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Search, Filter, X } from "lucide-react";
import { getAllRequests } from "../../services/requestService";
import { getAuditLogs } from "../../services/auditService";

const STATUS_LABEL = {
  nda_pending: "Reviewal",
  nda_approved: "Approved",
  stud_revision_requested: "Student Revisions",
  agr_pending_1: "Initial Reviewal",
  agr_awaiting_rep_signature: "Recipient Reviewal",
  agr_pending_2: "Final Reviewal",
  agr_approved: "Approved",
  agr_declined: "Recipient Declined",
  agr_rep_revision_requested: "Recipient Revisions",
};

const prettyStatus = (s) =>
  STATUS_LABEL[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "—");

const statusPillClass = (s) => {
  if (["nda_approved", "agr_approved"].includes(s)) return "status-pill status-pill--green";
  if (["nda_pending", "agr_pending_1", "agr_pending_2"].includes(s)) return "status-pill status-pill--yellow";
  if (s === "stud_revision_requested") return "status-pill status-pill--orange";
  if (s === "agr_rep_revision_requested") return "status-pill status-pill--violet";
  if (s === "agr_awaiting_rep_signature") return "status-pill status-pill--blue";
  if (s === "agr_declined") return "status-pill status-pill--red";
  return "status-pill";
};

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "nda_pending,agr_pending_1,agr_pending_2", label: "Reviewal" },
  { value: "nda_approved,agr_approved", label: "Approved" },
  { value: "stud_revision_requested", label: "Student Revisions" },
  { value: "agr_rep_revision_requested", label: "Recipient Revisions" },
  { value: "agr_declined", label: "Recipient Declined" },
  { value: "agr_awaiting_rep_signature", label: "Recipient Reviewal" },
];



const TIMELINE_STEPS = {
  request_created:           { label: "Submitted",                  color: "#3b82f6" },
  request_resubmitted:       { label: "Re-submitted",               color: "#3b82f6" },
  signing_link_generated:    { label: "Sent to Recipient",          color: "#8b5cf6" },
  rep_signature_submitted:   { label: "Recipient Signed",           color: "#10b981" },
  rep_signature_declined:    { label: "Recipient Declined",         color: "#ef4444" },
  request_approved:          { label: "Approved",                   color: "#10b981" },
  request_revision_required: (log) =>
    log.details?.newStatus === "agr_rep_revision_requested"
      ? { label: "Recipient Revision Requested", color: "#f59e0b" }
      : { label: "Student Revision Requested",   color: "#f59e0b" },
};

const resolveStep = (log) => {
  const entry = TIMELINE_STEPS[log.action];
  if (!entry) return null;
  return typeof entry === "function" ? entry(log) : entry;
};

export default function AdminReports() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [timelineRequest, setTimelineRequest] = useState(null);
  const [timelineLogs, setTimelineLogs] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  // Filter state
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateMode, setDateMode] = useState("preset");
  const [preset, setPreset] = useState("all");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Filter panel open/close
  const [isFilterOpen, setIsFilterOpen] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 768
  );

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const buildDateParams = () => {
    const params = {};
    const now = new Date();
    if (dateMode === "preset") {
      if (preset === "today") {
        params.startDate = now.toISOString().slice(0, 10);
        params.endDate = now.toISOString().slice(0, 10);
      } else if (preset === "thisWeek") {
        const day = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((day + 6) % 7));
        params.startDate = monday.toISOString().slice(0, 10);
      } else if (preset === "thisMonth") {
        params.startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      } else if (preset === "thisYear") {
        params.startDate = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      }
    } else if (dateMode === "single" && singleDate) {
      params.startDate = singleDate;
      params.endDate = singleDate;
    } else if (dateMode === "range") {
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
    }
    return params;
  };

  const load = async ({ withToast = false } = {}) => {
    setLoading(true);
    if (withToast) setRefreshing(true);
    setError("");
    try {
      const data = await getAllRequests(buildDateParams());
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to load data";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { load(); setPage(1); }, [dateMode, preset, singleDate, startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setIsFilterOpen(true); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const clearSearch = () => { setSearchTerm(""); setPage(1); };

  const resetAndRefresh = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setStatusFilter("");
    setDateMode("preset");
    setPreset("all");
    setSingleDate("");
    setStartDate("");
    setEndDate("");
    setPage(1);
    load({ withToast: true });
  };

  const filteredRequests = useMemo(() => {
    let result = [...requests];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((r) => {
        const name = (r.userId?.name || r.proxyRequestee?.fullName || "").toLowerCase();
        const email = (r.userId?.email || r.proxyRequestee?.email || "").toLowerCase();
        const id = (r._id || "").slice(-7).toLowerCase();
        return name.includes(term) || email.includes(term) || id.includes(term.toLowerCase());
      });
    }

    if (statusFilter) {
      const statuses = statusFilter.split(",");
      result = result.filter((r) => statuses.includes(r.status));
    }

    if (typeFilter !== "all") {
      if (typeFilter === "agreement") {
        result = result.filter((r) => r.type === "agreement");
      } else if (typeFilter === "nda_orgactivities") {
        result = result.filter((r) => r.type === "nda" && r.formData?.ndaType === "orgactivities");
      } else if (typeFilter === "nda_research") {
        result = result.filter((r) => r.type === "nda" && r.formData?.ndaType === "research");
      }
    }

    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return result;
  }, [requests, searchTerm, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const paginatedRequests = filteredRequests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openTimeline = async (r) => {
    setTimelineRequest(r);
    setTimelineLoading(true);
    setTimelineLogs([]);
    try {
      const data = await getAuditLogs({ resourceId: r._id, limit: 50 });
      const sorted = (data.logs || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setTimelineLogs(sorted);
    } catch { /* silent */ } finally {
      setTimelineLoading(false);
    }
  };


  return (
    <div className="page-shell">
      {error && (
        <div className="info-banner info-banner--danger" style={{ marginBottom: 12 }}>{error}</div>
      )}

      {/* ── Search + Filter toolbar ── */}
      <div className="req-toolbar">
        {/* Search row */}
        <div className="req-toolbar__search-row">
          <div className="req-toolbar__search-box">
            <input
              type="text"
              className="req-toolbar__search-input"
              placeholder="Search by requestee, email, or request ID…"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
            {searchTerm ? (
              <button type="button" className="req-toolbar__search-clear" onClick={clearSearch} aria-label="Clear search">
                ×
              </button>
            ) : null}
            <span className="req-toolbar__search-inline-btn" style={{ pointerEvents: "none" }}>
              <Search size={14} />
            </span>
          </div>
          <button
            type="button"
            className="ui-btn ui-btn--secondary req-toolbar__filter-toggle"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            aria-expanded={isFilterOpen}
          >
            <Filter size={13} />
            Filters
          </button>
        </div>

        {/* Filter chips row */}
        <div className={`req-toolbar__filters${isFilterOpen ? " req-toolbar__filters--open" : ""}`}>
          <div className="req-toolbar__filter-group">
            <label className="req-toolbar__filter-label">Type</label>
            <select
              className="req-toolbar__filter-select"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            >
              <option value="all">All Types</option>
              <option value="nda_orgactivities">NDA — Student Organization Activities</option>
              <option value="nda_research">NDA — Conduct of Research</option>
              <option value="agreement">Agreement</option>
            </select>
          </div>

          <div className="req-toolbar__filter-group">
            <label className="req-toolbar__filter-label">Status</label>
            <select
              className="req-toolbar__filter-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              {STATUS_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="req-toolbar__filter-group">
            <label className="req-toolbar__filter-label">Date</label>
            <select
              className="req-toolbar__filter-select"
              value={dateMode}
              onChange={(e) => setDateMode(e.target.value)}
            >
              <option value="preset">Preset</option>
              <option value="single">Specific Date</option>
              <option value="range">Date Range</option>
            </select>
          </div>

          {dateMode === "preset" ? (
            <div className="req-toolbar__filter-group">
              <label className="req-toolbar__filter-label">Period</label>
              <select
                className="req-toolbar__filter-select"
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
              >
                <option value="today">Today</option>
                <option value="thisWeek">This Week</option>
                <option value="thisMonth">This Month</option>
                <option value="thisYear">This Year</option>
                <option value="all">All Dates</option>
              </select>
            </div>
          ) : null}

          {dateMode === "single" ? (
            <div className="req-toolbar__filter-group">
              <label className="req-toolbar__filter-label">Date</label>
              <input
                className="req-toolbar__filter-select"
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
              />
            </div>
          ) : null}

          {dateMode === "range" ? (
            <>
              <div className="req-toolbar__filter-group">
                <label className="req-toolbar__filter-label">From</label>
                <input
                  className="req-toolbar__filter-select"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="req-toolbar__filter-group">
                <label className="req-toolbar__filter-label">To</label>
                <input
                  className="req-toolbar__filter-select"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </>
          ) : null}

          <button
            type="button"
            className="req-toolbar__reset-btn"
            onClick={resetAndRefresh}
            disabled={refreshing}
            title="Reset filters and refresh"
          >
            <RefreshCw size={14} className={refreshing ? "spin-anim" : ""} />
          </button>
        </div>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="dashboard-card"
      >
        <div className="table-scroll">
          <table className="dashboard-table">
            <thead>
              <tr className="dashboard-table-title-row">
                <th colSpan={6}>
                  <div className="dashboard-table-title-wrap">
                    <span className="dashboard-table-title">Transactions</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {filteredRequests.length}
                    </span>
                  </div>
                </th>
              </tr>
              <tr>
                <th>Last Updated</th>
                <th>Requestee</th>
                <th>Request ID</th>
                <th>Type</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    <td><span className="skeleton-block skeleton-text" /></td>
                    <td><span className="skeleton-block skeleton-text" /></td>
                    <td><span className="skeleton-block skeleton-text" /></td>
                    <td><span className="skeleton-block skeleton-text" /></td>
                    <td><span className="skeleton-block skeleton-pill" /></td>
                    <td />
                  </tr>
                ))
              ) : paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="dashboard-empty">
                      <p className="dashboard-empty-title">No transactions found</p>
                      <p className="dashboard-empty-text">No records match the current filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((r) => {
                  const name = r.proxyRequestee?.isProxy
                    ? (`${r.proxyRequestee.firstName || ""} ${r.proxyRequestee.lastName || ""}`.trim() || r.proxyRequestee.fullName || "—")
                    : (r.userId?.name || "—");
                  const lastUpdated = r.updatedAt || r.createdAt;
                  const dateStr = lastUpdated
                    ? `${new Date(lastUpdated).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })} ${new Date(lastUpdated).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}`
                    : "—";
                  const typeLabel = r.type === "nda"
                    ? `NDA${r.formData?.ndaTypeLabel ? ` — ${r.formData.ndaTypeLabel}` : ""}`
                    : r.type === "agreement" ? "Agreement" : (r.type || "—");
                  return (
                    <tr key={r._id} onClick={() => openTimeline(r)} style={{ cursor: "pointer" }}>
                      <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{dateStr}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{name}</span>
                        {r.proxyRequestee?.isProxy && (
                          <span className="dashboard-subtext">Proxy (F2F)</span>
                        )}
                      </td>
                      <td><span style={{ color: "var(--text-secondary)" }}>{r._id?.slice(-7).toUpperCase()}</span></td>
                      <td>{typeLabel}</td>
                      <td><span className={statusPillClass(r.status)}>{prettyStatus(r.status)}</span></td>
                      <td className="row-caret">›</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                className="ui-btn ui-btn--secondary ui-btn--compact"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ‹ Prev
              </button>
              <button
                className="ui-btn ui-btn--secondary ui-btn--compact"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Request Timeline Modal ── */}
      <AnimatePresence>
        {timelineRequest && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="req-timeline-modal" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}>

              {/* Header */}
              <div className="req-timeline-modal__header">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span className="req-timeline-modal__id">
                      #{timelineRequest._id?.slice(-7).toUpperCase()}
                    </span>
                    <span className={statusPillClass(timelineRequest.status)}>
                      {prettyStatus(timelineRequest.status)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                    {timelineRequest.type === "nda"
                      ? `NDA${timelineRequest.formData?.ndaTypeLabel ? ` — ${timelineRequest.formData.ndaTypeLabel}` : ""}`
                      : "Agreement"}
                  </div>
                </div>
                <button
                  className="req-timeline-modal__close"
                  onClick={() => setTimelineRequest(null)}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="req-timeline-modal__body">
                {timelineLoading ? (
                  <div className="req-timeline-modal__loading">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="req-timeline-modal__step">
                        <div className="req-timeline-modal__dot-col">
                          <span className="skeleton-block" style={{ width: 12, height: 12, borderRadius: "50%" }} />
                          {i < 3 && <div className="req-timeline-modal__connector" />}
                        </div>
                        <div style={{ paddingBottom: 20 }}>
                          <span className="skeleton-block skeleton-text" style={{ width: 140 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : timelineLogs.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
                    No timeline data available.
                  </p>
                ) : (
                  timelineLogs.map((log, i) => {
                    const step = resolveStep(log);
                    if (!step) return null;
                    const isLast = i === timelineLogs.length - 1;
                    const dateStr = new Date(log.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
                    const timeStr = new Date(log.createdAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
                    return (
                      <div key={log._id} className="req-timeline-modal__step">
                        <div className="req-timeline-modal__dot-col">
                          <div className="req-timeline-modal__dot" style={{ background: step.color }} />
                          {!isLast && <div className="req-timeline-modal__connector" />}
                        </div>
                        <div className="req-timeline-modal__content" style={{ paddingBottom: isLast ? 4 : 20 }}>
                          <div className="req-timeline-modal__label">{step.label}</div>
                          <div className="req-timeline-modal__time">{dateStr} · {timeStr}</div>
                          {log.userId?.name && (
                            <div className="req-timeline-modal__who">{log.userId.name}</div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="req-timeline-modal__footer">
                <button className="ui-btn ui-btn--secondary" onClick={() => setTimelineRequest(null)}>Close</button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
