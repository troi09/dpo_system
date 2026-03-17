import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FileText, RefreshCw } from "lucide-react";
import { getMyRequests } from "../../services/requestService";
import { notify } from "../../utils/inPageFeedback";

const STATUS_LABEL = {
  nda_pending:                "Reviewal",
  nda_approved:               "Approved",
  stud_revision_requested:    "Student Revisions",
  agr_pending_1:              "Initial Reviewal",
  agr_awaiting_rep_signature: "Awaiting Recipient Approval",
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
  { value: "awaiting_rep", label: "Awaiting Recipient Approval" },
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
  const [activeFilter, setActiveFilter] = useState("all");

  // Date filter state
  const [dateMode, setDateMode] = useState("preset");
  const [preset, setPreset] = useState("all");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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

  const filtered = useMemo(() => {
    let result = requests;

    // Status filter
    if (activeFilter !== "all") {
      result = result.filter((r) => normalizeStatusForStudentFilter(r.status) === activeFilter);
    }

    // Date filter
    if (dateMode === "preset") {
      if (preset === "thisMonth") {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        result = result.filter((r) => new Date(r.createdAt) >= monthStart);
      } else if (preset === "thisYear") {
        const yearStart = new Date(new Date().getFullYear(), 0, 1);
        result = result.filter((r) => new Date(r.createdAt) >= yearStart);
      }
    } else if (dateMode === "single" && singleDate) {
      const dayStart = new Date(singleDate);
      const dayEnd = new Date(singleDate + "T23:59:59");
      result = result.filter((r) => {
        const d = new Date(r.createdAt);
        return d >= dayStart && d <= dayEnd;
      });
    } else if (dateMode === "range") {
      if (startDate) {
        const s = new Date(startDate);
        result = result.filter((r) => new Date(r.createdAt) >= s);
      }
      if (endDate) {
        const e = new Date(endDate + "T23:59:59");
        result = result.filter((r) => new Date(r.createdAt) <= e);
      }
    }

    return result;
  }, [requests, activeFilter, dateMode, preset, singleDate, startDate, endDate]);

  return (
    <div className="dashboard-page">
      {/* Filter bar */}
      <div className="request-filter-bar is-open" style={{ marginBottom: 10 }}>
        <select
          className="ui-input"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          aria-label="Filter requests by status"
        >
          {STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
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
            <option value="all">All Dates</option>
            <option value="thisMonth">This Month</option>
            <option value="thisYear">This Year</option>
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
              <th colSpan={4}>
                <div className="dashboard-table-title-wrap">
                  <span className="dashboard-table-title">My Requests</span>
                  <button
                    className="dashboard-action ui-btn--compact"
                    type="button"
                    onClick={() => loadRequests({ withToast: true })}
                    disabled={refreshing}
                    title="Refresh"
                    style={{ marginLeft: "auto" }}
                  >
                    <RefreshCw size={14} className={refreshing ? "spin-anim" : ""} />
                    Refresh
                  </button>
                </div>
              </th>
            </tr>
            <tr>
              <th>Request ID</th>
              <th>Type</th>
              <th>Status</th>
              <th>Request Date</th>
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
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="dashboard-empty">
                    <span className="dashboard-empty-icon" aria-hidden="true"><FileText size={34} strokeWidth={1.6} /></span>
                    <p className="dashboard-empty-title">{requests.length === 0 ? "No requests yet" : "No requests found"}</p>
                    <p className="dashboard-empty-text">
                      {requests.length === 0
                        ? "Submit your first NDA or Agreement request to get started."
                        : "No requests match the current filter."}
                    </p>
                    {requests.length === 0 && (
                      <Link to="/student/new-request" className="dashboard-empty-cta">
                        Create Request
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r._id} onClick={() => navigate(`/student/requests/${r._id}`)} style={{ cursor: "pointer" }}>
                  <td><code style={{ fontSize: 12, color: "var(--text-secondary)" }}>{r._id?.slice(-7).toUpperCase()}</code></td>
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

                  <td>{new Date(r.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>
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
