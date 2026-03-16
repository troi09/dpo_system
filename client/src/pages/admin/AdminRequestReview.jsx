import { useEffect, useRef, useState, useMemo, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Paperclip, RefreshCw } from "lucide-react";
import RequestStepper from "../../components/RequestStepper";
import { FIELDS_FILE_SLOTS_CONFIG } from "../../config/fieldsFileSlotsConfig";
import { AuthContext } from "../../context/AuthContext";

import {
  getRequestById,
  updateRequestStatus,
  saveApprovedDocument,
  generateSigningLink,
  adminPhase3Action,
  getSignatureImages,
} from "../../services/requestService";
import { confirmInPage, notify } from "../../utils/inPageFeedback";

import {
  uploadApprovedForm,
  uploadApprovedQrImage,
  deleteStorageFile,
  uploadSignatureImage,
} from "../../services/firebaseStorageService";
import { buildVerificationUrl, generateQrDataUrl } from "../../services/qrService";
import SignaturePad from "../../components/SignaturePad";

const prettyStatus = (s) => {
  const map = {
    nda_submitted:              "Submitted",
    nda_admin_reviewal:         "Admin Reviewal",
    nda_approved:               "Approved",
    nda_revision_requested:      "Revision Requested",
    agreement_submitted:                "Submitted",
    agreement_initial_admin_reviewal:   "Initial Admin Reviewal",
    agreement_awaiting_rep_approval:    "Awaiting Representative Approval",
    agreement_final_admin_reviewal:     "Final Admin Reviewal",
    agreement_approved:                 "Approved",
    agreement_rep_declined:             "Declined by Representative",
    agreement_rep_revision_requested:   "Representative Revision Requested",

    // Legacy fallback labels
    nda_pending:                "Admin Reviewal",
    revision_requested:         "Revision Requested",
    agr_pending_1:              "Initial Admin Reviewal",
    agr_awaiting_rep_signature: "Awaiting Representative Approval",
    agr_pending_2:              "Final Admin Reviewal",
    agr_approved:               "Approved",
    agr_rep_declined:           "Declined by Representative",
    agr_rep_revision_requested: "Representative Revision Requested",
  };
  return map[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "—");
};

const getRequestFolder = (predocs = []) => {
  for (const r of predocs) {
    if (r.path) {
      const parts = String(r.path).split("/");
      return parts[3] || "";
    }
  }
  return "";
};

