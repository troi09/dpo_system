import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { getBySigningToken, repSubmit, repReject } from "../../services/requestService";
import { uploadSignatureImage, uploadRepGovId, deleteStorageFile } from "../../services/firebaseStorageService";
import SignaturePad from "../../components/SignaturePad";
import { notify } from "../../utils/inPageFeedback";
import "../../components/RepSigningPage.css";

export default function RepSigningPage() {
  const { token } = useParams();

  const [reqData, setReqData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [done, setDone] = useState(""); // success message

  const [repFirstName, setRepFirstName] = useState("");
  const [repMiddleName, setRepMiddleName] = useState("");
  const [repLastName, setRepLastName] = useState("");
  const [govIdFile, setGovIdFile] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(null); // "submit" | "decline" | null

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

  const sanitizeNamePart = (value) => String(value || "").replace(/[^A-Za-z\s'.-]/g, "");

  // Keep this hook before any conditional return to preserve hook order.
  useEffect(() => {
    if (!reqData) return;
    const fd = reqData.formData || {};
    const first = fd.repFirstName || "";
    const middle = fd.repMiddleInitial || "";
    const last = fd.repLastName || "";

    if (first || middle || last) {
      setRepFirstName(sanitizeNamePart(first));
      setRepMiddleName(sanitizeNamePart(middle));
      setRepLastName(sanitizeNamePart(last));
    }
  }, [reqData]);

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
  const signingStatuses = [
    "agr_awaiting_rep_signature",
    "agr_rep_revision_requested",
  ];
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

  const isRevision = reqData.status === "agr_rep_revision_requested";
  const student = reqData.userId || {};
  const fd = reqData.formData || {};
  const storedMiddle = sanitizeNamePart(fd.repMiddleInitial || "").trim();
  const storedMiddleInitial = storedMiddle ? `${storedMiddle[0].toUpperCase()}.` : "";
  const requestedRepName = [fd.repFirstName, storedMiddleInitial, fd.repLastName]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim() || fd.repName || "—";
  const normalizedMiddleName = sanitizeNamePart(repMiddleName).replace(/\./g, "").trim();
  const representativeFullName = [
    sanitizeNamePart(repFirstName).trim(),
    normalizedMiddleName ? `${normalizedMiddleName[0].toUpperCase()}.` : "",
    sanitizeNamePart(repLastName).trim(),
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const handleReject = () => {
    setShowConfirm("decline");
  };

  const handleConfirmReject = async () => {
    setShowConfirm(null);
    setSubmitting(true);
    try {
      await repReject(token);
      setDone("You have declined the signing request. The requestor has been notified.");
    } catch (err) {
      notify(err.response?.data?.message || "Failed to reject. Please try again.", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!sanitizeNamePart(repFirstName).trim()) { notify("Please enter your first name.", { type: "warning" }); return; }
    if (!sanitizeNamePart(repLastName).trim()) { notify("Please enter your last name.", { type: "warning" }); return; }
    if (!govIdFile) { notify("Please upload your government-issued ID.", { type: "warning" }); return; }
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) { notify("Please draw your signature.", { type: "warning" }); return; }
    if (!accepted) { notify("You must check 'I accept' to proceed.", { type: "warning" }); return; }

    setShowConfirm("submit");
  };

  const handleConfirmSubmit = async () => {
    setShowConfirm(null);
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
        repName: representativeFullName,
        repGovIdDoc: govIdDoc,
        repSigUrl,
        repSigPath,
      });

      setDone("Your submission has been received. Thank you for signing the agreement.");
    } catch (err) {
      notify(err.response?.data?.message || "Submission failed. Please try again.", { type: "error" });
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

        {/* Letter-format summary */}
        <div className="rep-signing-summary" style={{ padding: "20px 24px", gap: 0 }}>
          {/* Date — left */}
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 18 }}>
            {reqData.createdAt ? new Date(reqData.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}
          </div>

          {/* Authorization paragraph — centered */}
          <p style={{ textAlign: "center", fontSize: 13.5, color: "var(--text-primary)", lineHeight: 1.75, margin: "0 0 24px" }}>
            I, <strong>{student.name || "—"}</strong>, hereby authorize{" "}
            <strong>{requestedRepName}</strong> to act as my representative and sign on my behalf
            in connection with this agreement, as governed by the Data Protection Office.
          </p>

          {/* Signature block — centered */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            {reqData.authorizerSigUrl && (
              <img
                src={reqData.authorizerSigUrl}
                alt="Authorizer signature"
                style={{ maxHeight: 72, display: "block" }}
                loading="lazy"
                decoding="async"
              />
            )}
            <div style={{ width: 220, borderTop: "1px solid var(--border-strong)", textAlign: "center", paddingTop: 6, fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>
              {student.name || "—"}
            </div>
          </div>
        </div>

        <hr className="rep-signing-divider" />

        {/* Representative's form */}
        <form onSubmit={handleSubmit}>
          <h3 className="rep-signing-section-title">Your Information</h3>

          <div className="rep-signing-field">
            <p className="rep-signing-name-note">Please ensure the name entered matches the name shown on your government-issued ID.</p>
            <label className="rep-signing-label">Full Name *</label>
            <div className="rep-signing-name-grid">
              <div className="rep-signing-name-col">
                <label className="rep-signing-name-sublabel">First Name</label>
                <input
                  className="rep-signing-input"
                  value={repFirstName}
                  onChange={(e) => setRepFirstName(sanitizeNamePart(e.target.value))}
                  required
                />
              </div>
              <div className="rep-signing-name-col">
                <label className="rep-signing-name-sublabel">Middle Name</label>
                <input
                  className="rep-signing-input"
                  value={repMiddleName}
                  onChange={(e) => setRepMiddleName(sanitizeNamePart(e.target.value))}
                />
              </div>
              <div className="rep-signing-name-col">
                <label className="rep-signing-name-sublabel">Last Name</label>
                <input
                  className="rep-signing-input"
                  value={repLastName}
                  onChange={(e) => setRepLastName(sanitizeNamePart(e.target.value))}
                  required
                />
              </div>
            </div>
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
                {govIdFile ? "Change File" : "Upload File"}
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
            <SignaturePad ref={sigPadRef} height={160} />
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

      <AnimatePresence>
        {showConfirm && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
              <h3 className="modal-title">
                {showConfirm === "submit" ? "Submit & Sign Agreement" : "Decline Signing Request"}
              </h3>
              <p className="modal-text">
                {showConfirm === "submit"
                  ? "Please confirm that all your information and signature are accurate before submitting."
                  : "Are you sure you want to decline? This action is final and the requestor will be notified."}
              </p>
              <div className="modal-actions">
                <button className="ui-btn ui-btn--secondary" onClick={() => setShowConfirm(null)} disabled={submitting}>Cancel</button>
                <button
                  className="ui-btn ui-btn--primary"
                  onClick={showConfirm === "submit" ? handleConfirmSubmit : handleConfirmReject}
                  disabled={submitting}
                >
                  {showConfirm === "submit" ? "Submit" : "Decline"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
