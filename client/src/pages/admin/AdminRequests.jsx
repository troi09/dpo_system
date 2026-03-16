import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Filter, RefreshCw, Search } from "lucide-react";
import { getAllRequests } from "../../services/requestService";

const statusClass = (s) => {
  if (s === "nda_approved" || s === "agreement_approved" || s === "agr_approved") return "status-pill status-pill--green";
  if (s === "nda_submitted" || s === "agreement_submitted") return "status-pill status-pill--orange";
  if (s === "nda_admin_reviewal" || s === "agreement_initial_admin_reviewal" || s === "agreement_final_admin_reviewal") return "status-pill status-pill--yellow";
  if (s === "nda_revision_requested" || s === "agreement_rep_revision_requested") return "status-pill status-pill--red";
  if (s === "agreement_awaiting_rep_approval") return "status-pill status-pill--blue";
  if (s === "agreement_rep_declined") return "status-pill status-pill--violet";

  // Legacy status fallback
  if (s === "nda_pending" || s === "agr_pending_2") return "status-pill status-pill--yellow";
  if (s === "revision_requested" || s === "agr_rep_revision_requested") return "status-pill status-pill--red";
  if (s === "agr_pending_1") return "status-pill status-pill--orange";
  if (s === "agr_awaiting_rep_signature") return "status-pill status-pill--blue";
  if (s === "agr_rep_declined") return "status-pill status-pill--violet";
  return "status-pill";
};

const prettyStatus = (s) => {
  const map = {
    nda_submitted:              "Submitted",
    nda_admin_reviewal:         "Admin Reviewal",
    nda_approved:               "Approved",
    nda_revision_requested:      "Revision Requested",
    agreement_submitted:                "Submitted",
    agreement_initial_admin_reviewal:   "Initial Admin Reviewal",
    agreement_awaiting_rep_approval:    "Awaiting Rep. Approval",
    agreement_final_admin_reviewal:     "Final Admin Reviewal",
    agreement_approved:                 "Approved",
    agreement_rep_declined:             "Rep. Declined",
    agreement_rep_revision_requested:   "Rep. Revision Requested",

    // Legacy fallback labels
    nda_pending:                "Admin Reviewal",
    revision_requested:         "Revision Requested",
    agr_pending_1:              "Initial Admin Reviewal",
    agr_awaiting_rep_signature: "Awaiting Rep. Approval",
    agr_pending_2:              "Final Admin Reviewal",
    agr_approved:               "Approved",
    agr_rep_declined:           "Rep. Declined",
    agr_rep_revision_requested: "Rep. Revision Requested",
  };
  return map[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "—");
};

export default function AdminRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 768;
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [dateMode, setDateMode] = useState("preset");
  const [preset, setPreset] = useState("thisMonth");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const buildFilterParams = () => {
    const params = {};

    if (statusFilter !== "all") {
      params.status = statusFilter;
    }

    if (searchTerm) {
      params.search = searchTerm;
    }

    if (dateMode === "preset") {
      const now = new Date();
      if (preset === "thisMonth") {
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

      if (withToast) {
        setNotice("Data updated");
        setTimeout(() => setNotice(""), 1800);
      }
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
  }, [statusFilter, dateMode, preset, singleDate, startDate, endDate, searchTerm]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setIsFilterOpen(true);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const filtered = useMemo(() => {
    return requests;
  }, [requests]);

  const applySearch = () => {
    setSearchTerm(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchTerm("");
  };

  return (
    <div className="dashboard-page page-shell">
      <div className="page-header-row" style={{ marginBottom: 12 }}>
        <h2 className="page-title">Requests</h2>
        <button
          onClick={() => loadRequests({ withToast: true })}
          className="ui-btn ui-btn--secondary"
          type="button"
          disabled={refreshing}
        >
          <RefreshCw size={14} className={refreshing ? "spin-anim" : ""} />
          Refresh
        </button>
      </div>

      {notice ? (
        <div className="info-banner info-banner--success" style={{ marginBottom: 12 }}>
          <strong>{notice}</strong>
        </div>
      ) : null}

      {error ? (
        <div className="info-banner info-banner--danger" style={{ marginBottom: 12 }}>
          <strong>{error}</strong>
        </div>
      ) : null}

      <div className="request-search-wrap" style={{ marginBottom: 10 }}>
        <div className="request-search-box">
          <Search size={14} className="request-search-icon" />
          <input
            type="text"
            className="ui-input request-search-input"
            placeholder="Search by student, serial number, purpose, organization..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch();
            }}
          />
        </div>
        <button type="button" className="ui-btn ui-btn--primary" onClick={applySearch}>
          Search
        </button>
        <button type="button" className="ui-btn ui-btn--secondary" onClick={clearSearch}>
          Clear
        </button>
        <button
          type="button"
          className="ui-btn ui-btn--secondary request-filter-toggle"
          onClick={() => setIsFilterOpen((prev) => !prev)}
        >
          <Filter size={14} />
          Filters
        </button>
      </div>

      <div className={`request-filter-bar${isFilterOpen ? " is-open" : ""}`}>
        <select
          className="ui-input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="approved_completed">Approved/Completed</option>
          <option value="revision">Revision Requested</option>
          <option value="representative">Representative Flow</option>
        </select>

        <select
          className="ui-input"
          value={dateMode}
          onChange={(e) => setDateMode(e.target.value)}
        >
          <option value="preset">Preset</option>
          <option value="single">Specific Date</option>
          <option value="range">Date Range</option>
        </select>

        {dateMode === "preset" ? (
          <select
            className="ui-input"
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
          >
            <option value="thisMonth">This Month</option>
            <option value="thisYear">This Year</option>
            <option value="all">All Dates</option>
          </select>
        ) : null}

        {dateMode === "single" ? (
          <input
            className="ui-input"
            type="date"
            value={singleDate}
            onChange={(e) => setSingleDate(e.target.value)}
          />
        ) : null}

        {dateMode === "range" ? (
          <>
            <input
              className="ui-input"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              className="ui-input"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </>
        ) : null}
      </div>

      <div className="dashboard-card">
        <div className="table-scroll">
        <table className="dashboard-table">
          <thead>
            <tr className="dashboard-table-title-row">
              <th colSpan={5}>
                <div className="dashboard-table-title-wrap">
                  <span className="dashboard-table-title">Requests</span>
                </div>
              </th>
            </tr>
            <tr>
              <th>Student</th>
              <th>Type</th>
              <th>Status</th>
              <th>Request Date</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={`sk-${i}`}>
                  <td><span className="skeleton-block skeleton-text" /></td>
                  <td><span className="skeleton-block skeleton-text" /></td>
                  <td><span className="skeleton-block skeleton-pill" /></td>
                  <td><span className="skeleton-block skeleton-text" /></td>
                  <td><span className="skeleton-block skeleton-btn" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="dashboard-empty">
                    <span className="dashboard-empty-icon">🔍</span>
                    <p className="dashboard-empty-title">No requests found</p>
                    <p className="dashboard-empty-text">No requests match the current filter.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r._id}>
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

                  <td>{new Date(r.createdAt).toLocaleDateString("en-US")}</td>

                  <td>
                    <button
                      className="dashboard-action"
                      onClick={() => navigate(`/admin/requests/${r._id}`)}
                    >
                      View
                    </button>
                  </td>
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