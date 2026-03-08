import { useEffect, useMemo, useState } from "react";
import { Archive, Search } from "lucide-react";
import { getArchivedRequests } from "../../services/requestService";

const prettyType = (t) =>
  t === "nda" ? "NDA" : "Agreement";

export default function AdminArchives() {
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    getArchivedRequests()
      .then(setRequests)
      .catch((err) => alert(err.response?.data?.message || "Failed to load archives"));
  }, []);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const matchSearch =
        !search ||
        (r.userId?.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.userId?.email || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.serialNo || "").toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "all" || r.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [requests, search, typeFilter]);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px 48px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Archive size={22} color="#6b7280" />
        <h2 style={{ margin: 0, color: "#0f2d6b" }}>Document Archives</h2>
      </div>

      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#92400e" }}>
        Displaying requests archived under the 5-year retention policy. These records are read-only.
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, background: "#fff", padding: "14px 20px", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={16} color="#9ca3af" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search by name, email, or serial no."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "8px 12px 8px 36px", width: "100%", boxSizing: "border-box", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14 }}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14 }}
        >
          <option value="all">All Types</option>
          <option value="nda">NDA</option>
          <option value="agreement">Agreement</option>
        </select>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <table className="dashboard-table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Type</th>
              <th>Serial No.</th>
              <th>Submitted</th>
              <th>Approved Document</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="dashboard-empty">No archived records found.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r._id}>
                  <td>
                    {r.userId?.name || "Unknown"}
                    <br />
                    <span className="dashboard-subtext">{r.userId?.email || ""}</span>
                  </td>
                  <td>{prettyType(r.type)}{r.formData?.ndaTypeLabel ? ` – ${r.formData.ndaTypeLabel}` : ""}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 13 }}>{r.serialNo || "—"}</td>
                  <td>{new Date(r.createdAt).toLocaleDateString("en-US")}</td>
                  <td>
                    {r.postdocs?.url ? (
                      <a href={r.postdocs.url} target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontSize: 13 }}>
                        View Document
                      </a>
                    ) : "—"}
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
