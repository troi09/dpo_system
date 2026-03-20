import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Copy, Paperclip } from "lucide-react";
import RequestStepper from "../../components/RequestStepper";
import { FIELDS_FILE_SLOTS_CONFIG } from "../../config/fieldsFileSlotsConfig";
import { getRequestById } from "../../services/requestService";
import { notify } from "../../utils/inPageFeedback";
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

export default function StudentRequestReview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [reqData, setReqData] = useState(null);

  const load = async () => {
    try {
      const r = await getRequestById(id);

      // Redirect to resubmit page if revision is requested from student
      if (r.status === "stud_revision_requested") {
        navigate(`/student/resubmit/${id}`, { replace: true });
        return;
      }

      setReqData(r);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to load request", { type: "error" });
      navigate("/student");
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

  const isApproved = reqData.status === "nda_approved" || reqData.status === "agr_approved";
  const isAgreement = reqData.type === "agreement";

  return (
    <div className="review-page">
      <div className="review-card">
        <div className="request-form-header">
          <button
            type="button"
            className="request-form-back"
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate("/student");
            }}
          >
            ‹ Back
          </button>
          <h2 className="request-form-title">{title}</h2>
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

        <div className="review-section review-section--stepper">
          <RequestStepper status={reqData.status} type={reqData.type} />
        </div>


        {/* Form Data / Representative */}
        <div className="review-section">
          <h4 className="review-section-title">{isAgreement ? "Representative" : "Form Data"}</h4>
          {cfg?.fields?.length ? (
            isAgreement ? (
              <>
                {/* Full Name (bundled) */}
                <div className="review-field">
                  <span className="review-field-label">Full Name</span>
                  <div className="review-info-box">
                    {(() => {
                      const fd = reqData.formData || {};
                      const mid = String(fd.repMiddleInitial || "").trim();
                      const midInitial = mid ? `${mid[0].toUpperCase()}.` : "";
                      const full = [fd.repFirstName, midInitial, fd.repLastName].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
                      return full || <span className="review-info-box--muted">—</span>;
                    })()}
                  </div>
                </div>
                {/* Remaining fields */}
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
              </>
            ) : (
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
            )
          ) : (
            <div className="review-info-box">
              <span className="review-info-box--muted">No config fields found for this request.</span>
            </div>
          )}
        </div>

        {/* Attachments */}
        <div className="review-section">
          <h4 className="review-section-title">My Attachments</h4>
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
        {isAgreement && reqData.status === "agr_awaiting_rep_signature" && (
          <div className="info-banner info-banner--info">
            <strong>Awaiting Representative</strong>
            <p>
              The admin has approved your request and a signing link has been generated for
              the representative.
            </p>
          </div>
        )}

        {/* Signing link visibility (only while awaiting rep action) */}
        {isAgreement && reqData.signingToken && (reqData.status === "agr_awaiting_rep_signature" || reqData.status === "agr_rep_revision_requested") && (
          <div className="review-section">
            <h4 className="review-section-title">Representative Signing Link</h4>
            <div className="review-info-box" style={{ fontSize: 13 }}>
              <div className="signing-link-row">
                <span className="signing-link-code">Representative signing link ready — click to copy</span>
                <button
                  className="signing-link-copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/sign/${reqData.signingToken}`);
                    notify("Copied!", { type: "success" });
                  }}
                  title="Copy link"
                >
                  <Copy size={14} strokeWidth={2} />
                </button>
              </div>
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

        {isAgreement && reqData.status === "agr_pending_2" && (
          <div className="info-banner info-banner--success">
            <strong>Representative Signed</strong>
            <p>
              The representative has submitted their signature. Awaiting final admin approval.
            </p>
          </div>
        )}

        {isAgreement && reqData.status === "agr_declined" && (
          <div className="info-banner info-banner--danger">
            <strong>Recipient Declined</strong>
            <p>The recipient declined to sign this agreement.</p>
          </div>
        )}

        {isAgreement && reqData.status === "agr_rep_revision_requested" && (
          <div className="info-banner info-banner--warning">
            <strong>Recipient Revisions Requested</strong>
            <p>
              The admin has requested the recipient to revise and resubmit their information.
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
