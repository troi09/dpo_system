<<<<<<< HEAD
import { useEffect, useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";
import { TrendingUp, FileText, BarChart2 } from "lucide-react";
import { getAllRequests } from "../../services/requestService";

const COLORS = {
  pending: "#f59e0b",
  approved: "#10b981",
  revision_required: "#ef4444",
};

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const prettyStatus = (s) =>
  s === "revision_required" ? "Revision Required" : s.charAt(0).toUpperCase() + s.slice(1);

function buildSmartSummary(requests, filtered, monthLabel) {
  if (requests.length === 0) return "No requests have been submitted yet.";
  const pending = filtered.filter((r) => r.status === "pending").length;
  const approved = filtered.filter((r) => r.status === "approved").length;
  const revision = filtered.filter((r) => r.status === "revision_required").length;
  const total = filtered.length;
  if (total === 0) return `No requests found for ${monthLabel}.`;
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
  const parts = [];
  if (pending > 0) parts.push(`${pending} request${pending > 1 ? "s are" : " is"} pending`);
  if (approved > 0) parts.push(`${approved} approved (${approvalRate}% approval rate)`);
  if (revision > 0) parts.push(`${revision} requiring revision`);
  return `For ${monthLabel}: ${parts.join(", ")}.`;
}

export default function AdminReports() {
  const [requests, setRequests] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    getAllRequests()
      .then(setRequests)
      .catch((err) => console.error("reports:", err.message));
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set(requests.map((r) => new Date(r.createdAt).getFullYear()));
    years.add(new Date().getFullYear());
    return [...years].sort((a, b) => b - a);
  }, [requests]);

  const filtered = useMemo(
    () =>
      requests.filter((r) => {
        const d = new Date(r.createdAt);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      }),
    [requests, selectedMonth, selectedYear]
  );

  const monthLabel = `${MONTH_LABELS[selectedMonth]} ${selectedYear}`;

  // Donut data
  const statusCounts = filtered.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  const donutData = Object.entries(statusCounts).map(([name, value]) => ({
    name: prettyStatus(name),
    value,
    color: COLORS[name] || "#94a3b8",
  }));

  // Bar data – types
  const barData = [
    {
      name: monthLabel,
      NDA: filtered.filter((r) => r.type === "nda").length,
      Agreement: filtered.filter((r) => r.type === "agreement").length,
    },
  ];

  // Line chart – monthly trend for the selected year
  const monthlyTrend = MONTH_LABELS.map((m, idx) => {
    const monthRequests = requests.filter(
      (r) => new Date(r.createdAt).getMonth() === idx && new Date(r.createdAt).getFullYear() === selectedYear
    );
    return {
      month: m,
      Total: monthRequests.length,
      Approved: monthRequests.filter((r) => r.status === "approved").length,
    };
  });

  const summary = buildSmartSummary(requests, filtered, monthLabel);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px 48px" }}>
      <h2 style={{ color: "#0f2d6b", margin: "0 0 20px" }}>Reports & Analytics</h2>

      {/* ── Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28, background: "#fff", padding: "16px 20px", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <div>
          <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14 }}
          >
            {MONTH_LABELS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14 }}
          >
            {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* ── Smart Summary */}
      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <TrendingUp size={20} color="#2563eb" style={{ marginTop: 2, flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1e40af", marginBottom: 4 }}>Smart Summary</div>
          <div style={{ fontSize: 14, color: "#1e3a8a" }}>{summary}</div>
        </div>
      </div>

      {/* ── Charts row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Donut */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <FileText size={18} color="#0f2d6b" />
            <h3 style={{ margin: 0, fontSize: 15, color: "#0f2d6b", fontWeight: 700 }}>Status Distribution – {monthLabel}</h3>
          </div>
          {donutData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: "#9ca3af", textAlign: "center", paddingTop: 80 }}>No data for {monthLabel}.</p>
          )}
        </div>

        {/* Bar */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <BarChart2 size={18} color="#0f2d6b" />
            <h3 style={{ margin: 0, fontSize: 15, color: "#0f2d6b", fontWeight: 700 }}>Document Types – {monthLabel}</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="NDA" fill="#0f2d6b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Agreement" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Monthly Trend line chart */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <TrendingUp size={18} color="#0f2d6b" />
          <h3 style={{ margin: 0, fontSize: 15, color: "#0f2d6b", fontWeight: 700 }}>Monthly Trend – {selectedYear}</h3>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Total" stroke="#0f2d6b" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Approved" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
=======
import { useEffect, useState } from "react";
import { getAuditSummary } from "../../services/aiService";

const SEVERITY_COLORS = {
  HIGH: "#dc2626",
  MEDIUM: "#d97706",
  LOW: "#16a34a",
};

const AdminReports = () => {
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [windowHours, setWindowHours] = useState(24);

  const loadAuditData = async (hours) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditSummary(hours);
      setAuditData(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load audit report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditData(windowHours);
  }, [windowHours]);

  const stats = auditData?.operationsSummary?.stats || {};

  return (
    <div style={{ maxWidth: "860px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "var(--text-primary)" }}>
          Reports &amp; Analytics
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {[
            { label: "24 hours", value: 24 },
            { label: "7 days", value: 168 },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setWindowHours(opt.value)}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-strong)",
                background: windowHours === opt.value ? "var(--primary)" : "var(--surface)",
                color: windowHours === opt.value ? "#fff" : "var(--text-secondary)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "12px",
                fontFamily: "inherit",
                transition: "background 0.15s ease",
              }}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => loadAuditData(windowHours)}
            style={{
              padding: "6px 10px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-strong)",
              background: "var(--surface)",
              cursor: "pointer",
              fontSize: "14px",
              fontFamily: "inherit",
            }}
            title="Refresh"
          >
            ↻
          </button>
        </div>
      </div>

      {loading && (
        <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "13px" }}>
          Loading audit report…
        </p>
      )}
      {error && (
        <div className="info-banner info-banner--danger">
          <p>{error}</p>
        </div>
      )}

      {!loading && auditData && (
        <>
          {/* Stats Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "10px",
            marginBottom: "20px",
          }}>
            {[
              { label: "New Requests", value: stats.totalRequests ?? 0 },
              { label: "Approved", value: stats.approvedRequests ?? 0 },
              { label: "Pending", value: stats.pendingRequests ?? 0 },
              { label: "NDAs", value: stats.ndaRequests ?? 0 },
              { label: "Agreements", value: stats.agreementRequests ?? 0 },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  padding: "16px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--surface)",
                  textAlign: "center",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div style={{ fontSize: "26px", fontWeight: 700, color: "var(--primary)" }}>
                  {card.value}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                  {card.label}
                </div>
              </div>
            ))}
          </div>

          {/* AI Summary */}
          <div style={{
            padding: "16px 20px",
            background: "var(--s-info-bg)",
            border: "1px solid var(--s-info-dot)",
            borderRadius: "var(--radius-lg)",
            marginBottom: "20px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <span style={{
                background: "var(--s-info-dot)",
                color: "#fff",
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}>
                AI
              </span>
              <span style={{ fontWeight: 700, color: "var(--s-info-text)", fontSize: "13px" }}>
                DPO Security &amp; Audit Agent Summary
              </span>
            </div>
            <pre style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              fontSize: "13.5px",
              color: "var(--s-info-text)",
              lineHeight: 1.65,
            }}>
              {auditData.operationsSummary.summary}
            </pre>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "10px", fontStyle: "italic" }}>
              {auditData.disclaimer}
            </div>
          </div>

          {/* Anomalies */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                Anomaly Detection
              </h3>
              {auditData.anomalyCount > 0 && (
                <span style={{
                  background: "var(--s-revision-bg)",
                  color: "var(--s-revision-text)",
                  borderRadius: "999px",
                  padding: "2px 8px",
                  fontSize: "11px",
                  fontWeight: 700,
                }}>
                  {auditData.anomalyCount}
                </span>
              )}
            </div>

            {auditData.anomalyCount === 0 ? (
              <div className="info-banner info-banner--success">
                <p>✅ No security anomalies detected in this period.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {auditData.anomalies.map((anomaly, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "12px 16px",
                      border: `1px solid var(--border)`,
                      borderLeft: `4px solid ${SEVERITY_COLORS[anomaly.severity] || "var(--border-strong)"}`,
                      borderRadius: "var(--radius-md)",
                      background: "var(--surface)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{
                        fontWeight: 700,
                        fontSize: "11px",
                        color: SEVERITY_COLORS[anomaly.severity] || "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}>
                        {anomaly.severity}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>
                        {anomaly.type.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{anomaly.message}</div>
                    {anomaly.timestamp && (
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                        {new Date(anomaly.timestamp).toLocaleString("en-US")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "16px" }}>
            Report generated at: {new Date(auditData.generatedAt).toLocaleString("en-US")}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminReports;

>>>>>>> origin/Branch-ni-Kurl!
