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
import { notify } from "../../utils/inPageFeedback";
import "../../components/RequestForm.css";

export default function StudentAgreementRequest({ proxyMode = false, fallbackPath = "/student/new-request/agreement" }) {
  const navigate = useNavigate();
  const cfg = useMemo(() => FIELDS_FILE_SLOTS_CONFIG.agreement, []);

  const [formData, setFormData] = useState(() => ({}));
  const [proxyRequestee, setProxyRequestee] = useState({
    firstName: "",
    middleInitial: "",
    lastName: "",
    email: "",
    idNumber: "",
    departmentOrOrganization: "",
  });
  const [files, setFiles] = useState(() => Array(cfg.fileSlots.length).fill(null));
  const [outsidePH, setOutsidePH] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const sigPadRef = useRef(null);

  // Derive fileSlots with dynamic first-slot label when requestee is outside PH
  const fileSlots = useMemo(() => {
    const slots = [...cfg.fileSlots];
    if (outsidePH) {
      slots[0] = { ...slots[0], label: "Consular Notarized Authorization" };
    }
    return slots;
  }, [cfg.fileSlots, outsidePH]);

  const onChangeField = (name, value) =>
    setFormData((p) => ({ ...p, [name]: value }));

  const onChangeProxy = (name, value) =>
    setProxyRequestee((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    for (const f of cfg.fields) {
      if (f.required && !String(formData[f.name] || "").trim()) {
        notify(`${f.label} is required`, { type: "warning" });
        return;
      }
    }

    if (proxyMode) {
      const hasName = String(proxyRequestee.firstName || "").trim() && String(proxyRequestee.lastName || "").trim();
      if (!hasName) {
        notify("Requestee First Name and Last Name are required", { type: "warning" });
        return;
      }
      const requiredNonNameFields = [
        ["email", "Requestee Email"],
        ["idNumber", "Requestee ID Number"],
        ["departmentOrOrganization", "Requestee Department/Organization"],
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

    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      if (!proxyMode) {
        notify("Please draw your e-signature before submitting.", { type: "warning" });
        return;
      }
    }

    setSubmitting(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const proxyFullName = proxyMode
        ? `${proxyRequestee.firstName}${proxyRequestee.middleInitial?.trim() ? " " + proxyRequestee.middleInitial.trim().charAt(0).toUpperCase() + "." : ""} ${proxyRequestee.lastName}`.trim()
        : "";
      const requestSubjectName = proxyMode
        ? proxyFullName || user?.name || "Proxy Requestee"
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

      // Upload authorizer (student) e-signature (skip for proxy/F2F – wet signature on print)
      let authorizerSigUrl = "";
      let authorizerSigPath = "";
      if (!proxyMode && !sigPadRef.current.isEmpty()) {
        const sigDataUrl = sigPadRef.current.getDataUrl();
        const sigResult = await uploadSignatureImage(
          sigDataUrl,
          "agreement",
          requestSubjectName,
          requestFolder,
          "authorizer_sig.png"
        );
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

      notify(proxyMode ? "Proxy agreement request submitted." : "Agreement request submitted!", { type: "success" });
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
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate("/student");
            }}
          >
            ‹ Back
          </button>
          <div />
        </div>

        <div className="request-form-body">
          <div className="request-section">
            <div className="request-section-title">Representative Data</div>
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
                  <label className="request-label">Requestee Name</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 0.55fr 1fr", gap: 8 }}>
                    <input
                      className="request-input"
                      placeholder="First Name"
                      value={proxyRequestee.firstName}
                      onChange={(e) => onChangeProxy("firstName", e.target.value)}
                      required
                    />
                    <input
                      className="request-input"
                      placeholder="Middle Name"
                      value={proxyRequestee.middleInitial}
                      onChange={(e) => onChangeProxy("middleInitial", e.target.value)}
                    />
                    <input
                      className="request-input"
                      placeholder="Last Name"
                      value={proxyRequestee.lastName}
                      onChange={(e) => onChangeProxy("lastName", e.target.value)}
                      required
                    />
                  </div>
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

              {/* Outside Philippines checkbox */}
              <div className="request-field" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  id="outsidePH"
                  checked={outsidePH}
                  onChange={(e) => setOutsidePH(e.target.checked)}
                  style={{ width: 16, height: 16, flexShrink: 0, cursor: "pointer", accentColor: "var(--primary)" }}
                />
                <label htmlFor="outsidePH" style={{ cursor: "pointer", fontSize: 14, color: "var(--text-primary)", margin: 0 }}>
                  The requestee is located outside of the Philippines
                </label>
              </div>
              {outsidePH && (
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -6, marginBottom: 4, paddingLeft: 26 }}>
                  The authorization letter must be consular-notarized (apostilled or authenticated by the Philippine Embassy/Consulate).
                </div>
              )}
            </div>

          <div className="request-section">
            <div className="request-section-title">Requirements (Agreement)</div>
            {files.map((file, index) => (
              <div key={index} className="request-file-row">
                <div className="request-file-info">
                  <div className="request-file-title">
                    {fileSlots[index]?.label || `Attach file ${index + 1}`}
                    {fileSlots[index]?.required ? " *" : ""}
                  </div>
                  <div className="request-file-subtitle">
                    {file ? file.name : "No file selected"}
                  </div>
                </div>

                <label className="request-file-action">
                  {file ? "Change File" : "Upload File"}
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

          <div className="request-section">
            {proxyMode ? (
              <div className="info-banner info-banner--info" style={{ marginBottom: 0 }}>
                <strong>F2F Walk-in (Proxy Request)</strong>
                <p>Digital signatures are bypassed for face-to-face walk-ins. The document will be printed for a physical wet signature.</p>
              </div>
            ) : (
              <>
                <div className="request-section-title">Your E-Signature *</div>
                <p className="request-sig-hint">
                  Draw your signature below. It will be embedded in the agreement document.
                </p>
                <SignaturePad ref={sigPadRef} height={320} />
              </>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>
            <button type="submit" className="request-form-submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
