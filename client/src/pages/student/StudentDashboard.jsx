import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyRequests } from "../../services/requestService";

const prettyStatus = (s) => s === "revision_required" ? "Revision Required" : s.charAt(0).toUpperCase() + s.slice(1);

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
    <div style={{ width: "900px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "12px" }}>My Requests</h2>

      <div style={{ padding: "16px", borderRadius: "8px" }}>
        {requests.length === 0 ? (
          <p style={{ textAlign: "center" }}>No requests yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>Type</th>
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>Status</th>
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>Submitted</th>
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}></th>
              </tr>
            </thead>

            <tbody>
              {requests.map((r) => (
                <tr key={r._id}>
                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    {r.requestType === "nda"
                      ? `NDA${r.formData?.ndaTypeLabel ? ` - ${r.formData.ndaTypeLabel}` : ""}`
                      : "Agreement"}
                  </td>

                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    {prettyStatus(r.status)}
                  </td>

                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    {new Date(r.createdAt).toLocaleDateString("en-US")}
                  </td>

                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    <button onClick={() => navigate(`/student/requests/${r._id}`)}>View</button>
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

export default StudentDashboard;
