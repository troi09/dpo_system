import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FIELDS_FILE_SLOTS_CONFIG } from "../../config/fieldsFileSlotsConfig";
import { getRequestById } from "../../services/requestService";

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

export default function StudentRequestReview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [reqData, setReqData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await getRequestById(id);

        // Redirect to resubmit page if revision is requested from student
        if (r.status === "revision_requested") {
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
      : `NDA Request${reqData.formData?.ndaTypeLabel ? ` - ${reqData.formData.ndaTypeLabel}` : ""}`;

  const isApproved = reqData.status === "approved" || reqData.status === "completed";
  const isAgreement = reqData.type === "agreement";

  return (
    <div className="review-page">
      <div className="review-card">
        <button
          type="button"
          className="review-back-btn"
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate("/student");
          }}
        >
          ← Back
        </button>

        <div className="review-header">
          <h2 className="review-title">{`View ${title}`}</h2>
          <div className="review-meta">
            <span className="review-meta-row"><b>Status:</b> {prettyStatus(reqData.status)}</span>
            <span className="review-meta-row"><b>Request Date:</b> {new Date(reqData.createdAt).toLocaleDateString("en-US")}</span>
          </div>
        </div>

        {/* Remarks */}
        <div className="review-section">
          <h4 className="review-section-title">Remarks</h4>
          <div className="review-info-box">
            {reqData.remarks || <span className="review-info-box--muted">No remarks provided.</span>}
          </div>
        </div>

        {/* Form Data */}
        <div className="review-section">
          <h4 className="review-section-title">Data Form</h4>
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
            <div className="review-info-box">
              <span className="review-info-box--muted">No config fields found for this request.</span>
            </div>
          )}
        </div>

        {/* Attachments */}
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

        {/* Agreement-specific status info */}
        {isAgreement && reqData.status === "awaiting_signature" && (
          <div className="info-banner info-banner--info">
            <strong>Awaiting Representative</strong>
            <p>The admin has approved your request and a signing link has been sent to the representative.</p>
          </div>
        )}

        {isAgreement && reqData.status === "pending_approval" && (
          <div className="info-banner info-banner--success">
            <strong>Representative Signed</strong>
            <p>The representative has submitted their signature. Awaiting final admin approval.</p>
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
            <p>The admin has requested the representative to revise and resubmit their information.</p>
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
