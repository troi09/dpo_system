import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FIELDS_FILE_SLOTS_CONFIG } from "../../config/fieldsFileSlotsConfig";
import { getRequestById, resubmitRequest } from "../../services/requestService";
import {
  uploadRequirements,
  uploadSignatureImage,
  getDateRequestFolder,
} from "../../services/firebaseStorageService";
import SignaturePad from "../../components/SignaturePad";

const formStyle = {
  padding: "30px",
  borderRadius: "8px",
  width: "520px",
  textAlign: "center",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
};

const prettyStatus = (s) => {
  const map = {
    revision_requested: "Revision Requested",
  };
  return map[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
};

const inputStyle = { width: "100%", padding: "10px", margin: "10px 0" };
const reqWrapStyle = { textAlign: "left", marginTop: "10px" };
const fileLabelStyle = { display: "block", fontSize: "13px", marginBottom: "4px" };
const submitBtnStyle = { width: "100%", padding: "10px", marginTop: "16px" };
const infoBoxStyle = { padding: "10px", border: "1px solid #ddd", borderRadius: "6px" };

const getInitialFolderFromPath = (path = "") => {
  const parts = String(path).split("/");
  return parts[3] || "";
};

export default function StudentResubmitRequest() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [reqData, setReqData] = useState(null);
  const [formData, setFormData] = useState({});
  const [files, setFiles] = useState([]);
  const sigPadRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await getRequestById(id);
        setReqData(r);
        setFormData(r.formData || {});
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

  useEffect(() => {
    if (!cfg) return;
    setFiles(Array(cfg.fileSlots.length).fill(null));
  }, [cfg]);

  const onChangeField = (name, value) =>
    setFormData((p) => ({ ...p, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reqData || !cfg) return;

    if (reqData.status !== "revision_requested") {
      alert("Only revision requested requests can be resubmitted.");
      return;
    }

    for (const f of cfg.fields) {
      if (f.required && !String(formData[f.name] || "").trim()) {
        alert(`${f.label} is required`);
        return;
      }
    }

    for (let i = 0; i < cfg.fileSlots.length; i++) {
      if (cfg.fileSlots[i].required && !files[i]) {
        alert(`${cfg.fileSlots[i].label} is required`);
        return;
      }
    }

    const selectedFiles = files.filter(Boolean);
    if (selectedFiles.length === 0) {
      alert("Please upload at least 1 file.");
      return;
    }

    // Agreements also require a new e-signature on resubmit
    if (reqData.type === "agreement") {
      if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
        alert("Please draw your e-signature before resubmitting.");
        return;
      }
    }

    const basePath = reqData.predocs?.[0]?.path || "";
    const initialFolder = getInitialFolderFromPath(basePath);
    if (!initialFolder) {
      alert("Missing original request folder. (No existing file path found)");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user") || "null");
    const studentName = user?.name || "Unknown Student";
    const resubFolder = `resub${getDateRequestFolder()}`;
    const resubPath = `${initialFolder}/${resubFolder}`;

    const uploaded = await uploadRequirements(selectedFiles, reqData.type, studentName, resubPath);

    let uploadIndex = 0;
    const predocs = files
      .map((f, i) => {
        if (!f) return null;
        const meta = uploaded[uploadIndex++];
        return { ...meta, requirementLabel: cfg.fileSlots[i]?.label || `File ${i + 1}` };
      })
      .filter(Boolean);

    const payload = { formData, predocs };

    // For agreements, upload new authorizer signature
    if (reqData.type === "agreement") {
      const sigDataUrl = sigPadRef.current.getDataUrl();
      const { url: authorizerSigUrl, path: authorizerSigPath } = await uploadSignatureImage(
        sigDataUrl,
        "agreement",
        studentName,
        resubPath,
        "authorizer_sig.png"
      );
      payload.authorizerSigUrl = authorizerSigUrl;
      payload.authorizerSigPath = authorizerSigPath;
    }

    await resubmitRequest(id, payload);

    alert("Resubmitted successfully!");
    navigate("/student");
  };

  if (!reqData) return null;

  const title =
    reqData.type === "agreement"
      ? "Agreement Request"
      : `NDA Request${reqData.formData?.ndaTypeLabel ? ` - ${reqData.formData.ndaTypeLabel}` : ""}`;

  if (reqData.status !== "revision_requested") {
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
        <div style={infoBoxStyle}>This request is not marked as revision requested.</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
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

      <h2>{`Resubmit ${title}`}</h2>

      <div style={{ marginBottom: "14px", textAlign: "left" }}>
        <div><b>Status:</b> {prettyStatus(reqData.status)}</div>
        <div><b>Request Date:</b> {new Date(reqData.createdAt).toLocaleDateString("en-US")}</div>
      </div>

      {/* Admin Remarks */}
      <div style={reqWrapStyle}>
        <h4 style={{ margin: "0 0 6px 0" }}>Remarks</h4>
        <div style={infoBoxStyle}>
          {reqData.remarks || <span style={{ opacity: 0.7 }}>No remarks provided.</span>}
        </div>
      </div>

      {/* Data Form (editable) */}
      <div style={reqWrapStyle}>
        <h4 style={{ margin: "14px 0 6px 0" }}>Data Form</h4>
        {cfg.fields.map((f) => (
          <div key={f.name} style={{ marginTop: "10px" }}>
            <label style={fileLabelStyle}>{f.label}</label>
            {f.kind === "textarea" ? (
              <textarea
                value={formData[f.name] || ""}
                onChange={(e) => onChangeField(f.name, e.target.value)}
                rows={f.rows || 4}
                style={inputStyle}
              />
            ) : (
              <input
                value={formData[f.name] || ""}
                onChange={(e) => onChangeField(f.name, e.target.value)}
                required={f.required}
                style={inputStyle}
              />
            )}
          </div>
        ))}
      </div>

      {/* Current files */}
      <div style={reqWrapStyle}>
        <h4 style={{ margin: "14px 0 6px 0" }}>Previously Submitted Files</h4>
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

      {/* Revised file uploads */}
      <div style={reqWrapStyle}>
        <h4 style={{ margin: "14px 0 6px 0" }}>Revised Attachments</h4>
        {files.map((file, index) => (
          <div key={index} style={{ marginTop: "10px" }}>
            <label style={fileLabelStyle}>
              {cfg.fileSlots[index]?.label || `Attach file ${index + 1}`}
              {cfg.fileSlots[index]?.required ? " *" : ""}
            </label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => {
                const selected = e.target.files?.[0] || null;
                setFiles((prev) => {
                  const copy = [...prev];
                  copy[index] = selected;
                  return copy;
                });
              }}
            />
            {file && <div style={{ fontSize: "12px", opacity: 0.7, marginTop: 2 }}>{file.name}</div>}
          </div>
        ))}
      </div>

      {/* E-signature for agreement resubmit */}
      {reqData.type === "agreement" && (
        <div style={reqWrapStyle}>
          <h4 style={{ margin: "14px 0 6px 0" }}>Your E-Signature *</h4>
          <p style={{ fontSize: 13, opacity: 0.7, margin: "0 0 6px 0" }}>
            Please draw your signature again for this resubmission.
          </p>
          <SignaturePad ref={sigPadRef} height={150} />
          <button
            type="button"
            style={{ marginTop: 6, fontSize: 12 }}
            onClick={() => sigPadRef.current?.clear()}
          >
            Clear Signature
          </button>
        </div>
      )}

      <button type="submit" style={submitBtnStyle}>
        Resubmit
      </button>
    </form>
  );
}
