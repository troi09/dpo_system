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
  const [submitting, setSubmitting] = useState(false);
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
    if (!reqData || !cfg || submitting) return;

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

    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      alert("Please draw your e-signature before resubmitting.");
      return;
    }

    const basePath = reqData.predocs?.[0]?.path || "";
    const initialFolder = getInitialFolderFromPath(basePath);
    if (!initialFolder) {
      alert("Missing original request folder. (No existing file path found)");
      return;
    }

    setSubmitting(true);
    try {
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

      const sigDataUrl = sigPadRef.current.getDataUrl();
      const { url: authorizerSigUrl, path: authorizerSigPath } = await uploadSignatureImage(
        sigDataUrl,
        reqData.type,
        studentName,
        resubPath,
        "authorizer_sig.png"
      );

      await resubmitRequest(id, { formData, predocs, authorizerSigUrl, authorizerSigPath });

      alert("Resubmitted successfully!");
      navigate("/student");
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to resubmit");
    } finally {
      setSubmitting(false);
    }
  };

  if (!reqData) return null;

  const title =
    reqData.type === "agreement"
      ? "Agreement Request"
      : `NDA Request${reqData.formData?.ndaTypeLabel ? ` - ${reqData.formData.ndaTypeLabel}` : ""}`;

  if (reqData.status !== "revision_requested") {
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
          </div>
          <div className="review-info-box">This request is not marked as revision requested.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="review-page">
      <form className="review-card" onSubmit={handleSubmit}>
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
          <h2 className="review-title">{`Resubmit ${title}`}</h2>
          <div className="review-meta">
            <span className="review-meta-row"><b>Status:</b> Revision Requested</span>
            <span className="review-meta-row"><b>Request Date:</b> {new Date(reqData.createdAt).toLocaleDateString("en-US")}</span>
          </div>
        </div>

        {/* Admin Remarks */}
        <div className="review-section">
          <h4 className="review-section-title">Remarks</h4>
          <div className="review-info-box">
            {reqData.remarks || <span className="review-info-box--muted">No remarks provided.</span>}
          </div>
        </div>

        {/* Data Form (editable) */}
        <div className="review-section">
          <h4 className="review-section-title">Data Form</h4>
          {cfg.fields.map((f) => (
            <div key={f.name} className="review-field">
              <label className="request-label">
                {f.label}{f.required ? " *" : ""}
              </label>
              {f.kind === "textarea" ? (
                <textarea
                  value={formData[f.name] || ""}
                  onChange={(e) => onChangeField(f.name, e.target.value)}
                  rows={f.rows || 4}
                  className="request-textarea"
                />
              ) : (
                <input
                  value={formData[f.name] || ""}
                  onChange={(e) => onChangeField(f.name, e.target.value)}
                  required={f.required}
                  className="request-input"
                />
              )}
            </div>
          ))}
        </div>

        {/* Previously submitted files */}
        <div className="review-section">
          <h4 className="review-section-title">Previously Submitted Files</h4>
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

        {/* Revised file uploads */}
        <div className="review-section">
          <h4 className="review-section-title">Revised Attachments</h4>
          {files.map((file, index) => (
            <div key={index} className="request-file-row">
              <span className="request-file-label">
                {cfg.fileSlots[index]?.label || `Attach file ${index + 1}`}
                {cfg.fileSlots[index]?.required ? " *" : ""}
              </span>
              <label className="request-file-btn">
                {file ? file.name : "Choose file"}
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const selected = e.target.files?.[0] || null;
                    setFiles((prev) => {
                      const copy = [...prev];
                      copy[index] = selected;
                      return copy;
                    });
                  }}
                />
              </label>
            </div>
          ))}
        </div>

        {/* E-signature — required for both NDA and Agreement resubmit */}
        <div className="review-section">
          <h4 className="review-section-title">Your E-Signature *</h4>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 8px 0" }}>
            Please draw your signature again for this resubmission.
          </p>
          <SignaturePad ref={sigPadRef} height={150} />
          <button
            type="button"
            className="review-btn-clear"
            onClick={() => sigPadRef.current?.clear()}
          >
            Clear Signature
          </button>
        </div>

        <div className="request-form-actions">
          <button type="submit" className="request-form-submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Resubmit Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
