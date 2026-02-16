import { useEffect, useState } from "react";
import { getAllRequests } from "../../services/requestService";

const prettyType = (t) => (t === "nda" ? "NDA" : "Agreement");
const prettyStatus = (s) => s === "revision_required" ? "Revision Required" : s.charAt(0).toUpperCase() + s.slice(1);

const AdminDashboard = () => {
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
    <div style={{ width: "1200px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "12px" }}>Admin Dashboard</h2>

      <div style={{ background: "#242424", padding: "16px", borderRadius: "8px" }}>
        {requests.length === 0 ? (
          <p style={{ textAlign: "center" }}>No requests found.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>Student</th>
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>Type</th>
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>Status</th>
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>Date Submitted</th>
              </tr>
            </thead>

            <tbody>
              {requests.map((r) => (
                <tr key={r._id}>
                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    {r.userId?.name || "Unknown"}
                  </td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    {prettyType(r.requestType)}
                  </td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    {prettyStatus(r.status)}
                  </td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    {new Date(r.createdAt).toLocaleDateString("en-US")}
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
