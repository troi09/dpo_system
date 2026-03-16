import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Paperclip, RefreshCw } from "lucide-react";
import RequestStepper from "../../components/RequestStepper";
import { FIELDS_FILE_SLOTS_CONFIG } from "../../config/fieldsFileSlotsConfig";
import { getRequestById } from "../../services/requestService";
import { notify } from "../../utils/inPageFeedback";

const prettyStatus = (s) => {
  const map = {
    nda_submitted:              "Submitted",
    nda_admin_reviewal:         "Admin Reviewal",
    nda_approved:               "Approved",
    nda_revision_requested:      "Revision Requested",
    agreement_submitted:                "Submitted",
    agreement_initial_admin_reviewal:   "Initial Admin Reviewal",
    agreement_awaiting_rep_approval:    "Awaiting Representative Signature",
    agreement_final_admin_reviewal:     "Pending Final Admin Review",
    agreement_approved:                 "Approved",
    agreement_rep_declined:             "Declined by Representative",
    agreement_rep_revision_requested:   "Representative Revision Requested",

    // Legacy fallback
    nda_pending:                "Admin Reviewal",
    revision_requested:         "Revision Requested",
    agr_pending_1:              "Initial Admin Reviewal",
    agr_awaiting_rep_signature: "Awaiting Representative Signature",
    agr_pending_2:              "Pending Final Admin Review",
    agr_approved:               "Approved",
    agr_rep_declined:           "Declined by Representative",
    agr_rep_revision_requested: "Representative Revision Requested",
  };
  return map[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "—");
};

export default function StudentRequestReview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [reqData, setReqData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async ({ withToast = false } = {}) => {
    if (withToast) setRefreshing(true);
    try {
      const r = await getRequestById(id);

      // Redirect to resubmit page if revision is requested from student
      if (r.status === "nda_revision_requested" || r.status === "revision_requested") {
        navigate(`/student/resubmit/${id}`, { replace: true });
        return;
      }

        setReqData(r);
      } catch (err) {
        notify(err.response?.data?.message || "Failed to load request", { type: "error" });
        navigate("/student");
      } finally {
        if (withToast) setRefreshing(false);
      }
    };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const isApproved = reqData.status === "nda_approved" || reqData.status === "agreement_approved" || reqData.status === "agr_approved";
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
          <h2 className="review-title">{title}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div className="review-meta">
              <span className="review-meta-row">
                <b>Status:</b> {prettyStatus(reqData.status)}
              </span>
              <span className="review-meta-row">
                <b>Date:</b> {new Date(reqData.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </span>
            </div>
            <button
              type="button"
              className="ui-btn ui-btn--secondary ui-btn--icon"
              onClick={() => load({ withToast: true })}
              disabled={refreshing}
              title="Refresh request data"
            >
              <RefreshCw size={14} className={refreshing ? "spin-anim" : ""} />
            </button>
          </div>
        </div>

        <div className="review-section review-section--stepper">
          <RequestStepper status={reqData.status} type={reqData.type} />
        </div>

        {/* Remarks */}
        <div className="review-section">
          <h4 className="review-section-title">Remarks</h4>
          <div className="review-info-box">
            {reqData.remarks || (
              <span className="review-info-box--muted">No remarks provided.</span>
            )}
          </div>
        </div>

        {/* Form Data */}
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

        {/* Agreement-specific status banners */}
        {isAgreement && (reqData.status === "agreement_awaiting_rep_approval" || reqData.status === "agr_awaiting_rep_signature") && (
          <div className="info-banner info-banner--info">
            <strong>Awaiting Representative</strong>
            <p>
              The admin has approved your request and a signing link has been generated for
              the representative.
            </p>
          </div>
        )}

        {/* Signing link visibility (always shown once generated) */}
        {isAgreement && reqData.signingToken && (
          <div className="review-section">
            <h4 className="review-section-title">Representative Signing Link</h4>
            <div className="review-info-box" style={{ wordBreak: "break-all", fontSize: 13 }}>
              <a
                href={`${window.location.origin}/sign/${reqData.signingToken}`}
                target="_blank"
                rel="noreferrer"
                className="review-file-link"
              >
                {window.location.origin}/sign/{reqData.signingToken}
              </a>
              {reqData.signingTokenExpiresAt && (
                <div style={{ marginTop: 6, fontSize: 12, color: new Date(reqData.signingTokenExpiresAt) < new Date() ? "#dc2626" : "var(--text-muted)" }}>
                  {new Date(reqData.signingTokenExpiresAt) < new Date()
                    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><AlertTriangle size={14} strokeWidth={1.8} />This link has expired.</span>
                    : `Expires: ${new Date(reqData.signingTokenExpiresAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}`}
                </div>
              )}
            </div>
          </div>
        )}

        {isAgreement && (reqData.status === "agreement_final_admin_reviewal" || reqData.status === "agr_pending_2") && (
          <div className="info-banner info-banner--success">
            <strong>Representative Signed</strong>
            <p>
              The representative has submitted their signature. Awaiting final admin approval.
            </p>
          </div>
        )}

        {isAgreement && (reqData.status === "agreement_rep_declined" || reqData.status === "agr_rep_declined") && (
          <div className="info-banner info-banner--danger">
            <strong>Representative Declined</strong>
            <p>The representative declined to sign this agreement.</p>
          </div>
        )}

        {isAgreement && (reqData.status === "agreement_rep_revision_requested" || reqData.status === "agr_rep_revision_requested") && (
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
            {reqData.postdocs?.url ? (
              <a href={reqData.postdocs.url} target="_blank" rel="noreferrer" className="review-file-link">
                <Paperclip size={14} strokeWidth={1.8} aria-hidden="true" /> Approved Document
              </a>
            ) : (
              <div className="review-info-box">
                <span className="review-info-box--muted">No approved document uploaded.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
