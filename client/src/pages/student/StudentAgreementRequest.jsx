import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FIELDS_FILE_SLOTS_CONFIG } from "../../config/fieldsFileSlotsConfig";
import { createRequest } from "../../services/requestService";
import {
  uploadRequirements,
  uploadSignatureImage,
  getDateRequestFolder,
} from "../../services/firebaseStorageService";
import SignaturePad from "../../components/SignaturePad";
import "../../components/RequestForm.css";

// Standard authorization label vs. consular notarized (overseas)
const AUTH_LABEL_STANDARD  = "Notarized Authorization Letter";
const AUTH_LABEL_CONSULAR  = "Consular Notarized Authorization Letter";

export default function StudentAgreementRequest() {
  const navigate = useNavigate();
  const cfg = useMemo(() => FIELDS_FILE_SLOTS_CONFIG.agreement, []);

  const [formData, setFormData] = useState({});
  const [outsidePhilippines, setOutsidePhilippines] = useState(false);
  const [files, setFiles] = useState(() => Array(cfg.fileSlots.length).fill(null));
  const [submitting, setSubmitting] = useState(false);
  const sigPadRef = useRef(null);

  const onChangeField = (name, value) =>
    setFormData((p) => ({ ...p, [name]: value }));

  // Replace the first slot label dynamically
  const fileSlots = cfg.fileSlots.map((slot, i) => {
    if (i === 0) {
      return { ...slot, label: outsidePhilippines ? AUTH_LABEL_CONSULAR : AUTH_LABEL_STANDARD };
    }
    return slot;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    for (const f of cfg.fields) {
      if (f.required && !String(formData[f.name] || "").trim()) {
        alert(`${f.label} is required`);
        return;
      }
    }

    for (let i = 0; i < fileSlots.length; i++) {
      if (fileSlots[i].required && !files[i]) {
        alert(`${fileSlots[i].label} is required`);
        return;
      }
    }

    const selectedFiles = files.filter(Boolean);
    if (selectedFiles.length === 0) {
      alert("Please upload at least 1 requirement file.");
      return;
    }

    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      alert("Please draw your e-signature before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const studentName = user?.name || "Unknown Student";
      const requestFolder = getDateRequestFolder();

      const uploaded = await uploadRequirements(selectedFiles, "agreement", studentName, requestFolder);

      let uploadIndex = 0;
      const predocs = files
        .map((f, i) => {
          if (!f) return null;
          const meta = uploaded[uploadIndex++];
          return { ...meta, requirementLabel: fileSlots[i]?.label || `File ${i + 1}` };
        })
        .filter(Boolean);

      // Upload authorizer (student) e-signature temporarily
      const sigDataUrl = sigPadRef.current.getDataUrl();
      const { url: authorizerSigUrl, path: authorizerSigPath } = await uploadSignatureImage(
        sigDataUrl,
        "agreement",
        studentName,
        requestFolder,
        "authorizer_sig.png"
      );

      await createRequest({
        type: "agreement",
        formData: { ...formData, outsidePhilippines },
        predocs,
        authorizerSigUrl,
        authorizerSigPath,
      });

      alert("Agreement request submitted!");
      navigate("/student");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit Agreement request");
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
          <h2 className="request-form-title">Agreement Request</h2>
          <div />
        </div>

        <div className="request-form-body">
          <div className="request-section">
            <div className="request-section-title">Data</div>

            {/* Outside Philippines checkbox */}
            <div className="request-field" style={{ marginBottom: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={outsidePhilippines}
                  onChange={(e) => {
                    setOutsidePhilippines(e.target.checked);
                    setFiles((prev) => prev.map(() => null)); // reset files when toggling
                  }}
                  style={{ width: 16, height: 16, accentColor: "#0f2d6b" }}
                />
                <span style={{ fontSize: 14, color: "#0f2d6b", fontWeight: 600 }}>
                  Is the requestee located outside of the Philippines?
                </span>
              </label>
              {outsidePhilippines && (
                <p style={{ margin: "8px 0 0 26px", fontSize: 13, color: "#b45309", background: "#fffbeb", padding: "8px 12px", borderRadius: 8, border: "1px solid #fde68a" }}>
                  A <strong>Consular Notarized Authorization Letter</strong> is required in place of a standard Notarized Authorization Letter.
                </p>
              )}
            </div>

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
            <div className="request-section-title">Requirements (Agreement)</div>
            {fileSlots.map((slot, index) => (
              <div key={index} className="request-file-row">
                <div className="request-file-info">
                  <div className="request-file-title">
                    {slot.label}{slot.required ? " *" : ""}
                  </div>
                  <div className="request-file-subtitle">
                    {files[index] ? files[index].name : "No file selected"}
                  </div>
                </div>
                <label className="request-file-action">
                  Upload File
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

          <div className="request-section">
            <div className="request-section-title">Your E-Signature *</div>
            <p className="request-sig-hint">
              Draw your signature below. It will be embedded in the agreement document.
            </p>
            <SignaturePad ref={sigPadRef} height={150} />
            <button
              type="button"
              className="request-sig-clear"
              onClick={() => sigPadRef.current?.clear()}
            >
              Clear Signature
            </button>
          </div>
        </div>

        <div className="request-form-actions">
<<<<<<< HEAD
          <button type="submit" className="request-form-submit">Submit Request</button>
=======
          <button type="submit" className="request-form-submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
>>>>>>> origin/Branch-ni-Kurl!
        </div>
      </form>
    </div>
  );
}