// ─────────────────────────────────────────────────────────────────────────────
// NDA review panel (flow: pending → approved | revision_requested)
// ─────────────────────────────────────────────────────────────────────────────
function NdaReviewPanel({ reqData, canProgress, onRequestUpdated }) {
  const { user } = useContext(AuthContext);
  const [remarks, setRemarks] = useState(reqData.remarks || "");
  const [activeAction, setActiveAction] = useState(null); // "approve" | "revision" | null
  const adminSigRef = useRef(null);

  const cfg = useMemo(() => {
    if (reqData.type === "nda") return FIELDS_FILE_SLOTS_CONFIG.nda?.[reqData.formData?.ndaType];
    return null;
  }, [reqData]);

  const isSubmitted = reqData?.status === "nda_submitted";
  const isAdminReviewal = reqData?.status === "nda_admin_reviewal" || reqData?.status === "nda_pending";
  const isRevision = reqData?.status === "nda_revision_requested" || reqData?.status === "revision_requested";
  const isApproved = reqData?.status === "nda_approved";


  const isProxy = reqData?.proxyRequestee?.isProxy;

  const handleUpdate = async (status) => {
    if (status === "nda_approved") {
      if (!isProxy && (!adminSigRef.current || adminSigRef.current.isEmpty())) {
        notify("Please draw your e-signature before approving.", { type: "warning" });
        return;
      }
    }
    if (status === "nda_revision_requested" || status === "revision_requested") {
      if (!remarks.trim()) {
        notify("Please enter remarks before requesting a revision.", { type: "warning" });
        return;
      }
    }
    setActiveAction(
      status === "nda_admin_reviewal"
        ? "forward"
        : status === "nda_approved"
          ? "approve"
          : "revision"
    );
    try {
      if (status === "nda_approved") {
        // For F2F proxy requests, skip digital signatures (wet signature will be applied on print)
        if (isProxy) {
          const updateRes = await updateRequestStatus(reqData._id, {
            status,
            remarks,
          });
          const updated = updateRes.request;
          if (!updated?.serialNo) throw new Error("Serial number missing");
          const verificationUrl = buildVerificationUrl(updated.serialNo);
          const qrDataUrl = await generateQrDataUrl(verificationUrl);
          const studentName = reqData.proxyRequestee?.fullName || "Proxy Requestee";
          const requestFolder = getRequestFolder(reqData.predocs);
          if (!requestFolder) throw new Error("Could not determine request folder");
          await uploadApprovedQrImage(qrDataUrl, reqData.type, studentName, requestFolder);
          const docReq = {
            ...updated,
            userId: reqData.userId,
            studentSigDataUrl: null,
            adminSigDataUrl: null,
            approverName: user?.name || "",
            verificationUrl,
            qrDataUrl,
          };
          const { generateApprovedPDF } = await import("../../config/documentTemplates");
          const pdfBlob = await generateApprovedPDF(docReq);
          const t = reqData.formData?.ndaType || "general";
          const approvedFileName = `NDA_${t}_Approved_${Date.now()}.pdf`;
          const uploaded = await uploadApprovedForm(
            pdfBlob,
            reqData.type,
            studentName,
            requestFolder,
            approvedFileName
          );
          await saveApprovedDocument(reqData._id, { ...uploaded, verificationUrl });
          notify("Approved! The document is ready for printing and physical signature.", { type: "success" });
        } else {
          const adminSigDataUrl = adminSigRef.current.getDataUrl();

          // Upload admin signature to Firebase
          const studentName = reqData.userId?.name || "Unknown Student";
          const requestFolder = getRequestFolder(reqData.predocs);

          const { url: adminSigFirebaseUrl, path: adminSigFirebasePath } = await uploadSignatureImage(
            adminSigDataUrl,
            "nda",
            studentName,
            requestFolder || "unknown",
            "admin_sig.png"
          );

          const updateRes = await updateRequestStatus(reqData._id, {
            status,
            remarks,
            adminSigUrl: adminSigFirebaseUrl,
            adminSigPath: adminSigFirebasePath,
          });
          const updated = updateRes.request;

          if (!updated?.serialNo) throw new Error("Serial number missing");

          const verificationUrl = buildVerificationUrl(updated.serialNo);
          const qrDataUrl = await generateQrDataUrl(verificationUrl);

          if (!requestFolder) throw new Error("Could not determine request folder");

          await uploadApprovedQrImage(qrDataUrl, reqData.type, studentName, requestFolder);

          // Fetch signature images via proxy to avoid CORS
          const sigImages = await getSignatureImages(reqData._id);

          const docReq = {
            ...updated,
            userId: reqData.userId,
            studentSigDataUrl: sigImages.studentSig,
            adminSigDataUrl: sigImages.adminSig || adminSigDataUrl,
            approverName: user?.name || "",
            verificationUrl,
            qrDataUrl,
          };
          const { generateApprovedPDF } = await import("../../config/documentTemplates");
          const pdfBlob = await generateApprovedPDF(docReq);
          const t = reqData.formData?.ndaType || "general";
          const approvedFileName = `NDA_${t}_Approved_${Date.now()}.pdf`;
          const uploaded = await uploadApprovedForm(
            pdfBlob,
            reqData.type,
            studentName,
            requestFolder,
            approvedFileName
          );

          await saveApprovedDocument(reqData._id, { ...uploaded, verificationUrl });

          notify("Approved and document generated!", { type: "success" });
        }
      } else {
        await updateRequestStatus(reqData._id, { status, remarks });
        notify(`Updated to ${status}`, { type: "success" });
      }
      await onRequestUpdated?.({ withToast: true });
    } catch (err) {
      notify(err.response?.data?.message || err.message || "Failed to update request", { type: "error" });
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <>
      <div className="review-section">
        <h4 className="review-section-title">Form Data</h4>
        {cfg?.fields?.length ? (
          cfg.fields.map((f) => (
            <div key={f.name} className="review-field">
              <span className="review-field-label">{f.label}</span>
              <div className="review-info-box">
                {String(reqData.formData?.[f.name] ?? "") || (
                  <span className="review-info-box--muted">—</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <pre style={{
            background: "var(--surface-2)",
            padding: "10px",
            borderRadius: "var(--radius-md)",
            fontSize: "12px",
            margin: 0,
          }}>
            {JSON.stringify(reqData.formData || {}, null, 2)}
          </pre>
        )}
      </div>

      <div className="review-section">
        <h4 className="review-section-title">Attachments</h4>
        {reqData.predocs?.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {reqData.predocs.map((f, idx) => (
              <a key={idx} href={f.url} target="_blank" rel="noreferrer" className="review-file-link">
                <Paperclip size={14} strokeWidth={1.8} aria-hidden="true" /> {f.requirementLabel || f.origName || `File ${idx + 1}`}
              </a>
            ))}
          </div>
        ) : (
          <div className="review-info-box">
            <span className="review-info-box--muted">No files.</span>
          </div>
        )}
      </div>

      {canProgress && (isSubmitted || isAdminReviewal) && (
        <div className="review-section">
          <h4 className="review-section-title">Remarks</h4>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={4}
            className="review-textarea"
            placeholder="Optional remarks..."
          />
        </div>
      )}

      {isRevision && (
        <div className="review-section">
          <h4 className="review-section-title">Remarks</h4>
          <div className="review-info-box">
            {reqData.remarks || <span className="review-info-box--muted">No remarks provided.</span>}
          </div>
        </div>
      )}

      {isApproved && (
        <div className="review-section">
          <h4 className="review-section-title">Approved Request Form</h4>
          {reqData.postdocs?.url ? (
            <a href={reqData.postdocs.url} target="_blank" rel="noreferrer" className="review-file-link">
              <Paperclip size={14} strokeWidth={1.8} aria-hidden="true" /> Approved NDA Document
            </a>
          ) : (
            <div className="review-info-box">
              <span className="review-info-box--muted">No approved document uploaded.</span>
            </div>
          )}
        </div>
      )}

      {/* Student E-Signature */}
      {reqData.studentSigUrl && (
        <div className="review-section">
          <h4 className="review-section-title">Student E-Signature</h4>
          <div className="review-sig-wrap">
            <img src={reqData.studentSigUrl} alt="Student signature" className="review-sig-img" width="560" height="180" loading="lazy" decoding="async" />
            <span className="review-sig-name">{reqData.userId?.name}</span>
          </div>
        </div>
      )}

      {canProgress && isAdminReviewal && !isProxy && (
        <div className="review-section">
          <h4 className="review-section-title">Your E-Signature (Admin) *</h4>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 8px 0" }}>
            Draw your signature below to sign off on the NDA approval.
          </p>
          <SignaturePad ref={adminSigRef} height={150} />
          <button
            type="button"
            className="review-btn-clear"
            onClick={() => adminSigRef.current?.clear()}
          >
            Clear Signature
          </button>
        </div>
      )}

      {canProgress && isAdminReviewal && isProxy && (
        <div className="info-banner info-banner--info">
          <strong>F2F Walk-in (Proxy)</strong>
          <p>This is a face-to-face proxy request. Digital signatures are bypassed. The document will be printed for a physical wet signature.</p>
        </div>
      )}

      {canProgress && isSubmitted && (
        <div className="review-actions">
          <button
            onClick={() => handleUpdate("nda_admin_reviewal")}
            disabled={!!activeAction}
            className="review-btn-primary"
          >
            {activeAction === "forward" ? "Updating..." : "Forward to Admin Reviewal"}
          </button>
        </div>
      )}

      {canProgress && isAdminReviewal && (
        <div className="review-actions">
          <button
            onClick={() => handleUpdate("nda_approved")}
            disabled={!!activeAction}
            className="review-btn-primary"
          >
            {activeAction === "approve" ? "Generating..." : "Approve"}
          </button>
          <button
            onClick={() => handleUpdate("nda_revision_requested")}
            disabled={!!activeAction}
            className="review-btn-secondary"
          >
            {activeAction === "revision" ? "Submitting..." : "Request Revision"}
          </button>
        </div>
      )}

      {!canProgress && (
        <div className="info-banner info-banner--info">
          <strong>Read-only access</strong>
          <p>Staff can view request details but only Admin can move, approve, or sign this request.</p>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Agreement review panel (multi-phase)
// ─────────────────────────────────────────────────────────────────────────────
function AgreementReviewPanel({ reqData, canProgress, onRequestUpdated }) {
  const { user } = useContext(AuthContext);
  const [remarks, setRemarks] = useState(reqData.remarks || "");
  const [signingLink, setSigningLink] = useState(() => {
    // Reconstruct signing link from persisted token (always show once generated)
    if (reqData.signingToken) {
      return `${window.location.origin}/sign/${reqData.signingToken}`;
    }
    return "";
  });
  const [signingLinkExpiry, setSigningLinkExpiry] = useState(() => reqData.signingTokenExpiresAt || null);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [phase1Revising, setPhase1Revising] = useState(false);
  const [approving, setApproving] = useState(false);
  const [phase3Revising, setPhase3Revising] = useState(false);
  const adminSigRef = useRef(null);

  const { status } = reqData;
  const cfg = FIELDS_FILE_SLOTS_CONFIG.agreement;

  const handlePhase1Approve = async () => {
    setGenerating(true);
    try {
      const res = await generateSigningLink(reqData._id);
      const link = `${window.location.origin}/sign/${res.signingToken}`;
      setSigningLink(link);
      setSigningLinkExpiry(res.signingTokenExpiresAt || null);
      await onRequestUpdated?.();
      notify("Signing link generated! Copy it and send to the representative manually.", { type: "success" });
    } catch (err) {
      notify(err.response?.data?.message || err.message || "Failed to generate signing link", { type: "error" });
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateLink = async () => {
    const confirmed = await confirmInPage({
      title: "Regenerate Signing Link",
      message: "Regenerate the signing link? The old link will be invalidated.",
      confirmText: "Regenerate",
      cancelText: "Cancel",
      tone: "warning",
    });
    if (!confirmed) return;
    setRegenerating(true);
    try {
      const res = await generateSigningLink(reqData._id);
      const link = `${window.location.origin}/sign/${res.signingToken}`;
      setSigningLink(link);
      setSigningLinkExpiry(res.signingTokenExpiresAt || null);
      await onRequestUpdated?.();
      notify("New signing link generated! Copy it and send to the representative.", { type: "success" });
    } catch (err) {
      notify(err.response?.data?.message || err.message || "Failed to regenerate signing link", { type: "error" });
    } finally {
      setRegenerating(false);
    }
  };

  const handlePhase3Approve = async () => {
    if (!adminSigRef.current || adminSigRef.current.isEmpty()) {
      notify("Please draw your e-signature before approving.", { type: "warning" });
      return;
    }
    setApproving(true);
    try {
      const actionRes = await adminPhase3Action(reqData._id, { action: "approve" });
      const updated = actionRes.request;

      if (!updated?.serialNo) throw new Error("Serial number missing");

      const verificationUrl = buildVerificationUrl(updated.serialNo);
      const qrDataUrl = await generateQrDataUrl(verificationUrl);
      const adminSigDataUrl = adminSigRef.current.getDataUrl();
      const studentName = reqData.userId?.name || "Unknown Student";
      const requestFolder = getRequestFolder(reqData.predocs);
      if (!requestFolder) throw new Error("Could not determine request folder");

      await uploadApprovedQrImage(qrDataUrl, "agreement", studentName, requestFolder);

      const { authorizerSig, repSig } = await getSignatureImages(reqData._id);

      const docReq = {
        ...updated,
        userId: reqData.userId,
        repInfo: reqData.repInfo,
        authorizerSigUrl: authorizerSig,
        repSigUrl: repSig,
        adminSigDataUrl,
        approverName: user?.name || "",
        verificationUrl,
        qrDataUrl,
      };

      const { generateApprovedPDF } = await import("../../config/documentTemplates");
      const pdfBlob = await generateApprovedPDF(docReq);
      const approvedFileName = `Agreement_Approved_${Date.now()}.pdf`;
      const uploaded = await uploadApprovedForm(
        pdfBlob,
        "agreement",
        studentName,
        requestFolder,
        approvedFileName
      );

      await saveApprovedDocument(reqData._id, { ...uploaded, verificationUrl });

      await deleteStorageFile(reqData.authorizerSigPath);
      await deleteStorageFile(reqData.repSigPath);

      notify("Agreement fully approved and document generated!", { type: "success" });
      await onRequestUpdated?.({ withToast: true });
      setApproving(false);
    } catch (err) {
      notify(err.response?.data?.message || err.message || "Failed to approve", { type: "error" });
    } finally {
      setApproving(false);
    }
  };

  const handlePhase3RepRevision = async () => {
    if (!remarks.trim()) {
      notify("Please enter remarks explaining what the representative needs to revise.", { type: "warning" });
      return;
    }
    setPhase3Revising(true);
    try {
      const res = await adminPhase3Action(reqData._id, { action: "rep_revision_requested", remarks });
      const newLink = `${window.location.origin}/sign/${res.request.signingToken}`;
      setSigningLink(newLink);
      await onRequestUpdated?.({ withToast: true });
      notify("Representative revision requested. A new signing link has been generated. Copy it and send to the representative.", { type: "success" });
    } catch (err) {
      notify(err.response?.data?.message || "Failed", { type: "error" });
    } finally {
      setPhase3Revising(false);
    }
  };

  return (
    <>
      {/* Form data */}
      <div className="review-section">
        <h4 className="review-section-title">Form Data</h4>
        {cfg.fields.map((f) => (
          <div key={f.name} className="review-field">
            <span className="review-field-label">{f.label}</span>
            <div className="review-info-box">
              {String(reqData.formData?.[f.name] ?? "") || (
                <span className="review-info-box--muted">—</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Student attachments */}
      <div className="review-section">
        <h4 className="review-section-title">Student Attachments</h4>
        {reqData.predocs?.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {reqData.predocs.map((f, idx) => (
              <a key={idx} href={f.url} target="_blank" rel="noreferrer" className="review-file-link">
                <Paperclip size={14} strokeWidth={1.8} aria-hidden="true" /> {f.requirementLabel || f.origName || `File ${idx + 1}`}
              </a>
            ))}
          </div>
        ) : (
          <div className="review-info-box">
            <span className="review-info-box--muted">No files.</span>
          </div>
        )}
      </div>

      {/* Authorizer signature */}
      {reqData.authorizerSigUrl && (
        <div className="review-section">
          <h4 className="review-section-title">Authorizer E-Signature</h4>
          <div className="review-sig-wrap">
            <img src={reqData.authorizerSigUrl} alt="Authorizer signature" className="review-sig-img" width="560" height="180" loading="lazy" decoding="async" />
            <span className="review-sig-name">{reqData.userId?.name}</span>
          </div>
        </div>
      )}

      {/* Representative info (phase3+) */}
      {reqData.repInfo?.name && (
        <div className="review-section">
          <h4 className="review-section-title">Representative Information</h4>
          <div className="review-field">
            <span className="review-field-label">Name</span>
            <div className="review-info-box">{reqData.repInfo.name}</div>
          </div>
        </div>
      )}

      {reqData.repInfo?.govIdDoc?.url && (
        <div className="review-section">
          <h4 className="review-section-title">Representative Attachments</h4>
          <a
            href={reqData.repInfo.govIdDoc.url}
            target="_blank"
            rel="noreferrer"
            className="review-file-link"
          >
            <Paperclip size={14} strokeWidth={1.8} aria-hidden="true" /> Government-Issued ID
          </a>
        </div>
      )}

      {/* Representative signature (phase3+) */}
      {reqData.repSigUrl && (
        <div className="review-section">
          <h4 className="review-section-title">Representative E-Signature</h4>
          <div className="review-sig-wrap">
            <img src={reqData.repSigUrl} alt="Representative signature" className="review-sig-img" width="560" height="180" loading="lazy" decoding="async" />
            <span className="review-sig-name">
              {reqData.repInfo?.name || [reqData.formData?.repFirstName, reqData.formData?.repMiddleInitial, reqData.formData?.repLastName].filter(Boolean).join(" ") || reqData.formData?.repName}
            </span>
          </div>
        </div>
      )}

      {/* Remarks display */}
      {(status === "nda_revision_requested" || status === "agreement_rep_revision_requested" || status === "revision_requested" || status === "agr_rep_revision_requested") &&
        reqData.remarks && (
          <div className="review-section">
            <h4 className="review-section-title">Remarks</h4>
            <div className="review-info-box">{reqData.remarks}</div>
          </div>
        )}

      {/* Final approved document */}
      {status === "agreement_approved" && (
        <div className="review-section">
          <h4 className="review-section-title">Approved Agreement</h4>
          {reqData.postdocs?.url ? (
            <a href={reqData.postdocs.url} target="_blank" rel="noreferrer" className="review-file-link">
              <Paperclip size={14} strokeWidth={1.8} aria-hidden="true" /> Approved Agreement Document
            </a>
          ) : (
            <div className="review-info-box">
              <span className="review-info-box--muted">No document uploaded yet.</span>
            </div>
          )}
        </div>
      )}

      {/* Rep rejected */}
      {status === "agreement_rep_declined" && (
        <div className="info-banner info-banner--danger">
          <strong>Representative Declined</strong>
          <p>The representative declined to sign. This request lifecycle has ended.</p>
        </div>
      )}

      {/* Generated signing link (always visible once generated) */}
      {signingLink && (
        <div className="signing-link-box">
          <p className="signing-link-title">Representative Signing Link</p>
          <p className="signing-link-desc">
            Copy and send this link to the representative:
          </p>
          <div className="signing-link-row">
            <code className="signing-link-code">{signingLink}</code>
            <button
              className="signing-link-copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(signingLink);
                notify("Copied!", { type: "success" });
              }}
            >
              Copy
            </button>
          </div>
          {signingLinkExpiry && (
            <div style={{ marginTop: 6, fontSize: 12, color: new Date(signingLinkExpiry) < new Date() ? "#dc2626" : "var(--text-muted)" }}>
              {new Date(signingLinkExpiry) < new Date()
                ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><AlertTriangle size={14} strokeWidth={1.8} />This link has expired.</span>
                : `Expires: ${new Date(signingLinkExpiry).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}`}
            </div>
          )}
          {canProgress && (
            <button
              onClick={handleRegenerateLink}
              disabled={regenerating}
              className="review-btn-secondary"
              style={{ marginTop: 10 }}
            >
              {regenerating ? "Regenerating…" : <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><RefreshCw size={14} strokeWidth={1.8} />Regenerate Link</span>}
            </button>
          )}
        </div>
      )}

      {/* ── Phase 1 actions ── */}
      {canProgress && status === "agreement_submitted" && (
        <div className="review-actions">
          <button
            onClick={async () => {
              try {
                await updateRequestStatus(reqData._id, { status: "agreement_initial_admin_reviewal" });
                notify("Request moved to Initial Admin Reviewal.", { type: "success" });
                await onRequestUpdated?.({ withToast: true });
              } catch (err) {
                notify(err.response?.data?.message || "Failed", { type: "error" });
              }
            }}
            className="review-btn-primary"
          >
            Forward to Initial Admin Reviewal
          </button>
        </div>
      )}

      {canProgress && status === "agreement_initial_admin_reviewal" && !signingLink && (
        <>
          <div className="review-section">
            <h4 className="review-section-title">Remarks</h4>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="review-textarea"
              placeholder=""
            />
          </div>
          <div className="review-actions">
            <button
              onClick={handlePhase1Approve}
              disabled={generating || phase1Revising}
              className="review-btn-primary"
            >
              {generating ? "Generating link..." : "Approve & Generate Signing Link"}
            </button>
          </div>
        </>
      )}

      {/* ── Phase 2: waiting on rep ── */}
      {status === "agreement_awaiting_rep_approval" && !signingLink && (
        <div className="info-banner info-banner--info">
          <strong>Waiting for Representative</strong>
          <p>
            The signing link has been generated. Share it with the representative.
            This page will update once they submit or decline.
          </p>
        </div>
      )}

      {/* ── Phase 3 actions ── */}
      {canProgress && status === "agreement_final_admin_reviewal" && (
        <>
          <div className="review-section">
            <h4 className="review-section-title">Your E-Signature (Admin) *</h4>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 8px 0" }}>
              Draw your signature below to sign off on the final approval.
            </p>
            <SignaturePad ref={adminSigRef} height={150} />
            <button
              type="button"
              className="review-btn-clear"
              onClick={() => adminSigRef.current?.clear()}
            >
              Clear Signature
            </button>
          </div>

          <div className="review-section">
            <h4 className="review-section-title">Remarks</h4>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="review-textarea"
              placeholder=""
            />
          </div>

          <div className="review-actions">
            <button
              onClick={handlePhase3Approve}
              disabled={approving || phase3Revising}
              className="review-btn-primary"
            >
              {approving ? "Generating final document..." : "Final Approve & Sign"}
            </button>
            <button
              onClick={handlePhase3RepRevision}
              disabled={approving || phase3Revising}
              className="review-btn-secondary"
            >
              {phase3Revising ? "Submitting..." : "Request Representative Revision"}
            </button>
          </div>
        </>
      )}

      {/* ── Rep revision requested ── */}
      {status === "agreement_rep_revision_requested" && !signingLink && (
        <div className="info-banner info-banner--warning">
          <strong>Representative Revision Pending</strong>
          <p>
            A new signing link has been generated. Send it to the representative so they can
            resubmit.
          </p>
        </div>
      )}

      {!canProgress && (
        <div className="info-banner info-banner--info">
          <strong>Read-only access</strong>
          <p>Staff can view request details but only Admin can move, approve, or sign this request.</p>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminRequestReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [reqData, setReqData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");

  const loadRequest = async ({ withToast = false } = {}) => {
    if (withToast) setRefreshing(true);
    try {
      const r = await getRequestById(id);
      setReqData(r);
      if (withToast) {
        setNotice("Data updated");
        setTimeout(() => setNotice(""), 1800);
      }
    } catch (err) {
      notify(err.response?.data?.message || "Failed to load request", { type: "error" });
      navigate("/admin/requests");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate]);

  if (!reqData) return null;

  const isAgreement = reqData.type === "agreement";
  const canProgress = user?.role === "admin";

  const requestTitle =
    reqData.type === "agreement"
      ? "Agreement Request"
      : `NDA Request${reqData.formData?.ndaTypeLabel ? ` — ${reqData.formData.ndaTypeLabel}` : ""}`;

  return (
    <div className="review-page">
      <div className="review-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <button
            className="review-back-btn"
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate("/admin");
            }}
          >
            ← Back
          </button>

          <button
            className="dashboard-action"
            type="button"
            onClick={() => loadRequest({ withToast: true })}
            disabled={refreshing}
            style={{ padding: "8px 12px" }}
          >
            <RefreshCw size={14} className={refreshing ? "spin-anim" : ""} />
            Refresh
          </button>
        </div>

        {notice ? (
          <div className="info-banner info-banner--success">
            <strong>{notice}</strong>
          </div>
        ) : null}

        <div className="review-header">
          <h2 className="review-title">Review {requestTitle}</h2>
          <div className="review-meta">
            <span className="review-meta-row">
              <b>Status:</b> {prettyStatus(reqData.status)}
            </span>
            <span className="review-meta-row">
              <b>Date:</b> {new Date(reqData.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </span>
          </div>
        </div>

        <div className="review-section">
          <RequestStepper status={reqData.status} type={reqData.type} />
        </div>

        <div className="review-section">
          <h4 className="review-section-title">Student</h4>
          <div className="review-info-box">
            <div style={{ fontWeight: 600 }}>
              {reqData.proxyRequestee?.isProxy ? (reqData.proxyRequestee?.fullName || "Proxy Requestee") : (reqData.userId?.name || "Unknown")}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
              {reqData.proxyRequestee?.isProxy ? (reqData.proxyRequestee?.email || "") : (reqData.userId?.email || "")}
            </div>
            {reqData.proxyRequestee?.isProxy ? (
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                Submitted by staff: {reqData.userId?.name || "Unknown"}
              </div>
            ) : null}
            {reqData.proxyRequestee?.isProxy && reqData.proxyRequestee?.idNumber ? (
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                ID: {reqData.proxyRequestee.idNumber}
              </div>
            ) : null}
            {reqData.proxyRequestee?.isProxy && reqData.proxyRequestee?.departmentOrOrganization ? (
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                Department/Org: {reqData.proxyRequestee.departmentOrOrganization}
              </div>
            ) : null}
          </div>
        </div>

        {isAgreement ? (
          <AgreementReviewPanel reqData={reqData} canProgress={canProgress} onRequestUpdated={loadRequest} />
        ) : (
          <NdaReviewPanel reqData={reqData} canProgress={canProgress} onRequestUpdated={loadRequest} />
        )}
      </div>
    </div>
  );
}
