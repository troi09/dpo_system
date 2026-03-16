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
import "../../components/RequestForm.css";

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

    if (!["nda_revision_requested", "revision_requested"].includes(reqData.status)) {
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

    if (reqData.type === "agreement") {
      if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
        alert("Please draw your e-signature before resubmitting.");
        return;
      }
    }

    if (reqData.type === "nda") {
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

    if (reqData.type === "nda") {
      const sigDataUrl = sigPadRef.current.getDataUrl();
      const { url: studentSigUrl, path: studentSigPath } = await uploadSignatureImage(
        sigDataUrl,
        "nda",
        studentName,
        resubPath,
        "student_sig.png"
      );
      payload.studentSigUrl = studentSigUrl;
      payload.studentSigPath = studentSigPath;
    }

    await resubmitRequest(id, payload);

    alert("Resubmitted successfully!");
    navigate("/student");
  };

  if (!reqData) return null;

  const title =
    reqData.type === "agreement"
      ? "Agreement Request"
      : `NDA Request${reqData.formData?.ndaTypeLabel ? ` — ${reqData.formData.ndaTypeLabel}` : ""}`;

  if (!["nda_revision_requested", "revision_requested"].includes(reqData.status)) {
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
          <h2 className="review-title">{title}</h2>
          <div className="review-info-box">
            <span className="review-info-box--muted">
              This request is not marked as revision requested.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="request-form-page">
      <form onSubmit={handleSubmit} className="request-form-card">
        {/* Header */}
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
          <h2 className="request-form-title">Resubmit {title}</h2>
          <div />
        </div>

        {/* Admin Remarks */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span className="request-section-title">Remarks from Admin</span>
          <div style={{
            padding: "12px 14px",
            background: "var(--s-warning-bg)",
            border: "1px solid var(--s-warning-dot)",
            borderRadius: "var(--radius-md)",
            fontSize: "13px",
            color: "var(--s-warning-text)",
          }}>
            {reqData.remarks || (
              <span style={{ opacity: 0.7 }}>No remarks provided.</span>
            )}
          </div>
        </div>

        <div className="request-form-body">
          {/* Data Form (editable) */}
          <div className="request-section">
            <div className="request-section-title">Data Form</div>
            {cfg.fields.map((f) => (
              <div key={f.name} className="request-field">
                <label className="request-label">{f.label}</label>
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

          <div className="request-section">
            {/* Previously Submitted Files */}
            <div className="request-section-title">Previously Submitted Files</div>
            {reqData.predocs?.length ? (
              reqData.predocs.map((f, idx) => (
                <div key={idx} className="request-file-row">
                  <div className="request-file-info">
                    <div className="request-file-title">
                      {f.requirementLabel || f.origName || `File ${idx + 1}`}
                    </div>
                  </div>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="request-file-action"
                    style={{ textDecoration: "none" }}
                  >
                    View
                  </a>
                </div>
              ))
            ) : (
              <div className="request-file-row">
                <div className="request-file-info">
                  <div className="request-file-subtitle">No files submitted.</div>
                </div>
              </div>
            )}

            {/* Revised file uploads */}
            <div className="request-section-title" style={{ marginTop: "16px" }}>
              Revised Attachments
            </div>
            {files.map((file, index) => (
              <div key={index} className="request-file-row">
                <div className="request-file-info">
                  <div className="request-file-title">
                    {cfg.fileSlots[index]?.label || `Attach file ${index + 1}`}
                    {cfg.fileSlots[index]?.required ? " *" : ""}
                  </div>
                  <div className="request-file-subtitle">
                    {file ? file.name : "No file selected"}
                  </div>
                </div>
                <label className="request-file-action">
                  Upload
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
                </label>
              </div>
            ))}

            {/* E-signature for agreement resubmit */}
            {reqData.type === "agreement" && (
              <>
                <div className="request-section-title" style={{ marginTop: "16px" }}>
                  Your E-Signature *
                </div>
                <p className="request-sig-hint">
                  Please draw your signature again for this resubmission.
                </p>
                <SignaturePad ref={sigPadRef} height={150} />
                <button
                  type="button"
                  className="request-sig-clear"
                  onClick={() => sigPadRef.current?.clear()}
                >
                  Clear Signature
                </button>
              </>
            )}

            {/* E-signature for NDA resubmit */}
            {reqData.type === "nda" && (
              <>
                <div className="request-section-title" style={{ marginTop: "16px" }}>
                  Your E-Signature *
                </div>
                <p className="request-sig-hint">
                  Please draw your signature again for this resubmission.
                </p>
                <SignaturePad ref={sigPadRef} height={150} />
                <button
                  type="button"
                  className="request-sig-clear"
                  onClick={() => sigPadRef.current?.clear()}
                >
                  Clear Signature
                </button>
              </>
            )}
          </div>
        </div>

        <div className="request-form-actions">
          <button type="submit" className="request-form-submit">
            Resubmit
          </button>
        </div>
      </form>
    </div>
  );
}
