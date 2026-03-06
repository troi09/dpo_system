import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getBySigningToken, repSubmit, repReject } from "../../services/requestService";
import { uploadSignatureImage, uploadRepGovId } from "../../services/firebaseStorageService";
import SignaturePad from "../../components/SignaturePad";

const box = {
  maxWidth: 600,
  margin: "40px auto",
  padding: "30px",
  borderRadius: 8,
  boxShadow: "0 0 12px rgba(0,0,0,0.1)",
  fontFamily: "sans-serif",
};
const label = { display: "block", fontSize: 13, fontWeight: "bold", marginBottom: 4, marginTop: 14 };
const infoBox = { padding: 10, border: "1px solid #ddd", borderRadius: 6, fontSize: 13 };
const fieldRow = { marginBottom: 12 };
const input = { width: "100%", padding: 8, fontSize: 13, borderRadius: 4, border: "1px solid #ccc", boxSizing: "border-box" };
const btn = (color) => ({
  flex: 1,
  padding: "10px",
  background: color,
  color: "#fff",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: "bold",
});

export default function RepSigningPage() {
  const { token } = useParams();

  const [reqData, setReqData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [done, setDone] = useState(""); // success message

  const [repName, setRepName] = useState("");
  const [govIdFile, setGovIdFile] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const sigPadRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await getBySigningToken(token);
        setReqData(r);
      } catch (err) {
        setError(err.response?.data?.message || "Invalid or expired signing link.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) return <div style={box}><p>Loading...</p></div>;
  if (error) return <div style={box}><h2>Error</h2><p>{error}</p></div>;
  if (done) return (
    <div style={box}>
      <h2>Thank you</h2>
      <p>{done}</p>
    </div>
  );

  // Guard: token already used
  if (reqData.signingTokenUsed) {
    return (
      <div style={box}>
        <h2>Link Already Used</h2>
        <p>This signing link has already been used. Please contact the requestor if you need a new one.</p>
      </div>
    );
  }

  // Guard: wrong status
  const signingStatuses = ["phase2_pending", "rep_revision_required"];
  if (!signingStatuses.includes(reqData.status)) {
    return (
      <div style={box}>
        <h2>Link Not Active</h2>
        <p>This signing link is no longer active (status: {reqData.status}).</p>
      </div>
    );
  }

  const isRevision = reqData.status === "rep_revision_required";
  const student = reqData.userId || {};
  const fd = reqData.formData || {};

  const handleReject = async () => {
    if (!window.confirm("Are you sure you want to decline this signing request? This action is final.")) return;
    setSubmitting(true);
    try {
      await repReject(token);
      setDone("You have declined the signing request. The requestor has been notified.");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!repName.trim()) { alert("Please enter your full name."); return; }
    if (!govIdFile) { alert("Please upload your government-issued ID."); return; }
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) { alert("Please draw your signature."); return; }
    if (!accepted) { alert("You must check 'I accept' to proceed."); return; }

    setSubmitting(true);
    try {
      // Derive storage path from authorizer sig path to use the same request folder
      const authSigPath = reqData.authorizerSigUrl || "";
      // Extract folder from authorizer sig path: <slug>/requests/agreement/<folder>/sigs/authorizer_sig.png
      // We'll use a simple approach: get the folder from the path
      const pathParts = authSigPath.split ? authSigPath.split("/") : [];
      // pathParts: [slug, requests, agreement, folder, sigs, authorizer_sig.png]
      // We need folder at index 3
      const requestFolder = pathParts[3] || `rep_${Date.now()}`;
      const studentName = student.name || "unknown";

      // Upload representative's government ID
      const govIdDoc = await uploadRepGovId(govIdFile, "agreement", studentName, requestFolder);

      // Upload representative's signature
      const sigDataUrl = sigPadRef.current.getDataUrl();
      const { url: repSigUrl, path: repSigPath } = await uploadSignatureImage(
        sigDataUrl,
        "agreement",
        studentName,
        requestFolder,
        "rep_sig.png"
      );

      await repSubmit(token, {
        repName: repName.trim(),
        repGovIdDoc: govIdDoc,
        repSigUrl,
        repSigPath,
      });

      setDone("Your submission has been received. Thank you for signing the agreement.");
    } catch (err) {
      alert(err.response?.data?.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={box}>
      <h2 style={{ marginTop: 0 }}>Agreement Signing Request</h2>
      {isRevision && (
        <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 6, padding: 12, marginBottom: 16 }}>
          <strong>Revision Requested</strong>
          <p style={{ margin: "6px 0 0 0", fontSize: 13 }}>{reqData.remarks || "Please review and resubmit your information."}</p>
        </div>
      )}

      <p style={{ fontSize: 13, color: "#555" }}>
        You have been invited to sign an authorization agreement as a representative.
        Please review the details below and complete the form to sign.
      </p>

      {/* Agreement summary */}
      <div style={{ background: "#f8f8f8", borderRadius: 6, padding: 14, marginBottom: 20 }}>
        <div style={{ marginBottom: 8 }}><strong>Requestor / Authorizer:</strong> {student.name || "—"}</div>
        <div style={{ marginBottom: 8 }}><strong>Representative Named:</strong> {fd.repName || "—"}</div>
        {fd.details && <div><strong>Details:</strong> {fd.details}</div>}
      </div>

      {/* Authorizer signature preview */}
      {reqData.authorizerSigUrl && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 6 }}>Authorizer's Signature</div>
          <div style={{ border: "1px solid #ddd", borderRadius: 4, padding: 8, background: "#fff", display: "inline-block" }}>
            <img
              src={reqData.authorizerSigUrl}
              alt="Authorizer signature"
              style={{ maxHeight: 80, display: "block" }}
            />
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{student.name}</div>
        </div>
      )}

      <hr style={{ margin: "20px 0" }} />

      {/* Representative's form */}
      <form onSubmit={handleSubmit}>
        <h3 style={{ marginTop: 0 }}>Your Information</h3>

        <div style={fieldRow}>
          <label style={label}>Full Name *</label>
          <input
            style={input}
            value={repName}
            onChange={(e) => setRepName(e.target.value)}
            placeholder="Enter your full legal name"
          />
        </div>

        <div style={fieldRow}>
          <label style={label}>Government-Issued Valid ID *</label>
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setGovIdFile(e.target.files?.[0] || null)}
            style={{ fontSize: 13 }}
          />
          {govIdFile && <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>{govIdFile.name}</div>}
        </div>

        <div style={fieldRow}>
          <label style={label}>Your E-Signature *</label>
          <p style={{ fontSize: 12, color: "#888", margin: "0 0 6px 0" }}>
            Draw your signature in the box below.
          </p>
          <SignaturePad ref={sigPadRef} height={150} />
          <button
            type="button"
            style={{ marginTop: 6, fontSize: 12, cursor: "pointer" }}
            onClick={() => sigPadRef.current?.clear()}
          >
            Clear Signature
          </button>
        </div>

        <div style={{ ...fieldRow, marginTop: 16 }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>
              I accept and acknowledge that by signing this form I am authorizing the above-named requestor
              and agree to the terms of this agreement as issued by the Data Protection Office.
            </span>
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button type="submit" style={btn("#2563eb")} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit & Sign"}
          </button>
          <button type="button" style={btn("#dc2626")} onClick={handleReject} disabled={submitting}>
            Decline
          </button>
        </div>
      </form>
    </div>
  );
}
