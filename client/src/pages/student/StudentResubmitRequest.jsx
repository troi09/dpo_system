import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FIELDS_FILE_SLOTS_CONFIG } from "../../config/fieldsFileSlotsConfig";
import { getRequestById, resubmitRequest } from "../../services/requestService";
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

const getInitialFolderFromPath = (path = "") => {
  // expected: <name>/requests/<type>/<date_timestamp>/...
  const parts = String(path).split("/");
  return parts[3] || "";
};

export default function StudentResubmitRequest() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [reqData, setReqData] = useState(null);
  const [formData, setFormData] = useState({});
  const [files, setFiles] = useState([]);

  const ndaType = reqData?.formData?.ndaType || "";

  const cfg = useMemo(() => {
    if (!reqData) return null;
    if (reqData.requestType === "agreement") return FIELDS_FILE_SLOTS_CONFIG.agreement;
    if (reqData.requestType === "nda") return FIELDS_FILE_SLOTS_CONFIG.nda[ndaType];
    return null;
  }, [reqData, ndaType]);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await getRequestById(id);
        setReqData(r);

        // preload existing form data
        setFormData(r.formData || {});
      } catch (err) {
        alert(err.response?.data?.message || "Failed to load request");
        navigate("/student");
      }
    };
    load();
  }, [id, navigate]);

  useEffect(() => {
    if (!cfg) return;
    setFiles(Array(cfg.fileSlots.length).fill(null));
  }, [cfg]);

  const onChangeField = (name, value) =>
    setFormData((p) => ({ ...p, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reqData || !cfg) return;

    try {
      // required fields
      for (const f of cfg.fields) {
        if (f.required && !String(formData[f.name] || "").trim()) {
          alert(`${f.label} is required`);
          return;
        }
      }

      // required file slots
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

      // determine original date_timestamp folder from existing requirement path
      const basePath = reqData.requirements?.[0]?.path || "";
      const initialFolder = getInitialFolderFromPath(basePath);
      if (!initialFolder) {
        alert("Missing original request folder. (No existing file path found)");
        return;
      }

      // create new resub folder inside original folder
      const resubFolder = `resub${getDateRequestFolder()}`;

      const uploaded = await uploadRequirements(
        selectedFiles,
        reqData.requestType,
        studentName,
        `${initialFolder}/${resubFolder}`
      );

      // attach requirementLabel based on slot position, preserving slot meaning
      let uploadIndex = 0;
      const requirements = files
        .map((f, i) => {
          if (!f) return null;
          const meta = uploaded[uploadIndex++];
          return { ...meta, requirementLabel: cfg.fileSlots[i]?.label || `File ${i + 1}` };
        })
        .filter(Boolean);

      await resubmitRequest(id, {
        formData,
        requirements, // replaces old
      });

      alert("Resubmitted! Status is now pending.");
      navigate("/student");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to resubmit");
    }
  };

  if (!reqData) return null;

  if (reqData.status !== "revision_required") {
    return (
      <div style={{ width: "520px", textAlign: "center" }}>
        <h3>Resubmit not available</h3>
        <p>This request is not marked as revision required.</p>
      </div>
    );
  }

  if (!cfg) {
    return (
      <div style={{ width: "520px", textAlign: "center" }}>
        <h3>Invalid request config</h3>
        <p>Could not find matching fields/requirements config for this request.</p>
      </div>
    );
  }

  const title =
    reqData.requestType === "agreement"
      ? "Resubmit Agreement Request"
      : `Resubmit NDA Request - ${cfg.label}`;

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <h2>{title}</h2>

      <div style={{ textAlign: "left", marginTop: "10px" }}>
        <h4 style={{ margin: "0 0 6px 0" }}>Admin Remarks</h4>
        <div style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "6px" }}>
          {reqData.adminRemarks || "No remarks provided."}
        </div>
      </div>

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
        <h4 style={{ margin: 0 }}>
          Upload Revised Requirements ({reqData.requestType === "agreement" ? "Agreement" : "NDA"})
        </h4>

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
        Submit Resubmission
      </button>
    </form>
  );
}
