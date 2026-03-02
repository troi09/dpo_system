import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllPending } from "../../services/requestService";

const pageStyle = { width: "900px" };
const cardStyle = { padding: "16px", borderRadius: "8px" };
const thStyle = { padding: "8px", borderBottom: "1px solid #ddd", textAlign: "left" };
const tdStyle = { padding: "8px", borderBottom: "1px solid #eee" };

export default function AdminRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAllPending();
        setRequests(data);
      } catch (err) {
        alert(err.response?.data?.message || "Failed to load pending requests");
      }
    };
    load();
  }, []);

  return (
    <div style={pageStyle}>
      <h2 style={{ textAlign: "center", marginBottom: "12px" }}>Pending Request Queue</h2>

      <div style={cardStyle}>
        {requests.length === 0 ? (
          <p style={{ textAlign: "center" }}>No pending requests.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Student</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Request Date</th>
                <th style={thStyle}></th>
              </tr>
            </thead>

            <tbody>
              {requests.map((r) => (
                <tr key={r._id}>
                  <td style={tdStyle}>
                    {r.userId?.name || "Unknown"}
                    <br />
                    <span style={{ fontSize: "12px", opacity: 0.8 }}>
                      {r.userId?.email || ""}
                    </span>
                  </td>

                  <td style={tdStyle}>
                    {r.type === "nda"
                      ? `NDA${r.formData?.ndaTypeLabel ? ` - ${r.formData.ndaTypeLabel}` : ""}`
                      : "Agreement"}
                  </td>

                  <td style={tdStyle}>
                    {new Date(r.createdAt).toLocaleDateString("en-US")}
                  </td>

                  <td style={tdStyle}>
                    <button onClick={() => navigate(`/admin/requests/${r._id}`)}>Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}