import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import { FIELDS_FILE_SLOTS_CONFIG } from "../../config/fieldsFileSlotsConfig";
import { getRequestById } from "../../services/requestService";

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

export default function StudentRequestReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reqData, setReqData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await getRequestById(id);
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

  const isApproved = reqData.status === "approved";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px" }}>
      <div style={formStyle}>
        <button
          type="button"
          onClick={() => { if (window.history.length > 1) navigate(-1); else navigate("/student"); }}
          style={{ marginBottom: "10px", background: "none", border: "none", color: "#0f2d6b", cursor: "pointer", fontSize: 14 }}
        >
          ← Back
        </button>

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
          </div>
        </div>

        {/* Form Data */}
        <div style={sectionWrapStyle}>
          <h4 style={{ margin: "14px 0 6px" }}>Data Form</h4>
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
            <div style={infoBoxStyle}><span style={{ opacity: 0.7 }}>No config fields found.</span></div>
          )}
        </div>

        {/* Attachments */}
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
