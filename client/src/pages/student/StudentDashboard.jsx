import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { getMyRequests } from "../../services/requestService";

const STATUS_LABEL = {
  nda_submitted:              "Submitted",
  nda_admin_reviewal:         "Admin Reviewal",
  nda_approved:               "Approved",
  nda_revision_requested:      "Revision Requested",
  agreement_submitted:                "Submitted",
  agreement_initial_admin_reviewal:   "Initial Admin Reviewal",
  agreement_awaiting_rep_approval:    "Awaiting Representative Approval",
  agreement_final_admin_reviewal:     "Final Admin Reviewal",
  agreement_approved:                 "Approved",
  agreement_rep_declined:             "Representative Declined",
  agreement_rep_revision_requested:   "Representative Revision Requested",

  // Legacy fallback labels
  nda_pending:                "Admin Reviewal",
  revision_requested:         "Revision Requested",
  agr_pending_1:              "Initial Admin Reviewal",
  agr_awaiting_rep_signature: "Awaiting Representative Approval",
  agr_pending_2:              "Final Admin Reviewal",
  agr_approved:               "Approved",
  agr_rep_declined:           "Representative Declined",
  agr_rep_revision_requested: "Representative Revision Requested",
};

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "submitted", label: "Submitted" },
  { value: "admin_reviewal", label: "Admin Reviewal" },
  { value: "revision_requested", label: "Revision Requested" },
  { value: "initial_admin_reviewal", label: "Initial Admin Reviewal" },
  { value: "awaiting_rep_approval", label: "Awaiting Representative Approval" },
  { value: "final_admin_reviewal", label: "Final Admin Reviewal" },
  { value: "approved", label: "Approved" },
];

const prettyStatus = (s) =>
  STATUS_LABEL[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "—");

const statusClass = (s) => {
  if (s === "nda_approved" || s === "agreement_approved" || s === "agr_approved") return "status-pill status-pill--green";
  if (s === "nda_submitted" || s === "agreement_submitted" || s === "agr_pending_1") return "status-pill status-pill--orange";
  if (s === "nda_admin_reviewal" || s === "agreement_initial_admin_reviewal" || s === "agreement_final_admin_reviewal" || s === "nda_pending" || s === "agr_pending_2") return "status-pill status-pill--yellow";
  if (s === "nda_revision_requested" || s === "agreement_rep_revision_requested" || s === "revision_requested" || s === "agr_rep_revision_requested") return "status-pill status-pill--red";
  if (s === "agreement_awaiting_rep_approval" || s === "agr_awaiting_rep_signature") return "status-pill status-pill--blue";
  if (s === "agreement_rep_declined" || s === "agr_rep_declined") return "status-pill status-pill--violet";
  return "status-pill";
};

const normalizeStatusForStudentFilter = (status) => {
  if (["nda_submitted", "agreement_submitted"].includes(status)) return "submitted";
  if (["nda_admin_reviewal", "nda_pending"].includes(status)) return "admin_reviewal";
  if (["nda_revision_requested", "agreement_rep_revision_requested", "revision_requested", "agr_rep_revision_requested", "agreement_rep_declined", "agr_rep_declined"].includes(status)) return "revision_requested";
  if (["agreement_initial_admin_reviewal", "agr_pending_1"].includes(status)) return "initial_admin_reviewal";
  if (["agreement_awaiting_rep_approval", "agr_awaiting_rep_signature"].includes(status)) return "awaiting_rep_approval";
  if (["agreement_final_admin_reviewal", "agr_pending_2"].includes(status)) return "final_admin_reviewal";
  if (["nda_approved", "agreement_approved", "agr_approved"].includes(status)) return "approved";
  return "admin_reviewal";
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const loadRequests = async ({ withToast = false } = {}) => {
    if (withToast) setRefreshing(true);
    try {
      const data = await getMyRequests();
      setRequests(data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load requests");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filtered = useMemo(() => {
    if (activeFilter === "all") return requests;
    return requests.filter((r) => normalizeStatusForStudentFilter(r.status) === activeFilter);
  }, [requests, activeFilter]);

  const selectedFilterLabel = useMemo(() => {
    const found = STATUS_FILTER_OPTIONS.find((option) => option.value === activeFilter);
    return found ? found.label : "All Statuses";
  }, [activeFilter]);

  const filterBadgeClass = useMemo(() => {
    if (activeFilter === "approved") return "status-filter status-filter--approved";
    if (["submitted", "admin_reviewal", "initial_admin_reviewal", "final_admin_reviewal"].includes(activeFilter)) return "status-filter status-filter--pending";
    if (activeFilter === "revision_requested") return "status-filter status-filter--revision";
    if (activeFilter === "awaiting_rep_approval") return "status-filter status-filter--rep";
    return "status-filter status-filter--all";
  }, [activeFilter]);

  return (
    <div className="dashboard-page">
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
                  >
                    <RefreshCw size={14} className={refreshing ? "spin-anim" : ""} />
                    Refresh
                  </button>
                  <div className={filterBadgeClass}>{selectedFilterLabel}</div>
                  <select
                    className="ui-input dashboard-status-select"
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value)}
                    aria-label="Filter requests by status"
                  >
                    {STATUS_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </th>
            </tr>
            <tr>
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
                  <td><span className="skeleton-block skeleton-pill" /></td>
                  <td><span className="skeleton-block skeleton-text" /></td>
                  <td><span className="skeleton-block skeleton-btn" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="dashboard-empty">
                    <span className="dashboard-empty-icon">📄</span>
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
                <tr key={r._id}>
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

                  <td>
                    <button
                      className="dashboard-action"
                      onClick={() => navigate(`/student/requests/${r._id}`)}
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
};

export default StudentDashboard;
