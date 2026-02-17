import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyRequests } from "../../services/requestService";

const prettyType = (t) => (t === "nda" ? "NDA" : "Agreement");
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
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>Files Attached</th>
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {requests.map((r) => (
                <tr key={r._id}>
                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    {prettyType(r.requestType)}
                  </td>

                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    {prettyStatus(r.status)}
                  </td>

                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    {new Date(r.createdAt).toLocaleDateString("en-US")}
                  </td>

                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    {(!r.requirements || r.requirements.length === 0) ? (
                      <span style={{ opacity: 0.7 }}>None</span>
                    ) : (
                      r.requirements.map((f, idx) => (
                        <div key={idx}>
                          <a href={f.url} target="_blank" rel="noreferrer" title={f.originalName}>
                            {`File ${idx + 1}`}
                          </a>
                        </div>
                      ))
                    )}
                  </td>

                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    {r.status === "revision_required" ? (
                      <button onClick={() => navigate(`/student/resubmit/${r._id}`)}>
                        Resubmit
                      </button>
                    ) : (
                      <span style={{ opacity: 0.6 }}>-</span>
                    )}
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
