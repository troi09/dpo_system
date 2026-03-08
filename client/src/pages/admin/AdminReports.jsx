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
