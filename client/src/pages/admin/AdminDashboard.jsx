import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllRequests } from "../../services/requestService";

const prettyStatus = (s) =>
  s === "revision_required" ? "Revision Required" : s.charAt(0).toUpperCase() + s.slice(1);

const statusClass = (s) => {
  if (s === "pending") return "status-pill status-pill--pending";
  if (s === "approved") return "status-pill status-pill--approved";
  if (s === "revision_required") return "status-pill status-pill--revision";
  return "status-pill";
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);

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

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">
        {requests.length === 0 ? (
          <p className="dashboard-empty">No requests found.</p>
        ) : (
          <table className="dashboard-table">
            <thead>
              <tr className="dashboard-table-title-row">
                <th colSpan={5}>
                  <div className="dashboard-table-title-wrap">
                    <span className="dashboard-table-title">Admin Dashboard</span>
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
              {requests.map((r) => (
                <tr key={r._id}>
                  <td>
                    {r.userId?.name || "Unknown"}
                    <br />
                    <span className="dashboard-subtext">
                      {r.userId?.email || ""}
                    </span>
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;