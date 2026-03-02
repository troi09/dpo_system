import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { verifyRequestCode } from "../services/requestService";

const boxStyle = {
  padding: "30px",
  borderRadius: "8px",
  width: "520px",
  textAlign: "center",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
};

const labelStyle = { fontSize: "13px", opacity: 0.7, marginTop: "10px" };

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
      <div style={boxStyle}>
        <h2>Verification Failed</h2>
        <div style={labelStyle}>{error}</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={boxStyle}>
      {data.valid ? <h2>✅ Document Verified</h2> : <h2>❌ Invalid Document</h2>}

      <div style={{ marginTop: "14px" }}>
        <div><b>Type:</b> {data.type || "N/A"}</div>
        <div><b>Status:</b> {data.status || "N/A"}</div>
        <div><b>Issued:</b> {data.issuedAt || "N/A"}</div>
        {data.studentName ? <div><b>Student:</b> {data.studentName}</div> : null}
      </div>
    </div>
  );
}