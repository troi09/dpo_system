import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FIELDS_FILE_SLOTS_CONFIG } from "../../config/fieldsFileSlotsConfig";
import { createRequest } from "../../services/requestService";
import { uploadRequirements, getDateRequestFolder } from "../../services/firebaseStorageService";
import "../../components/RequestForm.css";

export default function StudentAgreementRequest() {
  const navigate = useNavigate();
  const cfg = useMemo(() => FIELDS_FILE_SLOTS_CONFIG.agreement, []);

  const [formData, setFormData] = useState(() => ({}));
  const [files, setFiles] = useState(() => Array(cfg.fileSlots.length).fill(null));

  const onChangeField = (name, value) =>
    setFormData((p) => ({ ...p, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

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
      alert("Please upload at least 1 requirement file.");
      return;
    }

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
          return { ...meta, requirementLabel: cfg.fileSlots[i]?.label || `File ${i + 1}` };
        })
        .filter(Boolean);

      await createRequest({
        type: "agreement",
        formData,
        predocs,
      });

      alert("Agreement request submitted!");
      navigate("/student");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit Agreement request");
    }
  };

  return (
    <div className="request-form-page">
      <form onSubmit={handleSubmit} className="request-form-card">
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
          <h2 className="request-form-title">Agreement Request</h2>
          <div />
        </div>

        <div className="request-form-body">
          <div className="request-section">
            <div className="request-section-title">Data</div>
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
                  Upload File
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
          </div>
        </div>

        <div className="request-form-actions">
          <button type="submit" className="request-form-submit">
            Submit Request
          </button>
        </div>
      </form>
    </div>
  );
}