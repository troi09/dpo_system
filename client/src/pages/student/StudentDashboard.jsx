import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Search, Filter, FilePlus } from "lucide-react";
import { getMyRequests } from "../../services/requestService";
import FilterSelect from "../../components/FilterSelect";
import { notify } from "../../utils/inPageFeedback";

const STATUS_LABEL = {
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

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "reviewal", label: "Reviewal" },
  { value: "approved", label: "Approved" },
  { value: "stud_revision", label: "Student Revisions" },
  { value: "rep_revision", label: "Recipient Revisions" },
  { value: "rep_declined", label: "Recipient Declined" },
  { value: "awaiting_rep", label: "Recipient Reviewal" },
];

const prettyStatus = (s) =>
  STATUS_LABEL[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "—");

const statusClass = (s) => {
  if (["nda_approved", "agr_approved"].includes(s)) return "status-pill status-pill--green";
  if (["nda_pending", "agr_pending_1", "agr_pending_2"].includes(s)) return "status-pill status-pill--yellow";
  if (s === "stud_revision_requested") return "status-pill status-pill--orange";
  if (s === "agr_rep_revision_requested") return "status-pill status-pill--violet";
  if (s === "agr_awaiting_rep_signature") return "status-pill status-pill--blue";
  if (s === "agr_declined") return "status-pill status-pill--red";
  return "status-pill";
};

