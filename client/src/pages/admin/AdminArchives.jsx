import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Archive, Search, RefreshCw } from "lucide-react";
import { getArchivedRequests } from "../../services/requestService";

const TYPE_LABELS = { nda: "NDA", agreement: "Agreement" };

const prettyType = (t) => TYPE_LABELS[t] || (t ? t.charAt(0).toUpperCase() + t.slice(1) : "—");

export default function AdminArchives() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await getArchivedRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const nameMatch =
        r.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.userId?.email?.toLowerCase().includes(search.toLowerCase());
      const typeMatch = typeFilter === "all" || r.type === typeFilter;
      return nameMatch && typeMatch;
    });
  }, [requests, search, typeFilter]);

  return (
    <div style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <Archive size={18} color="var(--text-muted)" />
            Archives
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
            Requests automatically archived after 5 years of completion
          </p>
        </div>
        <button
          onClick={load}
          title="Refresh"
          style={{
            padding: "8px 10px", borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-strong)", background: "var(--surface)",
            cursor: "pointer", display: "flex", alignItems: "center",
          }}
        >
          <RefreshCw size={14} color="var(--text-secondary)" />
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} color="var(--text-muted)" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            style={{
              width: "100%", padding: "9px 12px 9px 34px", borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-strong)", background: "var(--surface)",
              fontSize: 13, fontFamily: "inherit", color: "var(--text-primary)", boxSizing: "border-box",
            }}
          />
        </div>
        {["all", "nda", "agreement"].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            style={{
              padding: "8px 14px", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: 12,
              border: "1px solid var(--border-strong)", fontFamily: "inherit", cursor: "pointer",
              background: typeFilter === t ? "var(--primary)" : "var(--surface)",
              color: typeFilter === t ? "#fff" : "var(--text-secondary)",
            }}
          >
            {t === "all" ? "All Types" : prettyType(t)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-sm)",
      }}>
        {loading ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                {["Student", "Type", "NDA Sub-type", "Submitted", "Archived On", "Status"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(4)].map((_, i) => (
                <tr key={`sk-${i}`} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 16px" }}><span className="skeleton-block skeleton-text" /></td>
                  <td style={{ padding: "12px 16px" }}><span className="skeleton-block skeleton-pill" /></td>
                  <td style={{ padding: "12px 16px" }}><span className="skeleton-block skeleton-text" /></td>
                  <td style={{ padding: "12px 16px" }}><span className="skeleton-block skeleton-text" /></td>
                  <td style={{ padding: "12px 16px" }}><span className="skeleton-block skeleton-text" /></td>
                  <td style={{ padding: "12px 16px" }}><span className="skeleton-block skeleton-pill" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "32px 20px", color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>
            <Archive size={32} color="var(--border-strong)" style={{ display: "block", margin: "0 auto 10px" }} />
            No archived requests found.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                {["Student", "Type", "NDA Sub-type", "Submitted", "Archived On", "Status"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <motion.tr
                  key={r._id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{r.userId?.name || "—"}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.userId?.email || ""}</div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                      background: r.type === "nda" ? "#ede9fe" : "#dbeafe",
                      color: r.type === "nda" ? "#4c1d95" : "#1e3a8a",
                    }}>
                      {prettyType(r.type)}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: 12 }}>
                    {r.formData?.ndaTypeLabel || (r.type === "agreement" ? "—" : r.formData?.ndaType || "—")}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: 12 }}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: 12 }}>
                    {r.archivedAt ? new Date(r.archivedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: "#f1f5f9", color: "#64748b" }}>
                      Archived
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
