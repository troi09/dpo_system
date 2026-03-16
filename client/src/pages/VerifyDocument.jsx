import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle, XCircle } from "lucide-react";
import { verifyRequestCode } from "../services/requestService";

export default function VerifyDocument() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await verifyRequestCode(code);
        setData(res);
      } catch (err) {
        setError(err.response?.data?.message || "Verification failed");
      }
    };
    load();
  }, [code]);

  if (error) {
    return (
      <div className="verify-outer">
        <div className="verify-card">
          <span className="verify-result-icon"><XCircle size={48} color="#dc2626" /></span>
          <h2 className="verify-result-error">Verification Failed</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="verify-outer">
      <div className="verify-card">
        <span className="verify-result-icon">{data.valid ? <CheckCircle size={48} color="#16a34a" /> : <XCircle size={48} color="#dc2626" />}</span>
        {data.valid ? (
          <h2 className="verify-result-title">Document Verified</h2>
        ) : (
          <h2 className="verify-result-error">Invalid Document</h2>
        )}

        <div className="verify-meta-grid">
          <span className="verify-meta-label">Type</span>
          <span className="verify-meta-value">{data.type || "N/A"}</span>

          <span className="verify-meta-label">Status</span>
          <span className="verify-meta-value">{data.status || "N/A"}</span>

          <span className="verify-meta-label">Issued</span>
          <span className="verify-meta-value">{data.issuedAt || "N/A"}</span>
        </div>
      </div>
    </div>
  );
}
