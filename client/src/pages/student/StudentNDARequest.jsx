import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FIELDS_FILE_SLOTS_CONFIG } from "../../config/fieldsFileSlotsConfig";
import { createRequest } from "../../services/requestService";
import { uploadRequirements, uploadSignatureImage, getDateRequestFolder } from "../../services/firebaseStorageService";
import SignaturePad from "../../components/SignaturePad";
import "../../components/RequestForm.css";

export default function StudentNDARequest({ ndaType, proxyMode = false, fallbackPath = "/student" }) {
  const navigate = useNavigate();
  const cfg = useMemo(() => FIELDS_FILE_SLOTS_CONFIG.nda[ndaType], [ndaType]);

  const [formData, setFormData] = useState(() => ({}));
  const [proxyRequestee, setProxyRequestee] = useState({
    fullName: "",
    email: "",
    idNumber: "",
    departmentOrOrganization: "",
  });
  const [files, setFiles] = useState(() => Array(cfg.fileSlots.length).fill(null));
  const [submitting, setSubmitting] = useState(false);
  const sigPadRef = useRef(null);

  const onChangeField = (name, value) =>
    setFormData((p) => ({ ...p, [name]: value }));

  const onChangeProxy = (name, value) =>
    setProxyRequestee((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    for (const f of cfg.fields) {
      if (f.required && !String(formData[f.name] || "").trim()) {
        alert(`${f.label} is required`);
        return;
      }
    }

    if (proxyMode) {
      const requiredProxyFields = [
        ["fullName", "Requestee Full Name"],
        ["email", "Requestee Email"],
        ["idNumber", "Requestee ID Number"],
        ["departmentOrOrganization", "Requestee Department/Organization"],
      ];
      for (const [key, label] of requiredProxyFields) {
        if (!String(proxyRequestee[key] || "").trim()) {
          alert(`${label} is required`);
          return;
        }
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
      alert("Please draw your e-signature before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const requestSubjectName = proxyMode
        ? proxyRequestee.fullName.trim() || user?.name || "Proxy Requestee"
        : user?.name || "Unknown Student";
      const requestFolder = getDateRequestFolder();

      const uploaded = await uploadRequirements(selectedFiles, "nda", requestSubjectName, requestFolder);

      let uploadIndex = 0;
      const predocs = files
        .map((f, i) => {
          if (!f) return null;
          const meta = uploaded[uploadIndex++];
          return { ...meta, requirementLabel: cfg.fileSlots[i]?.label || `File ${i + 1}` };
        })
        .filter(Boolean);

      // Upload student e-signature
      const sigDataUrl = sigPadRef.current.getDataUrl();
      const { url: studentSigUrl, path: studentSigPath } = await uploadSignatureImage(
        sigDataUrl,
        "nda",
        requestSubjectName,
        requestFolder,
        "student_sig.png"
      );

      await createRequest({
        type: "nda",
        formData: { ...formData, ndaType, ndaTypeLabel: cfg.label },
        predocs,
        studentSigUrl,
        studentSigPath,
        ...(proxyMode ? { proxyRequestee } : {}),
      });

      alert(proxyMode ? "Proxy NDA request submitted." : "Request submitted!");
      navigate(fallbackPath);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit request");
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
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate("/student");
            }}
          >
            ‹ Back
          </button>
          <h2 className="request-form-title">{`NDA Request - ${cfg.label}`}</h2>
          <div />
        </div>

        <div className="request-form-body">
          <div className="request-left-col">
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

              {proxyMode && (
                <>
                  <div className="request-section-title" style={{ marginTop: 10 }}>Requestee Details (F2F Walk-in)</div>
                  <div className="request-field">
                    <label className="request-label">Requestee Full Name</label>
                    <input className="request-input" value={proxyRequestee.fullName} onChange={(e) => onChangeProxy("fullName", e.target.value)} required />
                  </div>
                  <div className="request-field">
                    <label className="request-label">Requestee Email</label>
                    <input className="request-input" type="email" value={proxyRequestee.email} onChange={(e) => onChangeProxy("email", e.target.value)} required />
                  </div>
                  <div className="request-field">
                    <label className="request-label">Requestee ID Number</label>
                    <input className="request-input" value={proxyRequestee.idNumber} onChange={(e) => onChangeProxy("idNumber", e.target.value)} required />
                  </div>
                  <div className="request-field">
                    <label className="request-label">Requestee Department/Organization</label>
                    <input className="request-input" value={proxyRequestee.departmentOrOrganization} onChange={(e) => onChangeProxy("departmentOrOrganization", e.target.value)} required />
                  </div>
                </>
              )}
            </div>

            <div className="request-section">
              <div className="request-section-title">{proxyMode ? "Requestee E-Signature *" : "Your E-Signature *"}</div>
              <p className="request-sig-hint">
                {proxyMode
                  ? "Capture the walk-in requestee signature below. It will be embedded in the NDA document."
                  : "Draw your signature below. It will be embedded in the NDA document."}
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

          <div className="request-section">
            <div className="request-section-title">Requirements (NDA)</div>
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
          <button type="submit" className="request-form-submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  );
}