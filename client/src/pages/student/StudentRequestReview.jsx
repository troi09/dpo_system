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

const prettyStatus = (s) => s === "revision_required" ? "Revision Required" : s.charAt(0).toUpperCase() + s.slice(1);

export default function StudentRequestReview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [reqData, setReqData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await getRequestById(id);

        // If revision required, send to actual resubmit page
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
    if (reqData.requestType === "agreement") return FIELDS_FILE_SLOTS_CONFIG.agreement;
    if (reqData.requestType === "nda") return FIELDS_FILE_SLOTS_CONFIG.nda[reqData.formData?.ndaType];
    return null;
  }, [reqData]);

  if (!reqData) return null;

  const title =
    reqData.requestType === "agreement"
      ? "Agreement Request"
      : `NDA Request${reqData.formData?.ndaTypeLabel ? ` - ${reqData.formData.ndaTypeLabel}` : ""}`;

  const isApproved = reqData.status === "approved";

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
        <div><b>Submitted:</b> {new Date(reqData.createdAt).toLocaleDateString("en-US")}</div>
      </div>

      {/* Admin Remarks (always shown for consistency) */}
      <div style={sectionWrapStyle}>
        <h4 style={{ margin: "0 0 6px 0" }}>Admin Remarks</h4>
        <div style={infoBoxStyle}>
          {reqData.adminRemarks || <span style={{ opacity: 0.7 }}>No remarks provided.</span>}
        </div>
      </div>

      {/* Form Data (view-only) */}
      <div style={sectionWrapStyle}>
        <h4 style={{ margin: "14px 0 6px 0" }}>Request Details</h4>

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

      {/* Files Submitted */}
      <div style={sectionWrapStyle}>
        <h4 style={{ margin: "14px 0 6px 0" }}>Files Submitted</h4>
        {reqData.requirements?.length ? (
          reqData.requirements.map((f, idx) => (
            <div key={idx} style={{ marginTop: "6px" }}>
              <a href={f.url} target="_blank" rel="noreferrer">
                {f.requirementLabel || f.originalName || `File ${idx + 1}`}
              </a>
            </div>
          ))
        ) : (
          <div style={{ opacity: 0.7 }}>No files.</div>
        )}
      </div>

      {/* Approved placeholder */}
      {isApproved && (
        <div style={sectionWrapStyle}>
          <h4 style={{ margin: "14px 0 6px 0" }}>Approved Request Form</h4>
          <div style={infoBoxStyle}>
            <span style={{ opacity: 0.7 }}>
              Placeholder: this is where the approved request form / generation UI will go.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}