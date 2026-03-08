import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import { FIELDS_FILE_SLOTS_CONFIG } from "../../config/fieldsFileSlotsConfig";
import { getRequestById } from "../../services/requestService";

<<<<<<< HEAD
// ── Stepper ──────────────────────────────────────────────────────────────────
const STEPS = [
  { key: "submitted",         label: "Submitted" },
  { key: "under_review",      label: "Under Review" },
  { key: "awaiting_signature",label: "Awaiting Signature" },
  { key: "approved",          label: "Approved" },
];

const statusToStep = (status) => {
  if (status === "pending")            return 1; // Under Review
  if (status === "revision_required")  return 1; // Under Review
  if (status === "approved")           return 3; // Approved
  return 0;
};

function RequestStepper({ status }) {
  const activeIndex = statusToStep(status);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 0 28px", flexWrap: "wrap", gap: 0 }}>
      {STEPS.map((step, i) => {
        const done    = i < activeIndex;
        const active  = i === activeIndex;
        const future  = i > activeIndex;
        return (
          <div key={step.key} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 90 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: done ? "#10b981" : active ? "#0f2d6b" : "#e5e7eb",
                color: done || active ? "#fff" : "#9ca3af",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 15,
                boxShadow: active ? "0 0 0 4px rgba(15,45,107,0.15)" : "none",
                transition: "all 0.2s",
              }}>
                {done ? <Check size={18} /> : i + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: active ? 700 : 400, color: active ? "#0f2d6b" : done ? "#10b981" : "#9ca3af", textAlign: "center" }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ width: 40, height: 2, background: done ? "#10b981" : "#e5e7eb", margin: "0 4px 20px", transition: "all 0.2s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const formStyle = {
  padding: "30px",
  borderRadius: "12px",
  width: "520px",
  maxWidth: "100%",
  textAlign: "center",
  boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
  background: "#fff",
};
const metaRowStyle = { marginBottom: "14px", textAlign: "left" };
const fileLabelStyle = { display: "block", fontSize: "13px", marginBottom: "4px" };
const infoBoxStyle = { padding: "10px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fafafa" };
const sectionWrapStyle = { textAlign: "left", marginTop: "10px" };

const prettyStatus = (s) =>
  s === "revision_required" ? "Revision Required" : s.charAt(0).toUpperCase() + s.slice(1);

=======
const prettyStatus = (s) => {
  const map = {
    pending: "Pending",
    approved: "Approved",
    revision_required: "Revision Required",
    revision_requested: "Revision Requested",
    submitted: "Submitted",
    awaiting_signature: "Awaiting Representative Signature",
    pending_approval: "Pending Final Admin Review",
    completed: "Completed",
    declined: "Declined by Representative",
    rep_revision_requested: "Representative Revision Requested",
  };
  return map[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "—");
};

>>>>>>> origin/Branch-ni-Kurl!
export default function StudentRequestReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reqData, setReqData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await getRequestById(id);
<<<<<<< HEAD
        if (r.status === "revision_required") {
=======

        // Redirect to resubmit page if revision is requested from student
        if (r.status === "revision_requested") {
>>>>>>> origin/Branch-ni-Kurl!
          navigate(`/student/resubmit/${id}`, { replace: true });
          return;
        }
        setReqData(r);
      } catch (err) {
        alert(err.response?.data?.message || "Failed to load request");
        navigate("/student");
      }
    };
    load();
  }, [id, navigate]);

  const cfg = useMemo(() => {
    if (!reqData) return null;
    if (reqData.type === "agreement") return FIELDS_FILE_SLOTS_CONFIG.agreement;
    if (reqData.type === "nda") return FIELDS_FILE_SLOTS_CONFIG.nda[reqData.formData?.ndaType];
    return null;
  }, [reqData]);

  if (!reqData) return null;

  const title =
    reqData.type === "agreement"
      ? "Agreement Request"
      : `NDA Request${reqData.formData?.ndaTypeLabel ? ` — ${reqData.formData.ndaTypeLabel}` : ""}`;

  const isApproved = reqData.status === "approved" || reqData.status === "completed";
  const isAgreement = reqData.type === "agreement";

  return (
<<<<<<< HEAD
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px" }}>
      <div style={formStyle}>
        <button
          type="button"
          onClick={() => { if (window.history.length > 1) navigate(-1); else navigate("/student"); }}
          style={{ marginBottom: "10px", background: "none", border: "none", color: "#0f2d6b", cursor: "pointer", fontSize: 14 }}
=======
    <div className="review-page">
      <div className="review-card">
        <button
          type="button"
          className="review-back-btn"
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate("/student");
          }}
>>>>>>> origin/Branch-ni-Kurl!
        >
          ← Back
        </button>