const normalizeStatusForStudentFilter = (status) => {
  if (["nda_pending", "agr_pending_1", "agr_pending_2"].includes(status)) return "reviewal";
  if (["nda_approved", "agr_approved"].includes(status)) return "approved";
  if (status === "stud_revision_requested") return "stud_revision";
  if (status === "agr_rep_revision_requested") return "rep_revision";
  if (status === "agr_declined") return "rep_declined";
  if (status === "agr_awaiting_rep_signature") return "awaiting_rep";
  return "reviewal";
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  // Filter state
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [dateMode, setDateMode] = useState("preset");
  const [preset, setPreset] = useState("all");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isFilterOpen, setIsFilterOpen] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 768
  );

  const loadRequests = async ({ withToast = false } = {}) => {
    if (withToast) setRefreshing(true);
    try {
      const data = await getMyRequests();
      setRequests(data);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to load requests", { type: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setIsFilterOpen(true); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const clearSearch = () => setSearchTerm("");

  const resetAndRefresh = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setActiveFilter("all");
    setDateMode("preset");
    setPreset("all");
    setSingleDate("");
    setStartDate("");
    setEndDate("");
    loadRequests({ withToast: true });
  };

  const filtered = useMemo(() => {
    let result = requests;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((r) => {
        const id = (r._id || "").slice(-7).toLowerCase();
        const type = r.type === "nda"
          ? `nda ${r.formData?.ndaTypeLabel || ""}`.toLowerCase()
          : "agreement";
        return id.includes(term) || type.includes(term);
      });
    }

    // Type filter
    if (typeFilter !== "all") {
      if (typeFilter === "agreement") {
        result = result.filter((r) => r.type === "agreement");
      } else if (typeFilter === "nda_orgactivities") {
        result = result.filter((r) => r.type === "nda" && r.formData?.ndaType === "orgactivities");
      } else if (typeFilter === "nda_research") {
        result = result.filter((r) => r.type === "nda" && r.formData?.ndaType === "research");
      }
    }

    // Status filter
    if (activeFilter !== "all") {
      result = result.filter((r) => normalizeStatusForStudentFilter(r.status) === activeFilter);
    }

    // Date filter
    if (dateMode === "preset") {
      const now = new Date();
      if (preset === "today") {
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayEnd = new Date(dayStart.getTime() + 86400000 - 1);
        result = result.filter((r) => { const d = new Date(r.createdAt); return d >= dayStart && d <= dayEnd; });
      } else if (preset === "thisWeek") {
        const day = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((day + 6) % 7));
        monday.setHours(0, 0, 0, 0);
        result = result.filter((r) => new Date(r.createdAt) >= monday);
      } else if (preset === "thisMonth") {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        result = result.filter((r) => new Date(r.createdAt) >= monthStart);
      } else if (preset === "thisYear") {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        result = result.filter((r) => new Date(r.createdAt) >= yearStart);
      }
    } else if (dateMode === "single" && singleDate) {
      const dayStart = new Date(singleDate);
      const dayEnd = new Date(singleDate + "T23:59:59");
      result = result.filter((r) => { const d = new Date(r.createdAt); return d >= dayStart && d <= dayEnd; });
    } else if (dateMode === "range") {
      if (startDate) result = result.filter((r) => new Date(r.createdAt) >= new Date(startDate));
      if (endDate) result = result.filter((r) => new Date(r.createdAt) <= new Date(endDate + "T23:59:59"));
    }

    return result;
  }, [requests, searchTerm, typeFilter, activeFilter, dateMode, preset, singleDate, startDate, endDate]);

  return (
    <div className="dashboard-page">
      <div className="page-shell__header">
        <button
          type="button"
          className="req-toolbar__action-btn"
          onClick={() => navigate("/student/new-request")}
        >
          <FilePlus size={14} />
          Create Request
        </button>
      </div>

      {/* ── Search + Filter toolbar ── */}
      <div className="req-toolbar">
        <div className="req-toolbar__search-row">
          <div className="req-toolbar__search-box">
            <input
              type="text"
              className="req-toolbar__search-input"
              placeholder="Search by request ID or type…"
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
          </button>
        </div>

        <div className={`req-toolbar__filters${isFilterOpen ? " req-toolbar__filters--open" : ""}`}>
          <div className="req-toolbar__filter-group">
            <label className="req-toolbar__filter-label">Type</label>
            <FilterSelect
              value={typeFilter}
              onChange={setTypeFilter}
              className="filter-select--type"
              options={[
                { value: "all", label: "All Types" },
                { value: "nda_orgactivities", label: "NDA — Student Organization Activities" },
                { value: "nda_research", label: "NDA — Conduct of Research" },
                { value: "agreement", label: "Agreement" },
              ]}
            />
          </div>

          <div className="req-toolbar__filter-group">
            <label className="req-toolbar__filter-label">Status</label>
            <FilterSelect
              value={activeFilter}
              onChange={setActiveFilter}
              className="filter-select--status"
              options={STATUS_FILTER_OPTIONS}
            />
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

          {dateMode === "preset" ? (
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
          ) : null}

          {dateMode === "single" ? (
            <div className="req-toolbar__filter-group">
              <label className="req-toolbar__filter-label">Date</label>
              <input className={`req-toolbar__filter-select${singleDate !== "" ? " req-toolbar__filter-select--active" : ""}`} type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} />
            </div>
          ) : null}

          {dateMode === "range" ? (
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
              <th colSpan={5}>
                <div className="dashboard-table-title-wrap">
                  <span className="dashboard-table-title">My Requests</span>
                </div>
              </th>
            </tr>
            <tr>
              <th>Request Date</th>
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
                  <td><span className="skeleton-block skeleton-pill" /></td>
                  <td />
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="dashboard-empty">
                    <p className="dashboard-empty-title">No requests found</p>
                    <p className="dashboard-empty-text">No requests match the current filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r._id} onClick={() => navigate(`/student/requests/${r._id}`)} style={{ cursor: "pointer" }}>
                  <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{new Date(r.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>
                  <td><span style={{ color: "var(--text-secondary)" }}>{r._id?.slice(-7).toUpperCase()}</span></td>
                  <td>
                    {r.type === "nda"
                      ? `NDA${r.formData?.ndaTypeLabel ? ` — ${r.formData.ndaTypeLabel}` : ""}`
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
};

export default StudentDashboard;
