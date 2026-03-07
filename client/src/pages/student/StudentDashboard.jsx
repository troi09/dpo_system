import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getMyRequests } from "../../services/requestService";

const STATUS_LABEL = {
  pending: "Pending",
  approved: "Approved",
  revision_required: "Revision Required",
  revision_requested: "Revision Requested",
  submitted: "Submitted",
  awaiting_signature: "Awaiting Signature",
  pending_approval: "Pending Approval",
  completed: "Completed",
  declined: "Declined",
  rep_revision_requested: "Rep Revision Requested",
};

const prettyStatus = (s) =>
  STATUS_LABEL[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "—");

const statusClass = (s) => {
  if (s === "pending" || s === "submitted") return "status-pill status-pill--pending";
  if (s === "approved" || s === "completed") return "status-pill status-pill--approved";
  if (s === "revision_required" || s === "revision_requested" || s === "rep_revision_requested")
    return "status-pill status-pill--revision";
  if (s === "awaiting_signature" || s === "pending_approval") return "status-pill status-pill--info";
  if (s === "declined") return "status-pill status-pill--revision";
  return "status-pill";
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMyRequests();
        setRequests(data);
      } catch (err) {
        alert(err.response?.data?.message || "Failed to load requests");
      }
    };
    load();
  }, []);

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">
        <table className="dashboard-table">
          <thead>
            <tr className="dashboard-table-title-row">
              <th colSpan={4}>
                <div className="dashboard-table-title-wrap">
                  <span className="dashboard-table-title">My Requests</span>
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
            {requests.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="dashboard-empty">
                    <span className="dashboard-empty-icon">📄</span>
                    <p className="dashboard-empty-title">No requests yet</p>
                    <p className="dashboard-empty-text">Submit your first NDA or Agreement request to get started.</p>
                    <Link to="/student/new-request" className="dashboard-empty-cta">
                      Create Request
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              requests.map((r) => (
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

                  <td>{new Date(r.createdAt).toLocaleDateString("en-US")}</td>

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
  );
};

export default StudentDashboard;