<<<<<<< HEAD
        <h2 style={{ color: "#0f2d6b", margin: "0 0 4px" }}>{`View ${title}`}</h2>

        {/* ── Stepper */}
        <RequestStepper status={reqData.status} />

        <div style={metaRowStyle}>
          <div><b>Status:</b> {prettyStatus(reqData.status)}</div>
          <div><b>Request Date:</b> {new Date(reqData.createdAt).toLocaleDateString("en-US")}</div>
        </div>

        {/* Admin Remarks */}
        <div style={sectionWrapStyle}>
          <h4 style={{ margin: "0 0 6px" }}>Remarks</h4>
          <div style={infoBoxStyle}>
            {reqData.remarks || <span style={{ opacity: 0.7 }}>No remarks provided.</span>}
=======
        <div className="review-header">
          <h2 className="review-title">{title}</h2>
          <div className="review-meta">
            <span className="review-meta-row">
              <b>Status:</b> {prettyStatus(reqData.status)}
            </span>
            <span className="review-meta-row">
              <b>Date:</b> {new Date(reqData.createdAt).toLocaleDateString("en-US")}
            </span>
          </div>
        </div>

        {/* Remarks */}
        <div className="review-section">
          <h4 className="review-section-title">Remarks</h4>
          <div className="review-info-box">
            {reqData.remarks || (
              <span className="review-info-box--muted">No remarks provided.</span>
            )}
>>>>>>> origin/Branch-ni-Kurl!
          </div>
        </div>

        {/* Form Data */}
<<<<<<< HEAD
        <div style={sectionWrapStyle}>
          <h4 style={{ margin: "14px 0 6px" }}>Data Form</h4>
          {cfg?.fields?.length ? (
            cfg.fields.map((f) => (
              <div key={f.name} style={{ marginTop: "10px" }}>
                <label style={fileLabelStyle}>{f.label}</label>
                <div style={infoBoxStyle}>
                  {String(reqData.formData?.[f.name] ?? "") || <span style={{ opacity: 0.6 }}>—</span>}
=======
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
>>>>>>> origin/Branch-ni-Kurl!
                </div>
              </div>
            ))
          ) : (
<<<<<<< HEAD
            <div style={infoBoxStyle}><span style={{ opacity: 0.7 }}>No config fields found.</span></div>
=======
            <div className="review-info-box">
              <span className="review-info-box--muted">No config fields found for this request.</span>
            </div>
>>>>>>> origin/Branch-ni-Kurl!
          )}
        </div>

        {/* Attachments */}
<<<<<<< HEAD
        <div style={sectionWrapStyle}>
          <h4 style={{ margin: "14px 0 6px" }}>Attachments</h4>
          {reqData.predocs?.length ? (
            reqData.predocs.map((f, idx) => (
              <div key={idx} style={{ marginTop: "6px" }}>
                <a href={f.url} target="_blank" rel="noreferrer">
                  {f.requirementLabel || f.origName || `File ${idx + 1}`}
                </a>
              </div>
            ))
          ) : (
            <div style={{ opacity: 0.7 }}>No files.</div>
          )}
        </div>

        {/* Approved document */}
        {isApproved && (
          <div style={sectionWrapStyle}>
            <h4 style={{ margin: "14px 0 6px" }}>Approved Request Form</h4>
            <div style={infoBoxStyle}>
              {reqData.postdocs?.url ? (
                <a href={reqData.postdocs.url} target="_blank" rel="noreferrer">
                  View Approved Document
                </a>
              ) : (
                <span style={{ opacity: 0.7 }}>No approved document uploaded.</span>
=======
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
            <div className="review-info-box">
              <span className="review-info-box--muted">No files.</span>
            </div>
          )}
        </div>

        {/* Agreement-specific status banners */}
        {isAgreement && reqData.status === "awaiting_signature" && (
          <div className="info-banner info-banner--info">
            <strong>Awaiting Representative</strong>
            <p>
              The admin has approved your request and a signing link has been sent to the
              representative.
            </p>
          </div>
        )}

        {isAgreement && reqData.status === "pending_approval" && (
          <div className="info-banner info-banner--success">
            <strong>Representative Signed</strong>
            <p>
              The representative has submitted their signature. Awaiting final admin approval.
            </p>
          </div>
        )}

        {isAgreement && reqData.status === "declined" && (
          <div className="info-banner info-banner--danger">
            <strong>Representative Declined</strong>
            <p>The representative declined to sign this agreement.</p>
          </div>
        )}

        {isAgreement && reqData.status === "rep_revision_requested" && (
          <div className="info-banner info-banner--warning">
            <strong>Representative Revision Requested</strong>
            <p>
              The admin has requested the representative to revise and resubmit their information.
            </p>
          </div>
        )}

        {/* Approved document */}
        {isApproved && (
          <div className="review-section">
            <h4 className="review-section-title">Approved Document</h4>
            <div className="review-info-box">
              {reqData.postdocs?.url ? (
                <a href={reqData.postdocs.url} target="_blank" rel="noreferrer" className="review-link">
                  View Approved Document →
                </a>
              ) : (
                <span className="review-info-box--muted">No approved document uploaded.</span>
>>>>>>> origin/Branch-ni-Kurl!
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
