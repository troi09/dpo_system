import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getBySigningToken, repSubmit, repReject } from "../../services/requestService";
import { uploadSignatureImage, uploadRepGovId, deleteStorageFile } from "../../services/firebaseStorageService";
import SignaturePad from "../../components/SignaturePad";
import "../../components/RepSigningPage.css";

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
  const fileInputRef = useRef(null);

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

  if (loading) return (
    <div className="rep-signing-outer">
      <div className="rep-signing-state"><p>Loading...</p></div>
    </div>
  );

  if (error) return (
    <div className="rep-signing-outer">
      <div className="rep-signing-state">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    </div>
  );

  if (done) return (
    <div className="rep-signing-outer">
      <div className="rep-signing-state">
        <h2>Thank you</h2>
        <p>{done}</p>
      </div>
    </div>
  );

  // Guard: token already used
  if (reqData.signingTokenUsed) {
    return (
      <div className="rep-signing-outer">
        <div className="rep-signing-state">
          <h2>Link Already Used</h2>
          <p>This signing link has already been used. Please contact the requestor if you need a new one.</p>
        </div>
      </div>
    );
  }

  // Guard: wrong status
  const signingStatuses = ["awaiting_signature", "rep_revision_requested"];
  if (!signingStatuses.includes(reqData.status)) {
    return (
      <div className="rep-signing-outer">
        <div className="rep-signing-state">
          <h2>Link Not Active</h2>
          <p>This signing link is no longer active (status: {reqData.status}).</p>
        </div>
      </div>
    );
  }

  const isRevision = reqData.status === "rep_revision_requested";
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
      const authSigPath = reqData.authorizerSigPath || "";
      const pathParts = authSigPath.split ? authSigPath.split("/") : [];
      const requestFolder = pathParts[3] || `rep_${Date.now()}`;
      const studentName = student.name || "unknown";

      if (isRevision && reqData.repInfo?.govIdDoc?.path) {
        await deleteStorageFile(reqData.repInfo.govIdDoc.path);
      }

      const govIdDoc = await uploadRepGovId(govIdFile, "agreement", studentName, requestFolder);

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
    <div className="rep-signing-outer">
      <div className="rep-signing-card">
        <h2 className="rep-signing-title">Agreement Signing Request</h2>

        {isRevision && (
          <div className="rep-signing-revision-banner">
            <strong>Revision Requested</strong>
            <p>{reqData.remarks || "Please review and resubmit your information."}</p>
          </div>
        )}

        <p className="rep-signing-intro">
          You have been invited to sign an authorization agreement as a representative.
          Please review the details below and complete the form to sign.
        </p>

        {/* Agreement summary */}
        <div className="rep-signing-summary">
          <div className="rep-signing-summary-row">
            <strong>Requestor / Authorizer:</strong> {student.name || "—"}
          </div>
          <div className="rep-signing-summary-row">
            <strong>Representative Named:</strong> {fd.repName || "—"}
          </div>
          {fd.details && (
            <div className="rep-signing-summary-row">
              <strong>Details:</strong> {fd.details}
            </div>
          )}
        </div>

        {/* Authorizer signature preview */}
        {reqData.authorizerSigUrl && (
          <div className="rep-signing-auth-sig">
            <div className="rep-signing-auth-sig-label">Authorizer&apos;s Signature</div>
            <div className="rep-signing-auth-sig-box">
              <img src={reqData.authorizerSigUrl} alt="Authorizer signature" />
            </div>
            <div className="rep-signing-auth-sig-name">{student.name}</div>
          </div>
        )}

        <hr className="rep-signing-divider" />

        {/* Representative's form */}
        <form onSubmit={handleSubmit}>
          <h3 className="rep-signing-section-title">Your Information</h3>

          <div className="rep-signing-field">
            <label className="rep-signing-label">Full Name *</label>
            <input
              className="rep-signing-input"
              value={repName}
              onChange={(e) => setRepName(e.target.value)}
              placeholder="Enter your full legal name"
            />
          </div>

          <div className="rep-signing-field">
            <label className="rep-signing-label">Government-Issued Valid ID *</label>
            <div className="rep-signing-file-row">
              <div className="rep-signing-file-info">
                <span className="rep-signing-file-title">
                  {govIdFile ? govIdFile.name : "No file chosen"}
                </span>
                <span className="rep-signing-file-subtitle">PDF or image accepted</span>
              </div>
              <label className="rep-signing-file-action">
                {govIdFile ? "Change" : "Upload"}
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setGovIdFile(e.target.files?.[0] || null)}
                  ref={fileInputRef}
                />
              </label>
            </div>
          </div>

          <div className="rep-signing-field">
            <label className="rep-signing-label">Your E-Signature *</label>
            <p className="rep-signing-sig-hint">Draw your signature in the box below.</p>
            <SignaturePad ref={sigPadRef} height={150} />
            <button
              type="button"
              className="rep-signing-clear-btn"
              onClick={() => sigPadRef.current?.clear()}
            >
              Clear Signature
            </button>
          </div>

          <label className="rep-signing-accept">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>
              I accept and acknowledge that by signing this form I am authorizing the above-named requestor
              and agree to the terms of this agreement as issued by the Data Protection Office.
            </span>
          </label>

          <div className="rep-signing-actions">
            <button type="submit" className="rep-signing-btn-submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit & Sign"}
            </button>
            <button
              type="button"
              className="rep-signing-btn-decline"
              onClick={handleReject}
              disabled={submitting}
            >
              Decline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
