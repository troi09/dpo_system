import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FIELDS_FILE_SLOTS_CONFIG } from "../../config/fieldsFileSlotsConfig";
import { getRequestById, updateRequestStatus, saveApprovedDocument } from "../../services/requestService";
import { generateApprovedPDF } from "../../config/documentTemplates";
import { uploadApprovedForm } from "../../services/firebaseStorageService";

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

  useEffect(() => {
    const load = async () => {
      try {
        const r = await getRequestById(id);
        setReqData(r);
        setRemarks(r.remarks || "");
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

        const docReq = { ...updated, userId: reqData.userId };
        const pdfBlob = await generateApprovedPDF(docReq);

        const studentName = reqData.userId?.name || "Unknown Student";
        const requestFolder = getRequestFolder(reqData.predocs);
        if (!requestFolder) throw new Error("Could not determine request folder");

        const fileName = buildDocFileName(reqData);
        const uploaded = await uploadApprovedForm(pdfBlob, reqData.type, studentName, requestFolder, fileName);

        await saveApprovedDocument(reqData._id, uploaded);

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