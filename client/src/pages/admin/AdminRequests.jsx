import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Filter, RefreshCw, Search } from "lucide-react";
import { getAllRequests } from "../../services/requestService";

const statusClass = (s) => {
  if (["nda_approved", "agr_approved"].includes(s)) return "status-pill status-pill--green";
  if (["nda_pending", "agr_pending_1", "agr_pending_2"].includes(s)) return "status-pill status-pill--yellow";
  if (s === "stud_revision_requested") return "status-pill status-pill--orange";
  if (s === "agr_rep_revision_requested") return "status-pill status-pill--violet";
  if (s === "agr_awaiting_rep_signature") return "status-pill status-pill--blue";
  if (s === "agr_declined") return "status-pill status-pill--red";
  return "status-pill";
};

const prettyStatus = (s) => {
  const map = {
    nda_pending:                "Reviewal",
    nda_approved:               "Approved",
    stud_revision_requested:    "Student Revisions",
    agr_pending_1:              "Initial Reviewal",
    agr_awaiting_rep_signature: "Recipient Reviewal",
    agr_pending_2:              "Final Reviewal",
    agr_approved:               "Approved",
    agr_declined:               "Recipient Declined",
    agr_rep_revision_requested: "Recipient Revisions",
  };
  return map[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "—");
};

export default function AdminRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 768;
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateMode, setDateMode] = useState("preset");
  const [preset, setPreset] = useState("all");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const buildFilterParams = () => {
    const params = {};

    if (statusFilter !== "all") {
      params.status = statusFilter;
    }

    if (typeFilter !== "all") {
      if (typeFilter === "agreement") {
        params.type = "agreement";
      } else if (typeFilter === "nda_orgactivities") {
        params.type = "nda";
        params.ndaType = "orgactivities";
      } else if (typeFilter === "nda_research") {
        params.type = "nda";
        params.ndaType = "research";
      }
    }


    if (dateMode === "preset") {
      const now = new Date();
      if (preset === "today") {
        params.startDate = now.toISOString().slice(0, 10);
        params.endDate = now.toISOString().slice(0, 10);
      } else if (preset === "thisWeek") {
        const day = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((day + 6) % 7));
        params.startDate = monday.toISOString().slice(0, 10);
      } else if (preset === "thisMonth") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        params.startDate = start.toISOString().slice(0, 10);
      } else if (preset === "thisYear") {
        const start = new Date(now.getFullYear(), 0, 1);
        params.startDate = start.toISOString().slice(0, 10);
      }
    }

    if (dateMode === "single" && singleDate) {
      params.startDate = singleDate;
      params.endDate = singleDate;
    }

    if (dateMode === "range") {
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
    }

    return params;
  };

  const loadRequests = async ({ withToast = false } = {}) => {
    if (withToast) setRefreshing(true);
    setError("");

    try {
      const data = await getAllRequests(buildFilterParams());
      setRequests(data);

    } catch (err) {
      setError(err.response?.data?.message || "Failed to load requests");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter, dateMode, preset, singleDate, startDate, endDate]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setIsFilterOpen(true);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return requests;
    const term = searchTerm.toLowerCase();
    return requests.filter((r) => {
      const name = (r.userId?.name || r.proxyRequestee?.fullName || "").toLowerCase();
      const email = (r.userId?.email || r.proxyRequestee?.email || "").toLowerCase();
      const id = (r._id || "").slice(-7).toLowerCase();
      return name.includes(term) || email.includes(term) || id.includes(term);
    });
  }, [requests, searchTerm]);

  const clearSearch = () => setSearchTerm("");

  const resetAndRefresh = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setStatusFilter("all");
    setDateMode("preset");
    setPreset("all");
    setSingleDate("");
    setStartDate("");
    setEndDate("");
    loadRequests({ withToast: true });
  };

  return (
    <div className="dashboard-page page-shell">

      {error ? (
        <div className="info-banner info-banner--danger" style={{ marginBottom: 12 }}>
          <strong>{error}</strong>
        </div>
      ) : null}

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
              onChange={(e) => setSearchTerm(e.target.value)}
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
            {isFilterOpen ? null : <span className="req-toolbar__filter-badge" />}
          </button>
        </div>

        {/* Filter chips row */}
        <div className={`req-toolbar__filters${isFilterOpen ? " req-toolbar__filters--open" : ""}`}>
          <div className="req-toolbar__filter-group">
            <label className="req-toolbar__filter-label">Type</label>
            <select
              className="req-toolbar__filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
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
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="reviewal">Reviewal</option>
              <option value="approved">Approved</option>
              <option value="stud_revision">Student Revisions</option>
              <option value="rep_revision">Recipient Revisions</option>
              <option value="rep_declined">Recipient Declined</option>
              <option value="awaiting_rep">Recipient Reviewal</option>
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

      <div className="dashboard-card">
        <div className="table-scroll">
        <table className="dashboard-table">
          <thead>
            <tr className="dashboard-table-title-row">
              <th colSpan={6}>
                <div className="dashboard-table-title-wrap">
                  <span className="dashboard-table-title">Requests</span>
                </div>
              </th>
            </tr>
            <tr>
              <th>Request Date</th>
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
                <tr key={`sk-${i}`}>
                  <td><span className="skeleton-block skeleton-text" /></td>
                  <td><span className="skeleton-block skeleton-text" /></td>
                  <td><span className="skeleton-block skeleton-text" /></td>
                  <td><span className="skeleton-block skeleton-text" /></td>
                  <td><span className="skeleton-block skeleton-pill" /></td>
                  <td />
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="dashboard-empty">
                    <span className="dashboard-empty-icon">🔍</span>
                    <p className="dashboard-empty-title">No requests found</p>
                    <p className="dashboard-empty-text">No requests match the current filter.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r._id} onClick={() => navigate(`/admin/requests/${r._id}`)} style={{ cursor: "pointer" }}>
                  <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{new Date(r.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>

                  <td>
                    <span style={{ fontWeight: 600 }}>
                      {r.proxyRequestee?.isProxy ? (r.proxyRequestee?.fullName || "Proxy Requestee") : (r.userId?.name || "Unknown")}
                    </span>
                    <span className="dashboard-subtext">
                      {r.proxyRequestee?.isProxy ? (r.proxyRequestee?.email || "") : (r.userId?.email || "")}
                    </span>
                    {r.proxyRequestee?.isProxy ? (
                      <span className="dashboard-subtext">Submitted by staff: {r.userId?.name || "Unknown"}</span>
                    ) : null}
                  </td>

                  <td><span style={{ color: "var(--text-secondary)" }}>{r._id?.slice(-7).toUpperCase()}</span></td>

                  <td>
                    {r.type === "nda"
                      ? `NDA${r.formData?.ndaTypeLabel ? ` - ${r.formData.ndaTypeLabel}` : ""}`
                      : "Agreement"}
                  </td>

                  <td>
                    <span className={statusClass(r.status)}>
                      {prettyStatus(r.status)}
                    </span>
                  </td>

                  <td className="row-caret">›</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}