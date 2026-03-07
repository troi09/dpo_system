import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FIELDS_FILE_SLOTS_CONFIG } from "../../config/fieldsFileSlotsConfig";
import {
  getRequestById,
  updateRequestStatus,
  saveApprovedDocument,
  generateSigningLink,
  adminPhase3Action,
  getSignatureImages,
} from "../../services/requestService";
import { generateApprovedPDF } from "../../config/documentTemplates";
import {
  uploadApprovedForm,
  uploadApprovedQrImage,
  deleteStorageFile,
} from "../../services/firebaseStorageService";
import { buildVerificationUrl, generateQrDataUrl } from "../../services/qrService";
import SignaturePad from "../../components/SignaturePad";

const prettyStatus = (s) => {
  const map = {
    // Legacy backward compat
    pending: "Pending",
    approved: "Approved",
    // Current statuses
    submitted: "Submitted",
    completed: "Completed",
    revision_requested: "Revision Requested",
    awaiting_signature: "Awaiting Representative Signature",
    pending_approval: "Pending Final Admin Review",
    declined: "Declined by Representative",
    rep_revision_requested: "Representative Revision Requested",
  };
  return map[s] || s;
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
// NDA review panel (flow: submitted → completed | revision_requested)
// ─────────────────────────────────────────────────────────────────────────────
function NdaReviewPanel({ reqData }) {
  const navigate = useNavigate();
  const [remarks, setRemarks] = useState(reqData.remarks || "");
  const [updating, setUpdating] = useState(false);
  const adminSigRef = useRef(null);

  const isPending = reqData.status === "submitted";
  const isRevision = reqData.status === "revision_requested";
  const isApproved = reqData.status === "completed";

  const handleUpdate = async (status) => {
    setUpdating(true);
    try {
      if (status === "completed") {
        if (!adminSigRef.current || adminSigRef.current.isEmpty()) {
          alert("Please draw your e-signature before approving.");
          setUpdating(false);
          return;
        }

        const updateRes = await updateRequestStatus(reqData._id, { status, remarks });
        const updated = updateRes.request;

        if (!updated?.serialNo) throw new Error("Serial number missing");

        const verificationUrl = buildVerificationUrl(updated.serialNo);
        const qrDataUrl = await generateQrDataUrl(verificationUrl);
        const adminSigDataUrl = adminSigRef.current.getDataUrl();

        const studentName = reqData.userId?.name || "Unknown Student";
        const requestFolder = getRequestFolder(reqData.predocs);
        if (!requestFolder) throw new Error("Could not determine request folder");

        await uploadApprovedQrImage(qrDataUrl, reqData.type, studentName, requestFolder);

        // Fetch student sig via backend proxy (avoids CORS)
        const { authorizerSig } = await getSignatureImages(reqData._id);

        const docReq = {
          ...updated,
          userId: reqData.userId,
          authorizerSigUrl: authorizerSig,
          adminSigDataUrl,
          verificationUrl,
          qrDataUrl,
        };
        const pdfBlob = await generateApprovedPDF(docReq);
        const t = reqData.formData?.ndaType || "general";
        const uploaded = await uploadApprovedForm(pdfBlob, reqData.type, studentName, requestFolder, `NDA_${t}_Approved.pdf`);

        await saveApprovedDocument(reqData._id, { ...uploaded, verificationUrl });

        // Delete ephemeral student signature
        if (reqData.authorizerSigPath) {
          await deleteStorageFile(reqData.authorizerSigPath);
        }

        alert("Approved and document generated!");
      } else {
        await updateRequestStatus(reqData._id, { status, remarks });
        alert(`Updated to ${status}`);
      }
      if (window.history.length > 1) navigate(-1);
      else navigate("/admin");
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to update request");
    } finally {
      setUpdating(false);
    }
  };

  const cfg = FIELDS_FILE_SLOTS_CONFIG.nda?.[reqData.formData?.ndaType];

  return (
    <>
      <div className="review-section">
        <h4 className="review-section-title">Form Data</h4>
        {cfg?.fields?.length ? (
          cfg.fields.map((f) => (
            <div key={f.name} className="review-field">
              <span className="review-field-label">{f.label}</span>
              <div className="review-info-box">
                {String(reqData.formData?.[f.name] ?? "") || <span className="review-info-box--muted">—</span>}
              </div>
            </div>
          ))
        ) : (
          <pre style={{ background: "var(--surface-2)", padding: "10px", borderRadius: "var(--radius-md)", fontSize: "12px" }}>
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
                📎 {f.requirementLabel || f.origName || `File ${idx + 1}`}
              </a>
            ))}
          </div>
        ) : (
          <div className="review-info-box"><span className="review-info-box--muted">No files.</span></div>
        )}
      </div>

      {isPending && (
        <>
          <div className="review-section">
            <h4 className="review-section-title">Your E-Signature (Admin) *</h4>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 8px 0" }}>
              Draw your signature below to sign off on approval.
            </p>
            <SignaturePad ref={adminSigRef} height={150} />
            <button type="button" className="review-btn-clear" onClick={() => adminSigRef.current?.clear()}>
              Clear Signature
            </button>
          </div>
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
        </>
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
          <div className="review-info-box">
            {reqData.postdocs?.url
              ? <a href={reqData.postdocs.url} target="_blank" rel="noreferrer" className="review-link">View Document →</a>
              : <span className="review-info-box--muted">No approved document uploaded.</span>}
          </div>
        </div>
      )}

      {isPending && (
        <div className="review-actions">
          <button onClick={() => handleUpdate("completed")} disabled={updating} className="review-btn-primary">
            {updating ? "Generating..." : "Approve"}
          </button>
          <button onClick={() => handleUpdate("revision_requested")} disabled={updating} className="review-btn-secondary">
            Request Revision
          </button>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Agreement review panel (multi-phase)
// ─────────────────────────────────────────────────────────────────────────────
function AgreementReviewPanel({ reqData }) {
  const navigate = useNavigate();
  const [remarks, setRemarks] = useState(reqData.remarks || "");
  const [signingLink, setSigningLink] = useState("");
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const adminSigRef = useRef(null);

  const { status } = reqData;
  const cfg = FIELDS_FILE_SLOTS_CONFIG.agreement;

  const handlePhase1Approve = async () => {
    setGenerating(true);
    try {
      const res = await generateSigningLink(reqData._id);
      const link = `${window.location.origin}/sign/${res.signingToken}`;
      setSigningLink(link);
      alert("Signing link generated! Copy it and send to the representative manually.");
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to generate signing link");
    } finally {
      setGenerating(false);
    }
  };

  const handlePhase1Revision = async () => {
    try {
      await updateRequestStatus(reqData._id, { status: "revision_requested", remarks });
      alert("Revision requested from student.");
      if (window.history.length > 1) navigate(-1);
      else navigate("/admin");
    } catch (err) {
      alert(err.response?.data?.message || "Failed");
    }
  };

  const handlePhase3Approve = async () => {
    if (!adminSigRef.current || adminSigRef.current.isEmpty()) {
      alert("Please draw your e-signature before approving.");
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

      // Fetch Firebase signature images via backend proxy to avoid browser CORS
      const { authorizerSig, repSig } = await getSignatureImages(reqData._id);

      const docReq = {
        ...updated,
        userId: reqData.userId,
        repInfo: reqData.repInfo,
        authorizerSigUrl: authorizerSig,
        repSigUrl: repSig,
        adminSigDataUrl,
        verificationUrl,
        qrDataUrl,
      };

      const pdfBlob = await generateApprovedPDF(docReq);
      const uploaded = await uploadApprovedForm(pdfBlob, "agreement", studentName, requestFolder, "Agreement_Approved.pdf");

      await saveApprovedDocument(reqData._id, { ...uploaded, verificationUrl });

      // Delete ephemeral signature images after final PDF is stored
      await deleteStorageFile(reqData.authorizerSigPath);
      await deleteStorageFile(reqData.repSigPath);

      alert("Agreement fully approved and document generated!");
      setApproving(false);
      if (window.history.length > 1) navigate(-1);
      else navigate("/admin");
    } catch (err) {
      setApproving(false);
      alert(err.response?.data?.message || err.message || "Failed to approve");
    }
  };

  const handlePhase3RepRevision = async () => {
    if (!remarks.trim()) {
      alert("Please enter remarks explaining what the representative needs to revise.");
      return;
    }
    try {
      const res = await adminPhase3Action(reqData._id, { action: "rep_revision_requested", remarks });
      const newLink = `${window.location.origin}/sign/${res.request.signingToken}`;
      setSigningLink(newLink);
      alert("Representative revision requested. A new signing link has been generated — copy it and send to the representative.");
    } catch (err) {
      alert(err.response?.data?.message || "Failed");
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
              {String(reqData.formData?.[f.name] ?? "") || <span className="review-info-box--muted">—</span>}
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
                📎 {f.requirementLabel || f.origName || `File ${idx + 1}`}
              </a>
            ))}
          </div>
        ) : (
          <div className="review-info-box"><span className="review-info-box--muted">No files.</span></div>
        )}
      </div>

      {/* Authorizer signature */}
      {reqData.authorizerSigUrl && (
        <div className="review-section">
          <h4 className="review-section-title">Authorizer E-Signature</h4>
          <div className="review-sig-wrap">
            <img src={reqData.authorizerSigUrl} alt="Authorizer signature" className="review-sig-img" />
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
          {reqData.repInfo.govIdDoc?.url && (
            <div className="review-field">
              <span className="review-field-label">Government ID</span>
              <div className="review-info-box">
                <a href={reqData.repInfo.govIdDoc.url} target="_blank" rel="noreferrer" className="review-link">
                  {reqData.repInfo.govIdDoc.origName || "View ID"} →
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Representative signature (phase3+) */}
      {reqData.repSigUrl && (
        <div className="review-section">
          <h4 className="review-section-title">Representative E-Signature</h4>
          <div className="review-sig-wrap">
            <img src={reqData.repSigUrl} alt="Representative signature" className="review-sig-img" />
            <span className="review-sig-name">{reqData.repInfo?.name || reqData.formData?.repName}</span>
          </div>
        </div>
      )}

      {/* Remarks display */}
      {(status === "revision_requested" || status === "rep_revision_requested") && reqData.remarks && (
        <div className="review-section">
          <h4 className="review-section-title">Remarks</h4>
          <div className="review-info-box">{reqData.remarks}</div>
        </div>
      )}

      {/* Final approved document */}
      {status === "completed" && (
        <div className="review-section">
          <h4 className="review-section-title">Approved Agreement</h4>
          <div className="review-info-box">
            {reqData.postdocs?.url
              ? <a href={reqData.postdocs.url} target="_blank" rel="noreferrer" className="review-link">View Final Document →</a>
              : <span className="review-info-box--muted">No document uploaded yet.</span>}
          </div>
        </div>
      )}

      {/* Rep rejected */}
      {status === "declined" && (
        <div className="info-banner info-banner--danger">
          <strong>Representative Declined</strong>
          <p>The representative declined to sign. This request lifecycle has ended.</p>
        </div>
      )}

      {/* Generated signing link */}
      {signingLink && (
        <div className="signing-link-box">
          <p className="signing-link-title">Signing Link Generated</p>
          <p className="signing-link-desc">Copy and send this link to the representative manually:</p>
          <div className="signing-link-row">
            <code className="signing-link-code">{signingLink}</code>
            <button
              className="signing-link-copy-btn"
              onClick={() => { navigator.clipboard.writeText(signingLink); alert("Copied!"); }}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* ── Phase 1 actions ── */}
      {status === "submitted" && !signingLink && (
        <>
          <div className="review-section">
            <h4 className="review-section-title">Remarks (for student revision)</h4>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="review-textarea"
              placeholder="Required only if requesting student revision..."
            />
          </div>
          <div className="review-actions">
            <button onClick={handlePhase1Approve} disabled={generating} className="review-btn-primary">
              {generating ? "Generating link..." : "Approve & Generate Signing Link"}
            </button>
            <button onClick={handlePhase1Revision} className="review-btn-secondary">
              Request Revision from Student
            </button>
          </div>
        </>
      )}

      {/* ── Phase 2: waiting on rep ── */}
      {status === "awaiting_signature" && !signingLink && (
        <div className="info-banner info-banner--info">
          <strong>Waiting for Representative</strong>
          <p>The signing link has been generated. Share it with the representative. This page will update once they submit or decline.</p>
        </div>
      )}

      {/* ── Phase 3 actions ── */}
      {status === "pending_approval" && (
        <>
          <div className="review-section">
            <h4 className="review-section-title">Your E-Signature (Admin) *</h4>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 8px 0" }}>
              Draw your signature below to sign off on the final approval.
            </p>
            <SignaturePad ref={adminSigRef} height={150} />
            <button type="button" className="review-btn-clear" onClick={() => adminSigRef.current?.clear()}>
              Clear Signature
            </button>
          </div>

          <div className="review-section">
            <h4 className="review-section-title">Remarks (for rep revision)</h4>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="review-textarea"
              placeholder="Required only if requesting representative revision..."
            />
          </div>

          <div className="review-actions">
            <button onClick={handlePhase3Approve} disabled={approving} className="review-btn-primary">
              {approving ? "Generating final document..." : "Final Approve & Sign"}
            </button>
            <button onClick={handlePhase3RepRevision} className="review-btn-secondary">
              Request Rep Revision
            </button>
          </div>
        </>
      )}

      {/* ── Rep revision requested ── */}
      {status === "rep_revision_requested" && !signingLink && (
        <div className="info-banner info-banner--warning">
          <strong>Representative Revision Pending</strong>
          <p>A new signing link has been generated. Send it to the representative so they can resubmit.</p>
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

  const [reqData, setReqData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await getRequestById(id);
        setReqData(r);
      } catch (err) {
        alert(err.response?.data?.message || "Failed to load request");
        navigate("/admin/requests");
      }
    };
    load();
  }, [id, navigate]);

  if (!reqData) return null;

  const isAgreement = reqData.type === "agreement";

  const requestTitle =
    reqData.type === "agreement"
      ? "Agreement Request"
      : `NDA Request${reqData.formData?.ndaTypeLabel ? ` - ${reqData.formData.ndaTypeLabel}` : ""}`;

  return (
    <div className="review-page">
      <div className="review-card">
        <button
          className="review-back-btn"
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate("/admin");
          }}
        >
          ← Back
        </button>

        <div className="review-header">
          <h2 className="review-title">Review {requestTitle}</h2>
          <div className="review-meta">
            <span className="review-meta-row"><b>Status:</b> {prettyStatus(reqData.status)}</span>
            <span className="review-meta-row"><b>Request Date:</b> {new Date(reqData.createdAt).toLocaleDateString("en-US")}</span>
          </div>
        </div>

        <div className="review-section">
          <h4 className="review-section-title">Student</h4>
          <div className="review-info-box">
            <div style={{ fontWeight: 600 }}>{reqData.userId?.name || "Unknown"}</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{reqData.userId?.email || ""}</div>
          </div>
        </div>

        {isAgreement
          ? <AgreementReviewPanel reqData={reqData} />
          : <NdaReviewPanel reqData={reqData} />
        }
      </div>
    </div>
  );
}
