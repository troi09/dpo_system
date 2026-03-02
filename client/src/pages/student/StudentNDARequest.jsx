import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FIELDS_FILE_SLOTS_CONFIG } from "../../config/fieldsFileSlotsConfig";
import { createRequest } from "../../services/requestService";
import { uploadRequirements, getDateRequestFolder } from "../../services/firebaseStorageService";

const formStyle = {
  padding: "30px",
  borderRadius: "8px",
  width: "520px",
  textAlign: "center",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
};
const inputStyle = { width: "100%", padding: "10px", margin: "10px 0" };
const reqWrapStyle = { textAlign: "left", marginTop: "10px" };
const fileLabelStyle = { display: "block", fontSize: "13px", marginBottom: "4px" };
const selectedFileStyle = { fontSize: "13px", marginTop: "4px", opacity: 0.85 };
const submitBtnStyle = { width: "100%", padding: "10px", marginTop: "16px" };

export default function StudentNDARequest({ ndaType }) {
  const navigate = useNavigate();
  const cfg = useMemo(() => FIELDS_FILE_SLOTS_CONFIG.nda[ndaType], [ndaType]);

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
      alert("Please upload at least 1 file.");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user") || "null");
    const studentName = user?.name || "Unknown Student";
    const requestFolder = getDateRequestFolder();

    const uploaded = await uploadRequirements(selectedFiles, "nda", studentName, requestFolder);

    let uploadIndex = 0;
    const predocs = files
      .map((f, i) => {
        if (!f) return null;
        const meta = uploaded[uploadIndex++];
        return { ...meta, requirementLabel: cfg.fileSlots[i]?.label || `File ${i + 1}` };
      })
      .filter(Boolean);

    await createRequest({
      type: "nda",
      formData: { ...formData, ndaType, ndaTypeLabel: cfg.label },
      predocs,
    });

    alert("Request submitted!");
    navigate("/student");
  };

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
      
      <h2>{`NDA Request - ${cfg.label}`}</h2>

      {cfg.fields.map((f) => (
        <div key={f.name} style={{ textAlign: "left" }}>
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

      <div style={reqWrapStyle}>
        <h4 style={{ margin: 0 }}>Requirements (NDA)</h4>
        <ul style={{ marginTop: "6px", fontSize: "13px", opacity: 0.85 }}>
          {cfg.fileSlots.map((s, i) => (
            <li key={i}>{s.label}</li>
          ))}
        </ul>

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

            {file && <div style={selectedFileStyle}>Selected: {file.name}</div>}
          </div>
        ))}
      </div>

      <button type="submit" style={submitBtnStyle}>
        Submit NDA Request
      </button>
    </form>
  );
}