import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FIELDS_FILE_SLOTS_CONFIG } from "../../config/fieldsFileSlotsConfig";
import { getRequestById, updateRequestStatus, saveApprovedDocument } from "../../services/requestService";
import { getComplianceReview } from "../../services/aiService";
import { generateApprovedPDF } from "../../config/documentTemplates";
import { uploadApprovedForm, uploadApprovedQrImage } from "../../services/firebaseStorageService";
import { buildVerificationUrl, generateQrDataUrl } from "../../services/qrService";

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

const prettyStatus = (s) => s === "revision_required" ? "Revision Required" : s.charAt(0).toUpperCase() + s.slice(1);

const getRequestFolder = (predocs = []) => {
  for (const r of predocs) {
    if (r.path) {
      const parts = String(r.path).split("/");
      return parts[3] || "";
    }
  }
  return "";
};

const buildDocFileName = (req) => {
  if (req.type === "agreement") return "Agreement_Approved.pdf";
  if (req.type === "nda") {
    const t = req.formData?.ndaType || "general";
    return `NDA_${t}_Approved.pdf`;
  }
  return "Approved.pdf";
};

export default function AdminRequestReview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [reqData, setReqData] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [approving, setApproving] = useState(false);
  const [complianceData, setComplianceData] = useState(null);
  const [complianceLoading, setComplianceLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await getRequestById(id);
        setReqData(r);
        setRemarks(r.remarks || "");

        // Automatically run the Compliance & Drafting Co-Pilot for pending requests
        if (r.status === "pending") {
          setComplianceLoading(true);
          try {
            const review = await getComplianceReview({
              type: r.type,
              formData: r.formData || {},
            });
            setComplianceData(review);
          } catch {
            // Compliance review is non-blocking; failure doesn't prevent manual review
          } finally {
            setComplianceLoading(false);
          }
        }
      } catch (err) {
        alert(err.response?.data?.message || "Failed to load request");
        navigate("/admin/requests");
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

  const isPending = reqData?.status === "pending";
  const isRevision = reqData?.status === "revision_required";
  const isApproved = reqData?.status === "approved";

  const handleUpdate = async (status) => {
    try {
      if (status === "approved") {
        setApproving(true);

        const updateRes = await updateRequestStatus(reqData._id, { status, remarks });
        const updated = updateRes.request;

        if (!updated?.serialNo) {
          throw new Error("Serial number missing");
        }

        const verificationUrl = buildVerificationUrl(updated.serialNo);
        const qrDataUrl = await generateQrDataUrl(verificationUrl);

        const studentName = reqData.userId?.name || "Unknown Student";
        const requestFolder = getRequestFolder(reqData.predocs);
        if (!requestFolder) throw new Error("Could not determine request folder");

        await uploadApprovedQrImage(qrDataUrl, reqData.type, studentName, requestFolder);

        const docReq = {
          ...updated,
          userId: reqData.userId,
          verificationUrl,
          qrDataUrl,
        };

        const pdfBlob = await generateApprovedPDF(docReq);

        const fileName = buildDocFileName(reqData);
        const uploaded = await uploadApprovedForm(pdfBlob, reqData.type, studentName, requestFolder, fileName);

        await saveApprovedDocument(reqData._id, {
          ...uploaded,
          verificationUrl,
        });

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

  if (!reqData) return null;

  const requestTitle =
    reqData.type === "agreement"
      ? "Agreement Request"
      : `NDA Request${reqData.formData?.ndaTypeLabel ? ` - ${reqData.formData.ndaTypeLabel}` : ""}`;

  const pageTitle = isPending ? `Review ${requestTitle}` : `View ${requestTitle}`;

  return (
    <div style={boxStyle}>
      <button
        onClick={() => {
          if (window.history.length > 1) navigate(-1);
          else navigate("/admin");
        }}
        style={{ marginBottom: "10px" }}
      > Back
      </button>

      <h2 style={{ marginTop: 0 }}>{pageTitle}</h2>

      <div style={{ marginBottom: "14px" }}>
        <div><b>Request Status:</b> {prettyStatus(reqData.status)}</div>
        <div><b>Request Date:</b> {new Date(reqData.createdAt).toLocaleDateString("en-US")}</div>
      </div>

      <div style={{ marginBottom: "14px" }}>
        <h4 style={sectionTitleStyle}>Student</h4>
        <div>{reqData.userId?.name || "Unknown"}</div>
        <div style={{ fontSize: "13px", opacity: 0.85 }}>{reqData.userId?.email || ""}</div>
      </div>

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
          <h4 style={sectionTitleStyle}>
            🤖 AI Compliance &amp; Drafting Co-Pilot
            <span style={{ fontSize: "11px", fontWeight: 400, marginLeft: "8px", opacity: 0.7 }}>
              (Agent 2 — Draft for Human Review)
            </span>
          </h4>
          {complianceLoading && (
            <div style={{ padding: "10px", color: "#64748b", fontStyle: "italic" }}>
              Analyzing document for compliance…
            </div>
          )}
          {!complianceLoading && complianceData && (
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
              {/* Risk Score */}
              <div style={{
                padding: "10px 14px",
                background: complianceData.compliance.riskLevel === "HIGH"
                  ? "#fef2f2"
                  : complianceData.compliance.riskLevel === "MODERATE"
                  ? "#fffbeb"
                  : "#f0fdf4",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}>
                <span style={{ fontWeight: 600 }}>Compliance Risk Score:</span>
                <span style={{
                  fontWeight: 700,
                  color: complianceData.compliance.riskLevel === "HIGH"
                    ? "#dc2626"
                    : complianceData.compliance.riskLevel === "MODERATE"
                    ? "#d97706"
                    : "#16a34a",
                }}>
                  {complianceData.compliance.riskScore}/100 — {complianceData.compliance.riskLevel}
                </span>
              </div>
              {/* Flags */}
              <div style={{ padding: "10px 14px" }}>
                {complianceData.compliance.flags.map((flag, i) => (
                  <div key={i} style={{ marginBottom: "6px", fontSize: "13px" }}>
                    <span style={{
                      fontWeight: 600,
                      color: flag.level === "HIGH"
                        ? "#dc2626"
                        : flag.level === "MODERATE"
                        ? "#d97706"
                        : "#16a34a",
                    }}>
                      [{flag.level}]
                    </span>{" "}
                    {flag.message}
                  </div>
                ))}
              </div>
              {/* Draft Summary */}
              <div style={{ padding: "10px 14px", borderTop: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 600, marginBottom: "6px" }}>Draft Summary</div>
                <pre style={{
                  background: "#f8fafc",
                  padding: "10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  whiteSpace: "pre-wrap",
                  margin: 0,
                }}>
                  {complianceData.draft.summary}
                </pre>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px", fontStyle: "italic" }}>
                  {complianceData.draft.disclaimer}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isPending && (
        <div style={{ marginBottom: "14px" }}>
          <h4 style={sectionTitleStyle}>Remarks</h4>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={4}
            style={textareaStyle}
            placeholder="Optional remarks..."
          />
        </div>
      )}

      {isRevision && (
        <div style={{ marginBottom: "14px" }}>
          <h4 style={sectionTitleStyle}>Remarks</h4>
          <div style={infoBlockStyle}>
            {reqData.remarks || <span style={{ opacity: 0.6 }}>No remarks provided.</span>}
          </div>
        </div>
      )}

      {isApproved && (
        <div style={{ marginBottom: "14px" }}>
          <h4 style={sectionTitleStyle}>Approved Request Form</h4>
          <div style={infoBlockStyle}>
            {reqData.postdocs?.url ? (
              <a href={reqData.postdocs.url} target="_blank" rel="noreferrer">
                Placeholder Document
              </a>
            ) : (
              <span style={{ opacity: 0.7 }}>No approved document uploaded.</span>
            )}
          </div>
        </div>
      )}

      {isPending && (
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => handleUpdate("approved")}
            disabled={approving}
            style={{ flex: 1, padding: "10px" }}
          >
            {approving ? "Generating..." : "Approve"}
          </button>
          <button onClick={() => handleUpdate("revision_required")} style={{ flex: 1, padding: "10px" }}>
            Request Revision
          </button>
        </div>
      )}
    </div>
  );
}