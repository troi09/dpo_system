import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Archive, Search, RefreshCw } from "lucide-react";
import { getArchivedRequests } from "../../services/requestService";

const TYPE_LABELS = { nda: "NDA", agreement: "Agreement" };

const prettyType = (t) => TYPE_LABELS[t] || (t ? t.charAt(0).toUpperCase() + t.slice(1) : "—");

export default function AdminArchives() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [notice, setNotice] = useState("");

  const load = async ({ withToast = false } = {}) => {
    setLoading(true);
    if (withToast) setRefreshing(true);
    try {
      const data = await getArchivedRequests();
      setRequests(data);
      if (withToast) {
        setNotice("Data updated");
        setTimeout(() => setNotice(""), 1800);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    <div className="page-shell">
      {/* Header */}
      <div className="page-header-row mb-16">
        <div>
          <p className="admin-subtitle">
            Requests automatically archived after 5 years of completion
          </p>
        </div>
        <button
          onClick={() => load({ withToast: true })}
          title="Refresh"
          className="ui-btn ui-btn--secondary ui-btn--icon"
          disabled={refreshing}
        >
          <RefreshCw size={14} className={refreshing ? "spin-anim" : ""} />
        </button>
      </div>

      {notice ? (
        <div className="info-banner info-banner--success mb-12">
          <strong>{notice}</strong>
        </div>
      ) : null}

      {/* Filters */}
      <div className="admin-controls-row">
        <div className="admin-search-wrap">
          <Search size={14} className="admin-search-icon" />
          <input
            className="ui-input admin-search-input--full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
          />
        </div>
        {["all", "nda", "agreement"].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`ui-btn ui-btn--compact ${typeFilter === t ? "ui-btn--primary" : "ui-btn--secondary"}`}
          >
            {t === "all" ? "All Types" : prettyType(t)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="admin-table-card">
        {loading ? (
          <table className="admin-table admin-table--min-900">
            <thead>
              <tr>
                {["Student", "Type", "NDA Sub-type", "Submitted", "Archived On", "Status"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(4)].map((_, i) => (
                <tr key={`sk-${i}`}>
                  <td><span className="skeleton-block skeleton-text" /></td>
                  <td><span className="skeleton-block skeleton-pill" /></td>
                  <td><span className="skeleton-block skeleton-text" /></td>
                  <td><span className="skeleton-block skeleton-text" /></td>
                  <td><span className="skeleton-block skeleton-text" /></td>
                  <td><span className="skeleton-block skeleton-pill" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : filtered.length === 0 ? (
          <div className="admin-table-empty">
            <Archive size={32} color="var(--border-strong)" className="admin-table-empty-icon" />
            No archived requests found.
          </div>
        ) : (
          <table className="admin-table admin-table--min-900">
            <thead>
              <tr>
                {["Student", "Type", "NDA Sub-type", "Submitted", "Archived On", "Status"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <motion.tr
                  key={r._id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                >
                  <td>
                    <div className="admin-cell-strong">{r.userId?.name || "—"}</div>
                    <div className="admin-cell-mono">{r.userId?.email || ""}</div>
                  </td>
                  <td>
                    <span className="tag-pill" style={{
                      background: r.type === "nda" ? "#ede9fe" : "#dbeafe",
                      color: r.type === "nda" ? "#4c1d95" : "#1e3a8a",
                    }}>
                      {prettyType(r.type)}
                    </span>
                  </td>
                  <td className="admin-cell-small-muted admin-cell-muted">
                    {r.formData?.ndaTypeLabel || (r.type === "agreement" ? "—" : r.formData?.ndaType || "—")}
                  </td>
                  <td className="admin-cell-small-muted">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                  </td>
                  <td className="admin-cell-small-muted">
                    {r.archivedAt ? new Date(r.archivedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                  </td>
                  <td>
                    <span className="tag-pill tag-pill--neutral">
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

