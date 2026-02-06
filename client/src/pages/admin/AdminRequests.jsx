import { useEffect, useState } from "react";
import { getAllRequests, updateRequestStatus } from "../../services/requestService";

const prettyType = (t) => (t === "nda" ? "NDA" : "Authorization");
const prettyStatus = (s) =>
  s === "revision_required" ? "Revision Required" : s.charAt(0).toUpperCase() + s.slice(1);

const AdminRequests = () => {
  const [requests, setRequests] = useState([]);
  const [remarksById, setRemarksById] = useState({});

  const load = async () => {
    try {
      const data = await getAllRequests();
      setRequests(data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load requests");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpdate = async (id, status) => {
    try {
      const adminRemarks = remarksById[id] || "";
      await updateRequestStatus(id, { status, adminRemarks });
      alert("Updated!");
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update request");
    }
  };

  return (
    <div style={{ width: "1200px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "12px" }}>Pending Request Queue</h2>

      <div style={{ background: "#242424  ", padding: "16px", borderRadius: "8px" }}>
        {requests.length === 0 ? (
          <p style={{ textAlign: "center" }}>No requests found.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>Student</th>
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>Email</th>
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>Type</th>
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>Status</th>
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>Submitted</th>
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>Remarks</th>
                <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {requests.map((r) => (
                <tr key={r._id}>
                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    {r.userId?.name || "Unknown"}
                  </td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    {r.userId?.email || "Unknown"}
                  </td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    {prettyType(r.requestType)}
                  </td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    {prettyStatus(r.status)}
                  </td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    {new Date(r.createdAt).toLocaleString()}
                  </td>

                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    <input
                      type="text"
                      placeholder="Add remarks (optional)"
                      value={remarksById[r._id] ?? r.adminRemarks ?? ""}
                      onChange={(e) =>
                        setRemarksById((prev) => ({ ...prev, [r._id]: e.target.value }))
                      }
                      style={{ width: "260px", padding: "8px" }}
                    />
                  </td>

                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    <button
                      onClick={() => handleUpdate(r._id, "approved")}
                      style={{ marginRight: "8px" }}
                      disabled={r.status === "approved"}
                    >
                      Approve
                    </button>

                    <button
                      onClick={() => handleUpdate(r._id, "revision_required")}
                      disabled={r.status === "revision_required"}
                    >
                      Revision Required
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

export default AdminRequests;
