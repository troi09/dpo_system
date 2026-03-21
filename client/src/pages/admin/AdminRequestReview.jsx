import { useEffect, useRef, useState, useMemo, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Copy, Paperclip, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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
import "../../components/RequestForm.css";

const statusPillClass = (s) => {
  if (["nda_approved", "agr_approved"].includes(s)) return "status-pill status-pill--green";
  if (["nda_pending", "agr_pending_1", "agr_pending_2"].includes(s)) return "status-pill status-pill--yellow";
  if (s === "stud_revision_requested") return "status-pill status-pill--orange";
  if (s === "agr_rep_revision_requested") return "status-pill status-pill--violet";
  if (s === "agr_awaiting_rep_signature") return "status-pill status-pill--blue";
  if (s === "agr_declined") return "status-pill status-pill--red";
  return "status-pill";
};

const prettyStatus = (s) => {
  const map = {
    nda_pending:                "Reviewal",
    nda_approved:               "Approved",
    stud_revision_requested:    "Student Revisions",
    agr_pending_1:              "Initial Reviewal",
    agr_awaiting_rep_signature: "Recipient Reviewal",
    agr_pending_2:              "Final Reviewal",
    agr_approved:               "Approved",
    agr_declined:               "Recipient Declined",
    agr_rep_revision_requested: "Recipient Revisions",
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

  const isPending = reqData?.status === "nda_pending";
  const isRevision = reqData?.status === "stud_revision_requested";
  const isApproved = reqData?.status === "nda_approved";
  const [confirmAction, setConfirmAction] = useState(null); // "approve" | "revision" | null


  const isProxy = reqData?.proxyRequestee?.isProxy;

  const handleUpdate = async (status) => {
    if (status === "nda_approved") {
      if (!isProxy && (!adminSigRef.current || adminSigRef.current.isEmpty())) {
        notify("Please draw your e-signature before approving.", { type: "warning" });
        return;
      }
    }
    if (status === "stud_revision_requested") {
      if (!remarks.trim()) {
        notify("Please enter remarks before requesting a revision.", { type: "warning" });
        return;
      }
    }
    setConfirmAction(null);
    setActiveAction(status === "nda_approved" ? "approve" : "revision");
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
          const studentName = reqData.proxyRequestee?.fullName || "Proxy Requestor";
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
          notify("Approved! The document is ready for printing and physical signature.", { type: "success", title: "Approved" });
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

          notify("Approved and document generated!", { type: "success", title: "Approved" });
        }
      } else {
        await updateRequestStatus(reqData._id, { status, remarks });
        notify("Student revision requested.", { type: "success", title: "Revision Requested" });
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

      {canProgress && isPending && !isProxy && (
        <div className="review-section">
          <h4 className="review-section-title">Your E-Signature (Admin) *</h4>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 8px 0" }}>
            Draw your signature below to sign off on the NDA approval.
          </p>
          <SignaturePad ref={adminSigRef} height={160} />
        </div>
      )}

      {canProgress && isPending && isProxy && (
        <div className="info-banner info-banner--info">
          <strong>F2F Walk-in (Proxy)</strong>
          <p>This is a face-to-face proxy request. Digital signatures are bypassed. The document will be printed for a physical wet signature.</p>
        </div>
      )}

      {canProgress && isPending && (
        <div className="review-section">
          <h4 className="review-section-title">Remarks</h4>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={4}
            className="review-textarea"
          />
        </div>
      )}

      {canProgress && isPending && (
        <div className="review-actions">
          <button
            onClick={() => {
              if (!isProxy && (!adminSigRef.current || adminSigRef.current.isEmpty())) {
                notify("Please draw your e-signature before approving.", { type: "warning" });
                return;
              }
              setConfirmAction("approve");
            }}
            disabled={!!activeAction}
            className="review-btn-primary"
          >
            {activeAction === "approve" ? "Generating..." : "Approve"}
          </button>
          <button
            onClick={() => {
              if (!remarks.trim()) {
                notify("Please enter remarks before requesting a revision.", { type: "warning" });
                return;
              }
              setConfirmAction("revision");
            }}
            disabled={!!activeAction}
            className="review-btn-secondary"
          >
            {activeAction === "revision" ? "Submitting..." : "Request Student Revision"}
          </button>
        </div>
      )}

      <AnimatePresence>
        {confirmAction && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
              <h3 className="modal-title">
                {confirmAction === "approve" ? "Approve NDA Request" : "Request Student Revision"}
              </h3>
              <p className="modal-text">
                {confirmAction === "approve"
                  ? "This will finalize and generate the approved NDA document."
                  : "The student will be notified to revise and resubmit their request."}
              </p>
              <div className="modal-actions">
                <button className="ui-btn ui-btn--secondary" onClick={() => setConfirmAction(null)} disabled={!!activeAction}>Cancel</button>
                <button className="ui-btn ui-btn--primary" onClick={() => handleUpdate(confirmAction === "approve" ? "nda_approved" : "stud_revision_requested")} disabled={!!activeAction}>
                  {confirmAction === "approve" ? "Approve" : "Confirm"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
  const [confirmAction, setConfirmAction] = useState(null); // "phase1_approve" | "phase1_revision" | "phase3_approve" | "phase3_revision" | null
  const adminSigRef = useRef(null);

  const { status } = reqData;
  const cfg = FIELDS_FILE_SLOTS_CONFIG.agreement;
  const _fd = reqData.formData || {};
  const _mid = String(_fd.repMiddleInitial || "").trim();
  const _midInitial = _mid ? `${_mid[0].toUpperCase()}.` : "";
  const requestedRepName = [_fd.repFirstName, _midInitial, _fd.repLastName].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() || "—";

  const handlePhase1Approve = async () => {
    setConfirmAction(null);
    setGenerating(true);
    try {
      const res = await generateSigningLink(reqData._id);
      const link = `${window.location.origin}/sign/${res.signingToken}`;
      setSigningLink(link);
      setSigningLinkExpiry(res.signingTokenExpiresAt || null);
      await onRequestUpdated?.();
      notify("Approved. Signing link sent to the representative's email.", { type: "success", title: "Approved" });
    } catch (err) {
      notify(err.response?.data?.message || err.message || "Failed to generate signing link", { type: "error" });
    } finally {
      setGenerating(false);
    }
  };

  const handlePhase1Revision = async () => {
    setConfirmAction(null);
    setPhase1Revising(true);
    try {
      await updateRequestStatus(reqData._id, { status: "stud_revision_requested", remarks });
      notify("Student revision requested.", { type: "success", title: "Revision Requested" });
      await onRequestUpdated?.({ withToast: true });
    } catch (err) {
      notify(err.response?.data?.message || "Failed", { type: "error" });
    } finally {
      setPhase1Revising(false);
    }
  };

  const handleResendLink = async () => {
    const confirmed = await confirmInPage({
      title: "Resend Signing Link",
      message: "This will generate a new signing link and send it to the representative's email. The old link will be invalidated.",
      confirmText: "Resend",
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
      notify("New signing link sent to the representative's email.", { type: "success" });
    } catch (err) {
      notify(err.response?.data?.message || err.message || "Failed to resend signing link", { type: "error" });
    } finally {
      setRegenerating(false);
    }
  };

  const handlePhase3Approve = async () => {
    setConfirmAction(null);
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

      notify("Agreement fully approved and document generated!", { type: "success", title: "Approved" });
      await onRequestUpdated?.({ withToast: true });
      setApproving(false);
    } catch (err) {
      notify(err.response?.data?.message || err.message || "Failed to approve", { type: "error" });
    } finally {
      setApproving(false);
    }
  };

  const handlePhase3RepRevision = async () => {
    setConfirmAction(null);
    setPhase3Revising(true);
    try {
      const res = await adminPhase3Action(reqData._id, { action: "rep_revision_requested", remarks });
      const newLink = `${window.location.origin}/sign/${res.signingToken || res.request.signingToken}`;
      setSigningLink(newLink);
      setSigningLinkExpiry(res.signingTokenExpiresAt || null);
      await onRequestUpdated?.({ withToast: true });
      notify("Recipient revision requested. A new signing link has been sent to the representative's email.", { type: "success", title: "Revision Requested" });
    } catch (err) {
      notify(err.response?.data?.message || "Failed", { type: "error" });
    } finally {
      setPhase3Revising(false);
    }
  };

  return (
    <>
      {/* Requestor Attachments */}
      <div className="review-section">
        <h4 className="review-section-title">Requestor Attachments</h4>
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

      {/* Representative */}
      <div className="review-section">
        <h4 className="review-section-title">Representative</h4>
        <div className="review-field">
          <span className="review-field-label">Full Name</span>
          <div className="review-info-box">
            {reqData.repInfo?.name || (requestedRepName !== "—" ? requestedRepName : <span className="review-info-box--muted">—</span>)}
          </div>
        </div>
        {cfg.fields
          .filter((f) => !["repFirstName", "repMiddleInitial", "repLastName"].includes(f.name))
          .map((f) => (
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

      {/* Representative Attachments (after rep signs) */}
      {reqData.repInfo?.govIdDoc?.url && (
        <div className="review-section">
          <h4 className="review-section-title">Representative Attachments</h4>
          <a href={reqData.repInfo.govIdDoc.url} target="_blank" rel="noreferrer" className="review-file-link">
            <Paperclip size={14} strokeWidth={1.8} aria-hidden="true" /> Government-Issued ID
          </a>
        </div>
      )}

      {/* Authorization Letter */}
      {status !== "agr_approved" && (
      <div className="review-section">
        <div style={{ padding: "20px 24px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
          {/* Requestee date — left */}
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 18 }}>
            {reqData.createdAt ? new Date(reqData.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}
          </div>
          {/* Authorization paragraph — centered */}
          <p style={{ textAlign: "center", fontSize: 13.5, color: "var(--text-primary)", lineHeight: 1.75, margin: "0 0 24px" }}>
            I, <strong>{reqData.userId?.name || "—"}</strong>, hereby authorize{" "}
            <strong>{requestedRepName}</strong> to act as my representative and sign on my behalf
            in connection with this agreement, as governed by the Data Protection Office.
          </p>
          {/* Requestee signature block — centered */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            {reqData.authorizerSigUrl && (
              <img src={reqData.authorizerSigUrl} alt="Authorizer signature" style={{ maxHeight: 72, display: "block" }} loading="lazy" decoding="async" />
            )}
            <div style={{ width: 220, borderTop: "1px solid var(--border-strong)", textAlign: "center", paddingTop: 6, fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>
              {reqData.userId?.name || "—"}
            </div>
          </div>

          {/* Representative agreement section — hidden during rep revision, shown once rep re-submits */}
          {reqData.repSigUrl && status !== "agr_rep_revision_requested" && (
            <>
              <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "24px 0" }} />
              {/* Rep agreement date — left */}
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 18 }}>
                {reqData.updatedAt ? new Date(reqData.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}
              </div>
              {/* Rep agreement paragraph — centered */}
              <p style={{ textAlign: "center", fontSize: 13.5, color: "var(--text-primary)", lineHeight: 1.75, margin: "0 0 24px" }}>
                I, <strong>{reqData.repInfo?.name || "—"}</strong>, hereby confirm my agreement to act as the authorized representative
                of <strong>{reqData.userId?.name || "—"}</strong> and sign on their behalf,
                as governed by the Data Protection Office.
              </p>
              {/* Representative signature block — centered */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <img src={reqData.repSigUrl} alt="Representative signature" style={{ maxHeight: 72, display: "block" }} loading="lazy" decoding="async" />
                <div style={{ width: 220, borderTop: "1px solid var(--border-strong)", textAlign: "center", paddingTop: 6, fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>
                  {reqData.repInfo?.name || "—"}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      )}

      {/* Remarks display */}
      {(status === "stud_revision_requested" || status === "agr_rep_revision_requested") &&
        reqData.remarks && (
          <div className="review-section">
            <h4 className="review-section-title">
              {status === "agr_rep_revision_requested" ? "Remarks For Representative" : "Remarks"}
            </h4>
            <div className="review-info-box">{reqData.remarks}</div>
          </div>
        )}

      {/* Final approved document */}
      {status === "agr_approved" && (
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
      {status === "agr_declined" && (
        <div className="info-banner info-banner--danger">
          <strong>Recipient Declined</strong>
          <p>The recipient declined to sign. This request lifecycle has ended.</p>
        </div>
      )}

      {/* Generated signing link (visible only while awaiting rep action) */}
      {signingLink && (status === "agr_awaiting_rep_signature" || status === "agr_rep_revision_requested") && (
        <div className="signing-link-box">
          <p className="signing-link-title">Representative Signing Link</p>
          <div className="signing-link-row">
            <span className="signing-link-code">Representative signing link ready — click to copy</span>
            <button
              className="signing-link-copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(signingLink);
              }}
              title="Copy link"
            >
              <Copy size={14} strokeWidth={2} />
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
              onClick={handleResendLink}
              disabled={regenerating || !signingLinkExpiry || new Date(signingLinkExpiry) >= new Date()}
              className="review-btn-secondary"
              style={{ marginTop: 10, opacity: (!signingLinkExpiry || new Date(signingLinkExpiry) >= new Date()) ? 0.5 : 1 }}
              title={(!signingLinkExpiry || new Date(signingLinkExpiry) >= new Date()) ? "Link is still active — not yet expired" : "Resend a new signing link to representative"}
            >
              {regenerating ? "Sending…" : <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><RefreshCw size={14} strokeWidth={1.8} />Resend Link</span>}
            </button>
          )}
        </div>
      )}

      {/* ── Phase 1 actions ── */}
      {canProgress && status === "agr_pending_1" && !signingLink && (
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
              onClick={() => setConfirmAction("phase1_approve")}
              disabled={generating || phase1Revising}
              className="review-btn-primary"
            >
              {generating ? "Generating link..." : "Approve & Generate Signing Link"}
            </button>
            <button
              onClick={() => {
                if (!remarks.trim()) {
                  notify("Please enter remarks before requesting a revision.", { type: "warning" });
                  return;
                }
                setConfirmAction("phase1_revision");
              }}
              disabled={generating || phase1Revising}
              className="review-btn-secondary"
            >
              {phase1Revising ? "Submitting..." : "Request Student Revision"}
            </button>
          </div>
        </>
      )}

      {/* ── Phase 2: waiting on rep ── */}
      {status === "agr_awaiting_rep_signature" && !signingLink && (
        <div className="info-banner info-banner--info">
          <strong>Waiting for Representative</strong>
          <p>
            The signing link has been generated. Share it with the representative.
            This page will update once they submit or decline.
          </p>
        </div>
      )}

      {/* ── Phase 3 actions ── */}
      {canProgress && status === "agr_pending_2" && (
        <>
          <div className="review-section">
            <h4 className="review-section-title">Your E-Signature (Admin) *</h4>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 8px 0" }}>
              Draw your signature below to sign off on the final approval.
            </p>
            <SignaturePad ref={adminSigRef} height={160} />
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
              onClick={() => {
                if (!adminSigRef.current || adminSigRef.current.isEmpty()) {
                  notify("Please draw your e-signature before approving.", { type: "warning" });
                  return;
                }
                setConfirmAction("phase3_approve");
              }}
              disabled={approving || phase3Revising}
              className="review-btn-primary"
            >
              {approving ? "Generating final document..." : "Final Approve & Sign"}
            </button>
            <button
              onClick={() => {
                if (!remarks.trim()) {
                  notify("Please enter remarks explaining what the representative needs to revise.", { type: "warning" });
                  return;
                }
                setConfirmAction("phase3_revision");
              }}
              disabled={approving || phase3Revising}
              className="review-btn-secondary"
            >
              {phase3Revising ? "Submitting..." : "Request Representative Revision"}
            </button>
          </div>
        </>
      )}

      {/* ── Rep revision requested ── */}
      {status === "agr_rep_revision_requested" && !signingLink && (
        <div className="info-banner info-banner--warning">
          <strong>Recipient Revision Pending</strong>
          <p>
            A new signing link has been sent to the representative's email so they can resubmit.
          </p>
        </div>
      )}

      <AnimatePresence>
        {confirmAction && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
              <h3 className="modal-title">
                {confirmAction === "phase1_approve" && "Approve & Send for Signing"}
                {confirmAction === "phase1_revision" && "Request Student Revision"}
                {confirmAction === "phase3_approve" && "Final Approve Agreement"}
                {confirmAction === "phase3_revision" && "Request Recipient Revision"}
              </h3>
              <p className="modal-text">
                {confirmAction === "phase1_approve" && "This will approve the request and generate a signing link for the representative."}
                {confirmAction === "phase1_revision" && "The student will be notified to revise and resubmit their request."}
                {confirmAction === "phase3_approve" && "This will finalize the agreement and generate the approved document."}
                {confirmAction === "phase3_revision" && "A new signing link will be generated for the representative to resubmit."}
              </p>
              <div className="modal-actions">
                <button
                  className="ui-btn ui-btn--secondary"
                  onClick={() => setConfirmAction(null)}
                  disabled={generating || phase1Revising || approving || phase3Revising}
                >
                  Cancel
                </button>
                <button
                  className="ui-btn ui-btn--primary"
                  onClick={() => {
                    if (confirmAction === "phase1_approve") handlePhase1Approve();
                    else if (confirmAction === "phase1_revision") handlePhase1Revision();
                    else if (confirmAction === "phase3_approve") handlePhase3Approve();
                    else if (confirmAction === "phase3_revision") handlePhase3RepRevision();
                  }}
                  disabled={generating || phase1Revising || approving || phase3Revising}
                >
                  {(confirmAction === "phase1_approve" || confirmAction === "phase3_approve") ? "Approve" : "Confirm"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
  const loadRequest = async () => {
    try {
      const r = await getRequestById(id);
      setReqData(r);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to load request", { type: "error" });
      navigate("/admin/requests");
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
        <div className="request-form-header">
          <button
            className="request-form-back"
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate("/admin");
            }}
          >
            ‹ Back
          </button>
          <h2 className="request-form-title">{requestTitle}</h2>
          <div />
        </div>

        <div className="review-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", width: "100%" }}>
            <span className={statusPillClass(reqData.status)}>{prettyStatus(reqData.status)}</span>
            <span className="review-meta-row" style={{ marginLeft: "auto" }}>
              <b>Request Date:</b> {new Date(reqData.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </span>
          </div>
        </div>

        <div className="review-section">
          <RequestStepper status={reqData.status} type={reqData.type} />
        </div>

        <div className="review-section">
          <h4 className="review-section-title">Requestor</h4>
          <div className="review-info-box">
            <div style={{ fontWeight: 600 }}>
              {reqData.proxyRequestee?.isProxy ? (reqData.proxyRequestee?.fullName || "Proxy Requestor") : (reqData.userId?.name || "Unknown")}
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
