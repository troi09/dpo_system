import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FIELDS_FILE_SLOTS_CONFIG } from "../../config/fieldsFileSlotsConfig";
import { getRequestById, resubmitRequest } from "../../services/requestService";
import {
  uploadRequirements,
  uploadSignatureImage,
  getDateRequestFolder,
} from "../../services/firebaseStorageService";
import SignaturePad from "../../components/SignaturePad";
import { notify } from "../../utils/inPageFeedback";
import "../../components/RequestForm.css";
import "../../components/FloatingLabel.css";

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
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const sigPadRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await getRequestById(id);
        setReqData(r);
        setFormData(r.formData || {});
      } catch (err) {
        notify(err.response?.data?.message || "Failed to load request", { type: "error" });
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

    if (!["stud_revision_requested"].includes(reqData.status)) {
      notify("Only revision requested requests can be resubmitted.", { type: "warning" });
      return;
    }

    const selectedFiles = files.filter(Boolean);
    if (selectedFiles.length === 0) {
      notify("Please upload at least 1 revised file.", { type: "warning" });
      return;
    }

    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      notify("Please draw your e-signature before resubmitting.", { type: "warning" });
      return;
    }

    if (!accepted) {
      notify("Please confirm the declaration before submitting.", { type: "warning" });
      return;
    }

    const basePath = reqData.predocs?.[0]?.path || "";
    const initialFolder = getInitialFolderFromPath(basePath);
    if (!initialFolder) {
      notify("Missing original request folder. (No existing file path found)", { type: "error" });
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    try {
      const selectedFiles = files.filter(Boolean);
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const studentName = user?.name || "Unknown Student";
      const initialFolder = getInitialFolderFromPath(reqData.predocs?.[0]?.path || "");
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
          sigDataUrl, "agreement", studentName, resubPath, "authorizer_sig.png"
        );
        payload.authorizerSigUrl = authorizerSigUrl;
        payload.authorizerSigPath = authorizerSigPath;
      }

      if (reqData.type === "nda") {
        const sigDataUrl = sigPadRef.current.getDataUrl();
        const { url: studentSigUrl, path: studentSigPath } = await uploadSignatureImage(
          sigDataUrl, "nda", studentName, resubPath, "student_sig.png"
        );
        payload.studentSigUrl = studentSigUrl;
        payload.studentSigPath = studentSigPath;
      }

      await resubmitRequest(id, payload);
      notify("Your request has been resubmitted successfully.", { type: "success", title: "Resubmitted" });
      navigate("/student");
    } catch (err) {
      notify(err.response?.data?.message || "Failed to resubmit. Please try again.", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!reqData) return null;

  if (!["stud_revision_requested"].includes(reqData.status)) {
    return (
      <div className="review-page">
        <div className="review-card">
          <button
            type="button"
            className="review-back-btn"
            onClick={() => { if (window.history.length > 1) navigate(-1); else navigate("/student"); }}
          >
            ← Back
          </button>
          <div className="review-info-box">
            <span className="review-info-box--muted">This request is not marked as revision requested.</span>
          </div>
        </div>
      </div>
    );
  }

  const dataTitle = reqData.type === "agreement" ? "Revised Representative Data" : "Revised Requestor Data";

  return (
    <div className="request-form-page">
      <form onSubmit={handleSubmit} className="request-form-card">
        <div className="request-form-header">
          <button
            type="button"
            className="request-form-back"
            onClick={() => { if (window.history.length > 1) navigate(-1); else navigate("/student"); }}
          >
            ‹ Back
          </button>
          <h2 className="request-form-title">Resubmit Request Form</h2>
          <div />
        </div>

        {/* Section 1: Remarks */}
        <div className="request-section">
          <div className="request-section-title">Remarks from Admin</div>
          <div style={{
            padding: "12px 14px",
            background: "var(--s-warning-bg)",
            border: "1px solid var(--s-warning-dot)",
            borderRadius: "var(--radius-md)",
            fontSize: "13px",
            color: "var(--s-warning-text)",
          }}>
            {reqData.remarks || <span style={{ opacity: 0.7 }}>No remarks provided.</span>}
          </div>
        </div>

        {/* Section 2: Revised Data */}
        <div className="request-section">
          <div className="request-section-title">{dataTitle}</div>
          {(() => {
            const nameKeys = ["repFirstName", "repMiddleInitial", "repLastName"];
            const nameFields = cfg.fields.filter((f) => nameKeys.includes(f.name));
            const otherFields = cfg.fields.filter((f) => !nameKeys.includes(f.name));
            return (
              <>
                {nameFields.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {nameFields.map((f) => (
                      <div key={f.name} className="fl-wrap">
                        <input
                          value={formData[f.name] || ""}
                          onChange={(e) => onChangeField(f.name, e.target.value)}
                          placeholder=" "
                          className="fl-input request-input"
                        />
                        <label className="fl-label">{f.label}</label>
                      </div>
                    ))}
                  </div>
                )}
                {otherFields.map((f) => (
                  <div key={f.name} className="fl-wrap">
                    {f.kind === "textarea" ? (
                      <textarea
                        value={formData[f.name] || ""}
                        onChange={(e) => onChangeField(f.name, e.target.value)}
                        rows={f.rows || 4}
                        placeholder=" "
                        className="fl-input request-textarea"
                      />
                    ) : (
                      <input
                        value={formData[f.name] || ""}
                        onChange={(e) => onChangeField(f.name, e.target.value)}
                        placeholder=" "
                        className="fl-input request-input"
                      />
                    )}
                    <label className={`fl-label${f.kind === "textarea" ? " fl-label--area" : ""}`}>{f.label}</label>
                  </div>
                ))}
              </>
            );
          })()}
        </div>

        {/* Section 3: Previous Attachments */}
        <div className="request-section">
          <div className="request-section-title">Previous Attachments</div>
          {reqData.predocs?.length ? (
            reqData.predocs.map((f, idx) => (
              <div key={idx} className="request-file-row">
                <div className="request-file-info">
                  <div className="request-file-title">{f.requirementLabel || f.origName || `File ${idx + 1}`}</div>
                </div>
                <a href={f.url} target="_blank" rel="noreferrer" className="request-file-action" style={{ textDecoration: "none" }}>
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
        </div>

        {/* Section 4: Revised Requirements */}
        <div className="request-section">
          <div className="request-section-title">Revised Requirements</div>
          {files.map((file, index) => (
            <div key={index} className="request-file-row">
              <div className="request-file-info">
                <div className="request-file-title">
                  {cfg.fileSlots[index]?.label || `Attach file ${index + 1}`}
                </div>
                <div className="request-file-subtitle">{file ? file.name : "No file selected"}</div>
              </div>
              <label className="request-file-action">
                {file ? "Change File" : "Upload File"}
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => {
                    const selected = e.target.files?.[0] || null;
                    setFiles((prev) => { const copy = [...prev]; copy[index] = selected; return copy; });
                  }}
                />
              </label>
            </div>
          ))}
        </div>

        {/* Section 5: E-Signature */}
        <div className="request-section">
          <div className="request-section-title">Your E-Signature *</div>
          <p className="request-sig-hint">Please draw your signature again for this resubmission.</p>
          <SignaturePad ref={sigPadRef} height={160} />
        </div>

        {/* Confirmation clause */}
        <label className="request-accept">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          <span>
            I confirm that all revised information and attachments I have provided are accurate and complete,
            and I consent to the processing of my personal data by the Data Protection Office for the purpose of this request.
          </span>
        </label>

        <div className="request-form-actions">
          <button type="submit" className="request-form-submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Resubmit"}
          </button>
        </div>
      </form>

      <AnimatePresence>
        {showConfirm && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
              <h3 className="modal-title">Resubmit Request</h3>
              <p className="modal-text">Please confirm that all revised information and attachments are accurate before resubmitting.</p>
              <div className="modal-actions">
                <button className="ui-btn ui-btn--secondary" onClick={() => setShowConfirm(false)} disabled={submitting}>Cancel</button>
                <button className="ui-btn ui-btn--primary" onClick={handleConfirmSubmit} disabled={submitting}>{submitting ? "Submitting…" : "Resubmit"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
