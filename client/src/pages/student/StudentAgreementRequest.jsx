import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FIELDS_FILE_SLOTS_CONFIG } from "../../config/fieldsFileSlotsConfig";
import { createRequest } from "../../services/requestService";
import {
  uploadRequirements,
  uploadSignatureImage,
  getDateRequestFolder,
} from "../../services/firebaseStorageService";
import SignaturePad from "../../components/SignaturePad";
import { notify } from "../../utils/inPageFeedback";
import "../../components/RequestForm.css";
import "../../components/FloatingLabel.css";

export default function StudentAgreementRequest({ proxyMode = false, fallbackPath = "/student/new-request/agreement" }) {
  const navigate = useNavigate();
  const cfg = useMemo(() => FIELDS_FILE_SLOTS_CONFIG.agreement, []);

  const [formData, setFormData] = useState(() => ({}));
  const [proxyRequestee, setProxyRequestee] = useState({
    firstName: "",
    middleInitial: "",
    lastName: "",
    email: "",
  });
  const [files, setFiles] = useState(() => Array(cfg.fileSlots.length).fill(null));
  const [outsidePH, setOutsidePH] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const sigPadRef = useRef(null);

  const fileSlots = useMemo(() => {
    const slots = [...cfg.fileSlots];
    if (outsidePH) slots[0] = { ...slots[0], label: "Consular Notarized Authorization" };
    return slots;
  }, [cfg.fileSlots, outsidePH]);

  const onChangeField = (name, value) =>
    setFormData((p) => ({ ...p, [name]: value }));

  const onChangeProxy = (name, value) =>
    setProxyRequestee((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const f of cfg.fields) {
      if (f.required && !String(formData[f.name] || "").trim()) {
        notify(`${f.label} is required`, { type: "warning" });
        return;
      }
      if (f.type === "email" && String(formData[f.name] || "").trim() && !emailRegex.test(String(formData[f.name]).trim())) {
        notify(`${f.label} must be a valid email address`, { type: "warning" });
        return;
      }
    }

    if (proxyMode) {
      const hasName = String(proxyRequestee.firstName || "").trim() && String(proxyRequestee.lastName || "").trim();
      if (!hasName) {
        notify("Requestor First Name and Last Name are required", { type: "warning" });
        return;
      }
      const requiredNonNameFields = [
        ["email", "Requestor Email"],
      ];
      for (const [key, label] of requiredNonNameFields) {
        if (!String(proxyRequestee[key] || "").trim()) {
          notify(`${label} is required`, { type: "warning" });
          return;
        }
      }
    }

    for (let i = 0; i < fileSlots.length; i++) {
      if (fileSlots[i].required && !files[i]) {
        notify(`${fileSlots[i].label} is required`, { type: "warning" });
        return;
      }
    }

    const selectedFiles = files.filter(Boolean);
    if (selectedFiles.length === 0) {
      notify("Please upload at least 1 requirement file.", { type: "warning" });
      return;
    }

    if (!proxyMode) {
      if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
        notify("Please draw your e-signature before submitting.", { type: "warning" });
        return;
      }
      if (!accepted) {
        notify("Please confirm the declaration before submitting.", { type: "warning" });
        return;
      }
    }

    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    try {
      const selectedFiles = files.filter(Boolean);
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const proxyFullName = proxyMode
        ? `${proxyRequestee.firstName}${proxyRequestee.middleInitial?.trim() ? " " + proxyRequestee.middleInitial.trim().charAt(0).toUpperCase() + "." : ""} ${proxyRequestee.lastName}`.trim()
        : "";
      const requestSubjectName = proxyMode
        ? proxyFullName || user?.name || "Proxy Requestor"
        : user?.name || "Unknown Student";
      const requestFolder = getDateRequestFolder();

      const uploaded = await uploadRequirements(selectedFiles, "agreement", requestSubjectName, requestFolder);

      let uploadIndex = 0;
      const predocs = files
        .map((f, i) => {
          if (!f) return null;
          const meta = uploaded[uploadIndex++];
          return { ...meta, requirementLabel: fileSlots[i]?.label || `File ${i + 1}` };
        })
        .filter(Boolean);

      let authorizerSigUrl = "";
      let authorizerSigPath = "";
      if (!proxyMode && !sigPadRef.current.isEmpty()) {
        const sigDataUrl = sigPadRef.current.getDataUrl();
        const sigResult = await uploadSignatureImage(sigDataUrl, "agreement", requestSubjectName, requestFolder, "authorizer_sig.png");
        authorizerSigUrl = sigResult.url;
        authorizerSigPath = sigResult.path;
      }

      await createRequest({
        type: "agreement",
        formData: { ...formData, outsidePH },
        predocs,
        authorizerSigUrl,
        authorizerSigPath,
        ...(proxyMode ? { proxyRequestee: { ...proxyRequestee, fullName: proxyFullName } } : {}),
      });

      notify(proxyMode ? "Proxy agreement request submitted." : "Agreement request submitted!", { type: "success", title: "Submitted" });
      navigate(fallbackPath);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to submit Agreement request", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

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
          <h2 className="request-form-title">Request Form</h2>
          <div />
        </div>

        {/* Section 1: Representative Data */}
        <div className="request-section">
          <div className="request-section-title">Representative Information</div>
          {/* Name fields — single row */}
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
                          required={f.required}
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
                        type={f.type || "text"}
                        value={formData[f.name] || ""}
                        onChange={(e) => onChangeField(f.name, e.target.value)}
                        required={f.required}
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

          {proxyMode && (
            <>
              <div className="request-section-title" style={{ marginTop: 10 }}>Requestor Details (F2F Walk-in)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 0.55fr 1fr", gap: 8 }}>
                <div className="fl-wrap">
                  <input className="fl-input request-input" placeholder=" " value={proxyRequestee.firstName} onChange={(e) => onChangeProxy("firstName", e.target.value)} required />
                  <label className="fl-label">First Name</label>
                </div>
                <div className="fl-wrap">
                  <input className="fl-input request-input" placeholder=" " value={proxyRequestee.middleInitial} onChange={(e) => onChangeProxy("middleInitial", e.target.value)} />
                  <label className="fl-label">Middle Name</label>
                </div>
                <div className="fl-wrap">
                  <input className="fl-input request-input" placeholder=" " value={proxyRequestee.lastName} onChange={(e) => onChangeProxy("lastName", e.target.value)} required />
                  <label className="fl-label">Last Name</label>
                </div>
              </div>
              <div className="fl-wrap">
                <input className="fl-input request-input" type="email" placeholder=" " value={proxyRequestee.email} onChange={(e) => onChangeProxy("email", e.target.value)} required />
                <label className="fl-label">Requestor Email</label>
              </div>
            </>
          )}

        </div>

        {/* Section 2: Requirements */}
        <div className="request-section">
          <div className="request-section-title">Requirements (Agreement)</div>
          {/* Outside Philippines checkbox — affects first requirement label */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              id="outsidePH"
              checked={outsidePH}
              onChange={(e) => setOutsidePH(e.target.checked)}
              style={{ width: 16, height: 16, flexShrink: 0, cursor: "pointer", accentColor: "var(--primary)" }}
            />
            <label htmlFor="outsidePH" style={{ cursor: "pointer", fontSize: 13, color: "var(--text-primary)", margin: 0 }}>
              The requestor is located outside of the Philippines
            </label>
          </div>
          {outsidePH && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -6, paddingLeft: 26 }}>
              The authorization letter must be consular-notarized (apostilled or authenticated by the Philippine Embassy/Consulate).
            </div>
          )}
          {files.map((file, index) => (
            <div key={index} className="request-file-row">
              <div className="request-file-info">
                <div className="request-file-title">
                  {fileSlots[index]?.label || `Attach file ${index + 1}`}
                  {fileSlots[index]?.required ? " *" : ""}
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

        {/* Section 3: E-Signature */}
        <div className="request-section">
          {proxyMode ? (
            <div className="info-banner info-banner--info" style={{ marginBottom: 0 }}>
              <strong>F2F Walk-in (Proxy Request)</strong>
              <p>Digital signatures are bypassed for face-to-face walk-ins. The document will be printed for a physical wet signature.</p>
            </div>
          ) : (
            <>
              <div className="request-section-title">Your E-Signature *</div>
              <p className="request-sig-hint">Draw your signature below. It will be embedded in the agreement document.</p>
              <SignaturePad ref={sigPadRef} height={160} />
            </>
          )}
        </div>

        {/* Confirmation clause */}
        {!proxyMode && (
          <label className="request-accept">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            <span>
              I confirm that all information and attachments I have provided are accurate and complete,
              and I consent to the processing of my personal data by the Data Protection Office for the purpose of this request.
            </span>
          </label>
        )}

        <div className="request-form-actions">
          <button type="submit" className="request-form-submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>

      <AnimatePresence>
        {showConfirm && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
              <h3 className="modal-title">Submit Agreement Request</h3>
              <p className="modal-text">Please confirm that all information and attachments are accurate before submitting.</p>
              <div className="modal-actions">
                <button className="ui-btn ui-btn--secondary" onClick={() => setShowConfirm(false)} disabled={submitting}>Cancel</button>
                <button className="ui-btn ui-btn--primary" onClick={handleConfirmSubmit} disabled={submitting}>{submitting ? "Submitting…" : "Submit"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
