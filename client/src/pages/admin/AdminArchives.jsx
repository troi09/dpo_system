import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Filter, RefreshCw } from "lucide-react";
import { getArchivedRequests } from "../../services/requestService";
import FilterSelect from "../../components/FilterSelect";

const STATUS_LABEL = {
  nda_approved: "Approved",
  agr_approved: "Approved",
};

const prettyStatus = (s) =>
  STATUS_LABEL[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "—");

export default function AdminArchives() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateMode, setDateMode] = useState("preset");
  const [preset, setPreset] = useState("all");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isFilterOpen, setIsFilterOpen] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 768
  );

  const load = async ({ withToast = false } = {}) => {
    setLoading(true);
    if (withToast) setRefreshing(true);
    try {
      const data = await getArchivedRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setIsFilterOpen(true); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const applySearch = () => setSearchTerm(searchInput.trim());
  const clearSearch = () => { setSearchInput(""); setSearchTerm(""); };

  const resetAndRefresh = () => {
    setSearchInput("");
    setSearchTerm("");
    setTypeFilter("all");
    setStatusFilter("all");
    setDateMode("preset");
    setPreset("all");
    setSingleDate("");
    setStartDate("");
    setEndDate("");
    load({ withToast: true });
  };

  const filtered = useMemo(() => {
    let result = requests;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((r) => {
        const name = (r.userId?.name || r.proxyRequestee?.fullName || "").toLowerCase();
        const email = (r.userId?.email || r.proxyRequestee?.email || "").toLowerCase();
        const id = (r._id || "").slice(-7).toLowerCase();
        return name.includes(term) || email.includes(term) || id.includes(term);
      });
    }

    if (typeFilter !== "all") {
      if (typeFilter === "agreement") {
        result = result.filter((r) => r.type === "agreement");
      } else if (typeFilter === "nda_orgactivities") {
        result = result.filter((r) => r.type === "nda" && r.formData?.ndaType === "orgactivities");
      } else if (typeFilter === "nda_research") {
        result = result.filter((r) => r.type === "nda" && r.formData?.ndaType === "research");
      }
    }

    if (statusFilter !== "all") {
      const statusMap = {
        reviewal:      ["nda_pending", "agr_pending_1", "agr_pending_2"],
        approved:      ["nda_approved", "agr_approved"],
        stud_revision: ["stud_revision_requested"],
        rep_revision:  ["agr_rep_revision_requested"],
        rep_declined:  ["agr_declined"],
        awaiting_rep:  ["agr_awaiting_rep_signature"],
      };
      const statuses = statusMap[statusFilter] || [];
      result = result.filter((r) => statuses.includes(r.status));
    }

    if (dateMode === "preset") {
      const now = new Date();
      if (preset === "today") {
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayEnd = new Date(dayStart.getTime() + 86400000 - 1);
        result = result.filter((r) => { const d = new Date(r.createdAt); return d >= dayStart && d <= dayEnd; });
      } else if (preset === "thisWeek") {
        const day = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((day + 6) % 7));
        monday.setHours(0, 0, 0, 0);
        result = result.filter((r) => new Date(r.createdAt) >= monday);
      } else if (preset === "thisMonth") {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        result = result.filter((r) => new Date(r.createdAt) >= monthStart);
      } else if (preset === "thisYear") {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        result = result.filter((r) => new Date(r.createdAt) >= yearStart);
      }
    } else if (dateMode === "single" && singleDate) {
      const dayStart = new Date(singleDate);
      const dayEnd = new Date(singleDate + "T23:59:59");
      result = result.filter((r) => { const d = new Date(r.createdAt); return d >= dayStart && d <= dayEnd; });
    } else if (dateMode === "range") {
      if (startDate) result = result.filter((r) => new Date(r.createdAt) >= new Date(startDate));
      if (endDate) result = result.filter((r) => new Date(r.createdAt) <= new Date(endDate + "T23:59:59"));
    }

    return result;
  }, [requests, searchTerm, typeFilter, statusFilter, dateMode, preset, singleDate, startDate, endDate]);

  return (
    <div className="page-shell">

      {/* ── Toolbar ── */}
      <div className="req-toolbar">
        <div className="req-toolbar__search-row">
          <div className="req-toolbar__search-box">
            <input
              type="text"
              className="req-toolbar__search-input"
              placeholder="Search by requestee, email, or request ID…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applySearch(); }}
            />
            {searchInput ? (
              <button type="button" className="req-toolbar__search-clear" onClick={clearSearch} aria-label="Clear search">
                ×
              </button>
            ) : null}
            <button type="button" className="req-toolbar__search-inline-btn" onClick={applySearch} aria-label="Search">
              <Search size={14} />
            </button>
          </div>
          <button
            type="button"
            className="ui-btn ui-btn--secondary req-toolbar__filter-toggle"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            aria-expanded={isFilterOpen}
          >
            <Filter size={13} />
            Filters
          </button>
        </div>

        <div className={`req-toolbar__filters${isFilterOpen ? " req-toolbar__filters--open" : ""}`}>
          <div className="req-toolbar__filter-group">
            <label className="req-toolbar__filter-label">Type</label>
            <FilterSelect
              value={typeFilter}
              onChange={setTypeFilter}
              className="filter-select--type"
              options={[
                { value: "all", label: "All Types" },
                { value: "nda_orgactivities", label: "NDA — Student Organization Activities" },
                { value: "nda_research", label: "NDA — Conduct of Research" },
                { value: "agreement", label: "Agreement" },
              ]}
            />
          </div>

          <div className="req-toolbar__filter-group">
            <label className="req-toolbar__filter-label">Status</label>
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              className="filter-select--status"
              options={[
                { value: "all", label: "All Statuses" },
                { value: "reviewal", label: "Reviewal" },
                { value: "approved", label: "Approved" },
                { value: "stud_revision", label: "Student Revisions" },
                { value: "rep_revision", label: "Recipient Revisions" },
                { value: "rep_declined", label: "Recipient Declined" },
                { value: "awaiting_rep", label: "Recipient Reviewal" },
              ]}
            />
          </div>

          <div className="req-toolbar__filter-group">
            <label className="req-toolbar__filter-label">Date</label>
            <FilterSelect
              value={dateMode}
              onChange={setDateMode}
              options={[
                { value: "preset", label: "Preset" },
                { value: "single", label: "Specific Date" },
                { value: "range", label: "Date Range" },
              ]}
              defaultValue="preset"
            />
          </div>

          {dateMode === "preset" ? (
            <div className="req-toolbar__filter-group">
              <label className="req-toolbar__filter-label">Period</label>
              <FilterSelect
                value={preset}
                onChange={setPreset}
                options={[
                  { value: "all", label: "All Time" },
                  { value: "today", label: "Today" },
                  { value: "thisWeek", label: "This Week" },
                  { value: "thisMonth", label: "This Month" },
                  { value: "thisYear", label: "This Year" },
                ]}
              />
            </div>
          ) : null}

          {dateMode === "single" ? (
            <div className="req-toolbar__filter-group">
              <label className="req-toolbar__filter-label">Date</label>
              <input className={`req-toolbar__filter-select${singleDate !== "" ? " req-toolbar__filter-select--active" : ""}`} type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} />
            </div>
          ) : null}

          {dateMode === "range" ? (
            <>
              <div className="req-toolbar__filter-group">
                <label className="req-toolbar__filter-label">From</label>
                <input className={`req-toolbar__filter-select${startDate !== "" ? " req-toolbar__filter-select--active" : ""}`} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="req-toolbar__filter-group">
                <label className="req-toolbar__filter-label">To</label>
                <input className={`req-toolbar__filter-select${endDate !== "" ? " req-toolbar__filter-select--active" : ""}`} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </>
          ) : null}

          <button
            type="button"
            className="req-toolbar__reset-btn"
            onClick={resetAndRefresh}
            disabled={refreshing}
            title="Reset filters and refresh"
          >
            <RefreshCw size={14} className={refreshing ? "spin-anim" : ""} />
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="dashboard-card">
        <div className="table-scroll">
          <table className="dashboard-table">
            <thead>
              <tr className="dashboard-table-title-row">
                <th colSpan={6}>
                  <div className="dashboard-table-title-wrap">
                    <span className="dashboard-table-title">Archives</span>
                  </div>
                </th>
              </tr>
              <tr>
                <th>Request Date</th>
                <th>Archived Date</th>
                <th>Requestee</th>
                <th>Request ID</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={`sk-${i}`}>
                    <td><span className="skeleton-block skeleton-text" /></td>
                    <td><span className="skeleton-block skeleton-text" /></td>
                    <td><span className="skeleton-block skeleton-text" /></td>
                    <td><span className="skeleton-block skeleton-text" /></td>
                    <td><span className="skeleton-block skeleton-pill" /></td>
                    <td><span className="skeleton-block skeleton-pill" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="dashboard-empty">
                      <p className="dashboard-empty-title">No archived requests found</p>
                      <p className="dashboard-empty-text">No archived requests match the current filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => {
                  const name = r.proxyRequestee?.isProxy
                    ? (`${r.proxyRequestee.firstName || ""} ${r.proxyRequestee.lastName || ""}`.trim() || r.proxyRequestee.fullName || "—")
                    : (r.userId?.name || "—");
                  const email = r.proxyRequestee?.isProxy
                    ? (r.proxyRequestee.email || "")
                    : (r.userId?.email || "");
                  const typeLabel = r.type === "nda"
                    ? `NDA${r.formData?.ndaTypeLabel ? ` — ${r.formData.ndaTypeLabel}` : ""}`
                    : "Agreement";
                  return (
                    <motion.tr
                      key={r._id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    >
                      <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                      </td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                        {r.archivedAt ? new Date(r.archivedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{name}</span>
                        {email && <span className="dashboard-subtext">{email}</span>}
                        {r.proxyRequestee?.isProxy && (
                          <span className="dashboard-subtext">Proxy (F2F)</span>
                        )}
                      </td>
                      <td><span style={{ color: "var(--text-secondary)" }}>{r._id?.slice(-7).toUpperCase()}</span></td>
                      <td>{typeLabel}</td>
                      <td>
                        <span className="tag-pill tag-pill--neutral">Archived</span>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
