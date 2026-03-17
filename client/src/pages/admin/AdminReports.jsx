import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { getAllRequests } from "../../services/requestService";

const STATUS_LABEL = {
  nda_pending: "Reviewal",
  nda_approved: "Approved",
  stud_revision_requested: "Student Revisions",
  agr_pending_1: "Initial Reviewal",
  agr_awaiting_rep_signature: "Awaiting Recipient Approval",
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
  { value: "agr_awaiting_rep_signature", label: "Awaiting Recipient Approval" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "nda", label: "NDA" },
  { value: "agreement", label: "Agreement" },
];

const SORT_FIELDS = {
  createdAt: "Date",
  type: "Type",
  status: "Status",
  "userId.name": "Requestee",
};

function SortIcon({ field, sortField, sortDir }) {
  if (field !== sortField) return <ChevronsUpDown size={12} style={{ opacity: 0.4 }} />;
  return sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
}

export default function AdminReports() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Filter/search state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Sort state
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const searchTimeout = useRef(null);

  const load = async ({ withToast = false } = {}) => {
    setLoading(true);
    if (withToast) setRefreshing(true);
    setError("");
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const data = await getAllRequests(params);
      setRequests(Array.isArray(data) ? data : []);
      if (withToast) {
        setNotice("Data refreshed");
        setTimeout(() => setNotice(""), 2000);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to load data";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Re-fetch when date range changes
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { load(); }, 600);
    return () => clearTimeout(searchTimeout.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const filteredRequests = useMemo(() => {
    let result = [...requests];

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter((r) => {
        const name = (r.userId?.name || r.proxyRequestee?.fullName || "").toLowerCase();
        const email = (r.userId?.email || r.proxyRequestee?.email || "").toLowerCase();
        const serial = (r.serialNo || "").toLowerCase();
        const type = (r.type || "").toLowerCase();
        return name.includes(term) || email.includes(term) || serial.includes(term) || type.includes(term);
      });
    }

    if (statusFilter) {
      const statuses = statusFilter.split(",");
      result = result.filter((r) => statuses.includes(r.status));
    }

    if (typeFilter) {
      result = result.filter((r) => r.type === typeFilter);
    }

    // Sort
    result.sort((a, b) => {
      let av, bv;
      if (sortField === "userId.name") {
        av = (a.userId?.name || a.proxyRequestee?.fullName || "").toLowerCase();
        bv = (b.userId?.name || b.proxyRequestee?.fullName || "").toLowerCase();
      } else if (sortField === "createdAt") {
        av = new Date(a.createdAt).getTime();
        bv = new Date(b.createdAt).getTime();
      } else {
        av = (a[sortField] || "").toLowerCase();
        bv = (b[sortField] || "").toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [requests, search, statusFilter, typeFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const paginatedRequests = filteredRequests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="page-header-row mb-16">
        <div>
          <p className="admin-subtitle">Complete transaction history with search and filtering</p>
        </div>
        <button
          onClick={() => load({ withToast: true })}
          title="Refresh"
          className="ui-btn ui-btn--secondary ui-btn--icon"
          disabled={refreshing}
        >
          <RefreshCw size={14} className={refreshing ? "spin-anim" : ""} />
        </button>
      </div>

      {notice && (
        <div className="info-banner info-banner--success mb-12">
          <strong>{notice}</strong>
        </div>
      )}
      {error && (
        <div className="admin-flash-banner admin-flash-banner--error mb-12">{error}</div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="admin-card"
        style={{ marginBottom: 16, padding: "14px 16px" }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 200px" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            <input
              type="text"
              className="ui-input"
              placeholder="Search name, email, serial…"
              value={search}
              onChange={handleSearchChange}
              style={{ paddingLeft: 32, height: 34, fontSize: 13 }}
            />
          </div>

          {/* Status filter */}
          <select
            className="ui-input"
            value={statusFilter}
            onChange={handleFilterChange(setStatusFilter)}
            style={{ flex: "0 1 190px", height: 34, fontSize: 13 }}
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Type filter */}
          <select
            className="ui-input"
            value={typeFilter}
            onChange={handleFilterChange(setTypeFilter)}
            style={{ flex: "0 1 130px", height: 34, fontSize: 13 }}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Date range */}
          <input
            type="date"
            className="ui-input"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            style={{ flex: "0 1 140px", height: 34, fontSize: 13 }}
            title="Start Date"
          />
          <input
            type="date"
            className="ui-input"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            style={{ flex: "0 1 140px", height: 34, fontSize: 13 }}
            title="End Date"
          />

          <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", alignSelf: "center" }}>
            {filteredRequests.length} record{filteredRequests.length !== 1 ? "s" : ""}
          </span>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="admin-card"
        style={{ padding: 0, overflow: "hidden" }}
      >
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ width: "100%", minWidth: 660 }}>
            <thead>
              <tr>
                {[
                  { key: "createdAt", label: "Date" },
                  { key: "userId.name", label: "Requestee" },
                  { key: null, label: "Request ID" },
                  { key: "type", label: "Type" },
                  { key: "status", label: "Status" },
                ].map((col) => (
                  col.key ? (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {col.label}
                      <SortIcon field={col.key} sortField={sortField} sortDir={sortDir} />
                    </span>
                  </th>
                  ) : (
                  <th key={col.label}>{col.label}</th>
                  )
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>
                    Loading…
                  </td>
                </tr>
              ) : paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>
                    No transactions found.
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((r) => {
                  const name = r.proxyRequestee?.isProxy
                    ? (r.proxyRequestee.fullName || r.proxyRequestee.firstName ? `${r.proxyRequestee.firstName || ""} ${r.proxyRequestee.lastName || ""}`.trim() : r.proxyRequestee.fullName)
                    : (r.userId?.name || "—");
                  const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—";
                  return (
                    <tr key={r._id}>
                      <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "var(--text-secondary)" }}>{dateStr}</td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{name}</div>
                        {r.proxyRequestee?.isProxy && (
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Proxy (F2F)</div>
                        )}
                      </td>
                      <td><code style={{ fontSize: 12, color: "var(--text-secondary)" }}>{r._id?.slice(-7).toUpperCase()}</code></td>
                      <td style={{ textTransform: "capitalize", fontSize: 13 }}>{r.type || "—"}</td>
                      <td><span className={statusPillClass(r.status)}>{prettyStatus(r.status)}</span></td>
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
    </div>
  );
}
