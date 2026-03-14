import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllRequests } from "../../services/requestService";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "approved", label: "Approved" },
  { key: "pending", label: "Pending" },
  { key: "revision", label: "Revision Requested" },
  { key: "rep", label: "Rep. Statuses" },
];

const statusClass = (s) => {
  if (s === "nda_approved" || s === "agr_approved") return "status-pill status-pill--green";
  if (s === "nda_pending" || s === "agr_pending_2") return "status-pill status-pill--yellow";
  if (s === "revision_requested" || s === "agr_rep_revision_requested") return "status-pill status-pill--red";
  if (s === "agr_pending_1") return "status-pill status-pill--orange";
  if (s === "agr_awaiting_rep_signature") return "status-pill status-pill--blue";
  if (s === "agr_rep_declined") return "status-pill status-pill--violet";
  return "status-pill";
};

const filterClass = (s) => {
  if (s === "approved") return "status-filter status-filter--approved";
  if (s === "pending") return "status-filter status-filter--pending";
  if (s === "revision") return "status-filter status-filter--revision";
  if (s === "rep") return "status-filter status-filter--rep";
  return "status-filter status-filter--all";
};

const prettyStatus = (s) => {
  const map = {
    nda_pending:                "Pending Approval",
    nda_approved:               "Approved",
    revision_requested:         "Revision Requested",
    agr_pending_1:              "Initial Pending Approval",
    agr_awaiting_rep_signature: "Awaiting Rep. Approval",
    agr_pending_2:              "Final Pending Approval",
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
  const [filterIndex, setFilterIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAllRequests();
        setRequests(data);
      } catch (err) {
        alert(err.response?.data?.message || "Failed to load requests");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const activeFilter = FILTERS[filterIndex];

  const filtered = useMemo(() => {
    if (activeFilter.key === "all") return requests;
    if (activeFilter.key === "approved") return requests.filter((r) => r.status === "nda_approved" || r.status === "agr_approved");
    if (activeFilter.key === "pending") return requests.filter((r) => ["nda_pending", "agr_pending_1", "agr_pending_2"].includes(r.status));
    if (activeFilter.key === "revision") return requests.filter((r) => ["revision_requested", "agr_rep_revision_requested"].includes(r.status));
    if (activeFilter.key === "rep") return requests.filter((r) => ["agr_rep_declined", "agr_awaiting_rep_signature"].includes(r.status));
    return requests;
  }, [requests, activeFilter]);

  const cycleFilter = () => {
    setFilterIndex((i) => (i + 1) % FILTERS.length);
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">
        <div className="table-scroll">
        <table className="dashboard-table">
          <thead>
            <tr className="dashboard-table-title-row">
              <th colSpan={5}>
                <div className="dashboard-table-title-wrap">
                  <span className="dashboard-table-title">Requests</span>
                  <button
                    className={filterClass(activeFilter.key)}
                    onClick={cycleFilter}
                  >
                    {activeFilter.label}
                  </button>
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
                    <span style={{ fontWeight: 600 }}>{r.userId?.name || "Unknown"}</span>
                    <span className="dashboard-subtext">{r.userId?.email || ""}</span>
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

                  <td>{new Date(r.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>

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