import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FIELDS_FILE_SLOTS_CONFIG } from "../../config/fieldsFileSlotsConfig";
import { getRequestById } from "../../services/requestService";

const formStyle = {
  padding: "30px",
  borderRadius: "8px",
  width: "520px",
  textAlign: "center",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
};

const metaRowStyle = { marginBottom: "14px", textAlign: "left" };
const fileLabelStyle = { display: "block", fontSize: "13px", marginBottom: "4px" };
const infoBoxStyle = { padding: "10px", border: "1px solid #ddd", borderRadius: "6px" };
const sectionWrapStyle = { textAlign: "left", marginTop: "10px" };

const prettyStatus = (s) => {
  const map = {
    pending: "Pending",
    approved: "Approved",
    revision_required: "Revision Required",
    phase1_pending: "Phase 1 – Pending Admin Review",
    phase2_pending: "Phase 2 – Awaiting Representative Signature",
    phase3_pending: "Phase 3 – Pending Final Admin Review",
    phase3_approved: "Approved",
    rep_rejected: "Declined by Representative",
    rep_revision_required: "Representative Revision Required",
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

        // Redirect to resubmit page if revision is required from student
        if (r.status === "revision_required") {
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

  const isApproved = reqData.status === "approved" || reqData.status === "phase3_approved";
  const isAgreement = reqData.type === "agreement";

  return (
    <div style={formStyle}>
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) navigate(-1);
          else navigate("/student");
        }}
        style={{ marginBottom: "10px" }}
      >
        Back
      </button>

      <h2>{`View ${title}`}</h2>

      <div style={metaRowStyle}>
        <div><b>Status:</b> {prettyStatus(reqData.status)}</div>
        <div><b>Request Date:</b> {new Date(reqData.createdAt).toLocaleDateString("en-US")}</div>
      </div>

      {/* Remarks */}
      <div style={sectionWrapStyle}>
        <h4 style={{ margin: "0 0 6px 0" }}>Remarks</h4>
        <div style={infoBoxStyle}>
          {reqData.remarks || <span style={{ opacity: 0.7 }}>No remarks provided.</span>}
        </div>
      </div>

      {/* Form Data */}
      <div style={sectionWrapStyle}>
        <h4 style={{ margin: "14px 0 6px 0" }}>Data Form</h4>
        {cfg?.fields?.length ? (
          cfg.fields.map((f) => (
            <div key={f.name} style={{ marginTop: "10px" }}>
              <label style={fileLabelStyle}>{f.label}</label>
              <div style={infoBoxStyle}>
                {String(reqData.formData?.[f.name] ?? "") || <span style={{ opacity: 0.6 }}>—</span>}
              </div>
            </div>
          ))
        ) : (
          <div style={infoBoxStyle}>
            <span style={{ opacity: 0.7 }}>No config fields found for this request.</span>
          </div>
        )}
      </div>

      {/* Attachments */}
      <div style={sectionWrapStyle}>
        <h4 style={{ margin: "14px 0 6px 0" }}>Attachments</h4>
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

      {/* Agreement-specific status info */}
      {isAgreement && reqData.status === "phase2_pending" && (
        <div style={{ ...sectionWrapStyle, background: "#eff6ff", padding: 12, borderRadius: 6, border: "1px solid #93c5fd", marginTop: 14 }}>
          <strong>Awaiting Representative</strong>
          <p style={{ margin: "4px 0 0 0", fontSize: 13 }}>
            The admin has approved your request and a signing link has been sent to the representative.
          </p>
        </div>
      )}

      {isAgreement && reqData.status === "phase3_pending" && (
        <div style={{ ...sectionWrapStyle, background: "#f0fdf4", padding: 12, borderRadius: 6, border: "1px solid #86efac", marginTop: 14 }}>
          <strong>Representative Signed</strong>
          <p style={{ margin: "4px 0 0 0", fontSize: 13 }}>
            The representative has submitted their signature. Awaiting final admin approval.
          </p>
        </div>
      )}

      {isAgreement && reqData.status === "rep_rejected" && (
        <div style={{ ...sectionWrapStyle, background: "#fef2f2", padding: 12, borderRadius: 6, border: "1px solid #fca5a5", marginTop: 14 }}>
          <strong>Representative Declined</strong>
          <p style={{ margin: "4px 0 0 0", fontSize: 13 }}>
            The representative declined to sign this agreement.
          </p>
        </div>
      )}

      {isAgreement && reqData.status === "rep_revision_required" && (
        <div style={{ ...sectionWrapStyle, background: "#fff7ed", padding: 12, borderRadius: 6, border: "1px solid #fb923c", marginTop: 14 }}>
          <strong>Representative Revision Requested</strong>
          <p style={{ margin: "4px 0 0 0", fontSize: 13 }}>
            The admin has requested the representative to revise and resubmit their information.
          </p>
        </div>
      )}

      {/* Approved document */}
      {isApproved && (
        <div style={sectionWrapStyle}>
          <h4 style={{ margin: "14px 0 6px 0" }}>Approved Document</h4>
          <div style={infoBoxStyle}>
            {reqData.postdocs?.url ? (
              <a href={reqData.postdocs.url} target="_blank" rel="noreferrer">
                View Approved Document
              </a>
            ) : (
              <span style={{ opacity: 0.7 }}>No approved document uploaded.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
