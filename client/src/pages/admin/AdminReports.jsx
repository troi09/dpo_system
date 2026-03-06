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
    <div style={{ maxWidth: "800px", padding: "20px" }}>
      <h2 style={{ marginTop: 0 }}>Reports &amp; Analytics</h2>

      {/* Window selector */}
      <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontWeight: 600 }}>Period:</span>
        {[
          { label: "Last 24 hours", value: 24 },
          { label: "Last 7 days", value: 168 },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setWindowHours(opt.value)}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              background: windowHours === opt.value ? "#1e40af" : "#fff",
              color: windowHours === opt.value ? "#fff" : "#374151",
              cursor: "pointer",
              fontWeight: windowHours === opt.value ? 600 : 400,
            }}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={() => loadAuditData(windowHours)}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {loading && <p style={{ color: "#64748b", fontStyle: "italic" }}>Loading audit report…</p>}
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {!loading && auditData && (
        <>
          {/* Stats Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" }}>
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
                  padding: "14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  background: "#fff",
                  textAlign: "center",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ fontSize: "28px", fontWeight: 700, color: "#1e40af" }}>
                  {card.value}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                  {card.label}
                </div>
              </div>
            ))}
          </div>

          {/* AI-Generated Natural Language Summary */}
          <div style={{
            padding: "16px",
            background: "#f0f9ff",
            border: "1px solid #bae6fd",
            borderRadius: "8px",
            marginBottom: "20px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ background: "#0ea5e9", color: "#fff", padding: "2px 7px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>AI</span>
              <span style={{ fontWeight: 600, color: "#0369a1" }}>DPO Security &amp; Audit Agent Summary</span>
            </div>
            <pre style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              fontSize: "14px",
              color: "#0c4a6e",
              lineHeight: 1.6,
            }}>
              {auditData.operationsSummary.summary}
            </pre>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "8px", fontStyle: "italic" }}>
              {auditData.disclaimer}
            </div>
          </div>

          {/* Anomalies */}
          <div>
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>
              Anomaly Detection
              {auditData.anomalyCount > 0 && (
                <span style={{
                  marginLeft: "8px",
                  background: "#dc2626",
                  color: "#fff",
                  borderRadius: "12px",
                  padding: "2px 8px",
                  fontSize: "12px",
                  fontWeight: 700,
                }}>
                  {auditData.anomalyCount}
                </span>
              )}
            </h3>

            {auditData.anomalyCount === 0 ? (
              <div style={{
                padding: "14px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                color: "#166534",
              }}>
                ✅ No security anomalies detected in this period.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {auditData.anomalies.map((anomaly, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "12px 14px",
                      border: `1px solid ${SEVERITY_COLORS[anomaly.severity] || "#e2e8f0"}`,
                      borderLeft: `4px solid ${SEVERITY_COLORS[anomaly.severity] || "#e2e8f0"}`,
                      borderRadius: "6px",
                      background: "#fff",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{
                        fontWeight: 700,
                        fontSize: "11px",
                        color: SEVERITY_COLORS[anomaly.severity] || "#374151",
                      }}>
                        {anomaly.severity}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: "13px" }}>{anomaly.type.replace(/_/g, " ")}</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#374151" }}>{anomaly.message}</div>
                    {anomaly.timestamp && (
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                        {new Date(anomaly.timestamp).toLocaleString("en-US")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "14px" }}>
            Report generated at: {new Date(auditData.generatedAt).toLocaleString("en-US")}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminReports;

