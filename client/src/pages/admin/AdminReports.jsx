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
