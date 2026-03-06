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

const boxStyle = {
  padding: "20px",
  borderRadius: "8px",
  width: "720px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
};
const labelStyle = { fontSize: "13px", opacity: 0.8, marginBottom: "4px" };
const infoBlockStyle = { padding: "10px", border: "1px solid #ddd", borderRadius: "6px" };
const sectionTitleStyle = { margin: "0 0 6px 0" };
const textareaStyle = { width: "100%", padding: "10px" };

const prettyStatus = (s) => {
  const map = {
    pending: "Pending",
    approved: "Approved",
    revision_requested: "Revision Requested",
    submitted: "Submitted – Pending Admin Review",
    awaiting_signature: "Awaiting Representative Signature",
    pending_approval: "Pending Final Admin Review",
    completed: "Approved",
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
// NDA review panel (original flow: pending → approved | revision_required)
// ─────────────────────────────────────────────────────────────────────────────
function NdaReviewPanel({ reqData }) {
  const navigate = useNavigate();
  const [remarks, setRemarks] = useState(reqData.remarks || "");
  const [approving, setApproving] = useState(false);

  const isPending = reqData.status === "pending";
  const isRevision = reqData.status === "revision_requested";
  const isApproved = reqData.status === "approved";

  const handleUpdate = async (status) => {
    try {
      if (status === "approved") {
        setApproving(true);

        const updateRes = await updateRequestStatus(reqData._id, { status, remarks });
        const updated = updateRes.request;

        if (!updated?.serialNo) throw new Error("Serial number missing");

        const verificationUrl = buildVerificationUrl(updated.serialNo);
        const qrDataUrl = await generateQrDataUrl(verificationUrl);

        const studentName = reqData.userId?.name || "Unknown Student";
        const requestFolder = getRequestFolder(reqData.predocs);
        if (!requestFolder) throw new Error("Could not determine request folder");

        await uploadApprovedQrImage(qrDataUrl, reqData.type, studentName, requestFolder);

        const docReq = { ...updated, userId: reqData.userId, verificationUrl, qrDataUrl };
        const pdfBlob = await generateApprovedPDF(docReq);
        const t = reqData.formData?.ndaType || "general";
        const uploaded = await uploadApprovedForm(pdfBlob, reqData.type, studentName, requestFolder, `NDA_${t}_Approved.pdf`);

        await saveApprovedDocument(reqData._id, { ...uploaded, verificationUrl });

        alert("Approved and document generated!");
        setApproving(false);
      } else {
        await updateRequestStatus(reqData._id, { status, remarks });
        alert(`Updated to ${status}`);
      }
      if (window.history.length > 1) navigate(-1);
      else navigate("/admin");
    } catch (err) {
      setApproving(false);
      alert(err.response?.data?.message || err.message || "Failed to update request");
    }
  };

  const cfg = FIELDS_FILE_SLOTS_CONFIG.nda?.[reqData.formData?.ndaType];

  return (
    <>
      <div style={{ marginBottom: "14px" }}>
        <h4 style={sectionTitleStyle}>Form Data</h4>
        {cfg?.fields?.length ? (
          cfg.fields.map((f) => (
            <div key={f.name} style={{ marginBottom: "10px" }}>
              <div style={labelStyle}>{f.label}</div>
              <div style={infoBlockStyle}>
                {String(reqData.formData?.[f.name] ?? "") || <span style={{ opacity: 0.6 }}>—</span>}
              </div>
            </div>
          ))
        ) : (
          <pre style={{ background: "#f6f6f6", padding: "10px", borderRadius: "6px" }}>
            {JSON.stringify(reqData.formData || {}, null, 2)}
          </pre>
        )}
      </div>

      <div style={{ marginBottom: "14px" }}>
        <h4 style={sectionTitleStyle}>Attachments</h4>
        {reqData.predocs?.length ? (
          reqData.predocs.map((f, idx) => (
            <div key={idx} style={{ marginBottom: "6px" }}>
              <a href={f.url} target="_blank" rel="noreferrer">
                {f.requirementLabel || f.origName || `File ${idx + 1}`}
              </a>
            </div>
          ))
        ) : (
          <div style={{ opacity: 0.7 }}>No files.</div>
        )}
      </div>

      {isPending && (
        <div style={{ marginBottom: "14px" }}>
          <h4 style={sectionTitleStyle}>Remarks</h4>
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={4} style={textareaStyle} placeholder="Optional remarks..." />
        </div>
      )}

      {isRevision && (
        <div style={{ marginBottom: "14px" }}>
          <h4 style={sectionTitleStyle}>Remarks</h4>
          <div style={infoBlockStyle}>{reqData.remarks || <span style={{ opacity: 0.6 }}>No remarks provided.</span>}</div>
        </div>
      )}

      {isApproved && (
        <div style={{ marginBottom: "14px" }}>
          <h4 style={sectionTitleStyle}>Approved Request Form</h4>
          <div style={infoBlockStyle}>
            {reqData.postdocs?.url
              ? <a href={reqData.postdocs.url} target="_blank" rel="noreferrer">View Document</a>
              : <span style={{ opacity: 0.7 }}>No approved document uploaded.</span>}
          </div>
        </div>
      )}

      {isPending && (
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => handleUpdate("approved")} disabled={approving} style={{ flex: 1, padding: "10px" }}>
            {approving ? "Generating..." : "Approve"}
          </button>
          <button onClick={() => handleUpdate("revision_requested")} style={{ flex: 1, padding: "10px" }}>
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
      <div style={{ marginBottom: "14px" }}>
        <h4 style={sectionTitleStyle}>Form Data</h4>
        {cfg.fields.map((f) => (
          <div key={f.name} style={{ marginBottom: "10px" }}>
            <div style={labelStyle}>{f.label}</div>
            <div style={infoBlockStyle}>
              {String(reqData.formData?.[f.name] ?? "") || <span style={{ opacity: 0.6 }}>—</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Student attachments */}
      <div style={{ marginBottom: "14px" }}>
        <h4 style={sectionTitleStyle}>Student Attachments</h4>
        {reqData.predocs?.length ? (
          reqData.predocs.map((f, idx) => (
            <div key={idx} style={{ marginBottom: "6px" }}>
              <a href={f.url} target="_blank" rel="noreferrer">
                {f.requirementLabel || f.origName || `File ${idx + 1}`}
              </a>
            </div>
          ))
        ) : (
          <div style={{ opacity: 0.7 }}>No files.</div>
        )}
      </div>

      {/* Authorizer signature */}
      {reqData.authorizerSigUrl && (
        <div style={{ marginBottom: "14px" }}>
          <h4 style={sectionTitleStyle}>Authorizer E-Signature</h4>
          <div style={{ ...infoBlockStyle, padding: "6px" }}>
            <img src={reqData.authorizerSigUrl} alt="Authorizer signature" style={{ maxHeight: 80, display: "block" }} />
          </div>
          <div style={{ ...labelStyle, marginTop: 4 }}>{reqData.userId?.name}</div>
        </div>
      )}

      {/* Representative info (phase3+) */}
      {reqData.repInfo?.name && (
        <div style={{ marginBottom: "14px" }}>
          <h4 style={sectionTitleStyle}>Representative Information</h4>
          <div style={{ marginBottom: "6px" }}>
            <div style={labelStyle}>Name</div>
            <div style={infoBlockStyle}>{reqData.repInfo.name}</div>
          </div>
          {reqData.repInfo.govIdDoc?.url && (
            <div>
              <div style={labelStyle}>Government ID</div>
              <div style={infoBlockStyle}>
                <a href={reqData.repInfo.govIdDoc.url} target="_blank" rel="noreferrer">
                  {reqData.repInfo.govIdDoc.origName || "View ID"}
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Representative signature (phase3+) */}
      {reqData.repSigUrl && (
        <div style={{ marginBottom: "14px" }}>
          <h4 style={sectionTitleStyle}>Representative E-Signature</h4>
          <div style={{ ...infoBlockStyle, padding: "6px" }}>
            <img src={reqData.repSigUrl} alt="Representative signature" style={{ maxHeight: 80, display: "block" }} />
          </div>
          <div style={{ ...labelStyle, marginTop: 4 }}>{reqData.repInfo?.name || reqData.formData?.repName}</div>
        </div>
      )}

      {/* Remarks display */}
      {(status === "revision_requested" || status === "rep_revision_requested") && reqData.remarks && (
        <div style={{ marginBottom: "14px" }}>
          <h4 style={sectionTitleStyle}>Remarks</h4>
          <div style={infoBlockStyle}>{reqData.remarks}</div>
        </div>
      )}

      {/* Final approved document */}
      {status === "completed" && (
        <div style={{ marginBottom: "14px" }}>
          <h4 style={sectionTitleStyle}>Approved Agreement</h4>
          <div style={infoBlockStyle}>
            {reqData.postdocs?.url
              ? <a href={reqData.postdocs.url} target="_blank" rel="noreferrer">View Final Document</a>
              : <span style={{ opacity: 0.7 }}>No document uploaded yet.</span>}
          </div>
        </div>
      )}

      {/* Rep rejected */}
      {status === "declined" && (
        <div style={{ background: "#fef2f2", padding: 12, borderRadius: 6, border: "1px solid #fca5a5", marginBottom: 14 }}>
          <strong>Representative Declined</strong>
          <p style={{ margin: "4px 0 0 0", fontSize: 13 }}>
            The representative declined to sign. This request lifecycle has ended.
          </p>
        </div>
      )}

      {/* Generated signing link */}
      {signingLink && (
        <div style={{ marginBottom: "14px", background: "#f0fdf4", padding: 12, borderRadius: 6, border: "1px solid #86efac" }}>
          <strong>Signing Link</strong>
          <p style={{ fontSize: 13, margin: "4px 0 6px 0" }}>
            Copy and send this link to the representative manually:
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <code style={{ flex: 1, wordBreak: "break-all", fontSize: 12, background: "#fff", padding: "6px 8px", borderRadius: 4, border: "1px solid #ccc" }}>
              {signingLink}
            </code>
            <button onClick={() => { navigator.clipboard.writeText(signingLink); alert("Copied!"); }} style={{ padding: "6px 10px", fontSize: 12 }}>
              Copy
            </button>
          </div>
        </div>
      )}

      {/* ── Phase 1 actions ── */}
      {status === "submitted" && !signingLink && (
        <>
          <div style={{ marginBottom: "14px" }}>
            <h4 style={sectionTitleStyle}>Remarks (for student revision)</h4>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} style={textareaStyle} placeholder="Required only if requesting student revision..." />
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={handlePhase1Approve} disabled={generating} style={{ flex: 1, padding: "10px" }}>
              {generating ? "Generating link..." : "Approve & Generate Signing Link"}
            </button>
            <button onClick={handlePhase1Revision} style={{ flex: 1, padding: "10px" }}>
              Request Revision from Student
            </button>
          </div>
        </>
      )}

      {/* ── Phase 2: waiting on rep ── */}
      {status === "awaiting_signature" && !signingLink && (
        <div style={{ background: "#eff6ff", padding: 12, borderRadius: 6, border: "1px solid #93c5fd" }}>
          <strong>Waiting for Representative</strong>
          <p style={{ fontSize: 13, margin: "4px 0 0 0" }}>
            The signing link has been generated. Share it with the representative.
            This page will update once they submit or decline.
          </p>
        </div>
      )}

      {/* ── Phase 3 actions ── */}
      {status === "pending_approval" && (
        <>
          <div style={{ marginBottom: "14px" }}>
            <h4 style={sectionTitleStyle}>Your E-Signature (Admin) *</h4>
            <p style={{ fontSize: 13, opacity: 0.7, margin: "0 0 6px 0" }}>
              Draw your signature below to sign off on the final approval.
            </p>
            <SignaturePad ref={adminSigRef} height={150} />
            <button type="button" style={{ marginTop: 6, fontSize: 12 }} onClick={() => adminSigRef.current?.clear()}>
              Clear
            </button>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <h4 style={sectionTitleStyle}>Remarks (for rep revision)</h4>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} style={textareaStyle} placeholder="Required only if requesting representative revision..." />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={handlePhase3Approve} disabled={approving} style={{ flex: 1, padding: "10px" }}>
              {approving ? "Generating final document..." : "Final Approve & Sign"}
            </button>
            <button onClick={handlePhase3RepRevision} style={{ flex: 1, padding: "10px" }}>
              Request Rep Revision
            </button>
          </div>
        </>
      )}

      {/* ── Rep revision requested ── */}
      {status === "rep_revision_requested" && !signingLink && (
        <div style={{ background: "#fff7ed", padding: 12, borderRadius: 6, border: "1px solid #fb923c" }}>
          <strong>Representative Revision Pending</strong>
          <p style={{ fontSize: 13, margin: "4px 0 0 0" }}>
            A new signing link has been generated. Send it to the representative so they can resubmit.
          </p>
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
    <div style={boxStyle}>
      <button
        onClick={() => {
          if (window.history.length > 1) navigate(-1);
          else navigate("/admin");
        }}
        style={{ marginBottom: "10px" }}
      >
        Back
      </button>

      <h2 style={{ marginTop: 0 }}>Review {requestTitle}</h2>

      <div style={{ marginBottom: "14px" }}>
        <div><b>Request Status:</b> {prettyStatus(reqData.status)}</div>
        <div><b>Request Date:</b> {new Date(reqData.createdAt).toLocaleDateString("en-US")}</div>
      </div>

      <div style={{ marginBottom: "14px" }}>
        <h4 style={sectionTitleStyle}>Student</h4>
        <div>{reqData.userId?.name || "Unknown"}</div>
        <div style={{ fontSize: "13px", opacity: 0.85 }}>{reqData.userId?.email || ""}</div>
      </div>

      {isAgreement
        ? <AgreementReviewPanel reqData={reqData} />
        : <NdaReviewPanel reqData={reqData} />
      }
    </div>
  );
}
