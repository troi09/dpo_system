import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllRequests } from "../../services/requestService";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "revision_requested", label: "Revision Requested" },
];

const statusClass = (s) => {
  if (s === "pending" || s === "submitted") return "status-pill status-pill--pending";
  if (s === "approved" || s === "completed") return "status-pill status-pill--approved";
  if (s === "revision_requested" || s === "rep_revision_requested") return "status-pill status-pill--revision";
  if (s === "awaiting_signature" || s === "pending_approval") return "status-pill status-pill--info";
  if (s === "declined") return "status-pill status-pill--revision";
  return "status-pill";
};

const filterClass = (s) => {
  if (s === "pending") return "status-filter status-filter--pending";
  if (s === "approved") return "status-filter status-filter--approved";
  if (s === "revision_requested") return "status-filter status-filter--revision";
  return "status-filter status-filter--all";
};

const prettyStatus = (s) => {
  const map = {
    pending: "Pending",
    approved: "Approved",
    revision_requested: "Revision Required",
    submitted: "Submitted",
    awaiting_signature: "Awaiting Signature",
    pending_approval: "Pending Approval",
    completed: "Completed",
    declined: "Declined",
    rep_revision_requested: "Rep Revision Requested",
  };
  return map[s] || s;
};

export default function AdminRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [filterIndex, setFilterIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAllRequests();
        setRequests(data);
      } catch (err) {
        alert(err.response?.data?.message || "Failed to load requests");
      }
    };
    load();
  }, []);

  const activeFilter = FILTERS[filterIndex];

  const filtered = useMemo(() => {
    if (activeFilter.key === "all") return requests;
    return requests.filter((r) => r.status === activeFilter.key);
  }, [requests, activeFilter]);

  const cycleFilter = () => {
    setFilterIndex((i) => (i + 1) % FILTERS.length);
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">
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
            {filtered.length === 0 ? (
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
                      ? `NDA${r.formData?.ndaTypeLabel ? ` — ${r.formData.ndaTypeLabel}` : ""}`
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
                      Review
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
