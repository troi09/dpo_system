import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRequest } from "../../services/requestService";
import { uploadRequirements, getDateRequestFolder } from "../../services/firebaseStorageService";

export default function StudentAgreementRequest() {
  const navigate = useNavigate();

  // Agreement form fields (can edit later)
  const [purpose, setPurpose] = useState("");
  const [details, setDetails] = useState("");
  const [files, setFiles] = useState([null, null, null]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const selectedFiles = files.filter(Boolean);
        if (selectedFiles.length === 0) {
          alert("Please upload at least 1 requirement file.");
          return;
        }

      const user = JSON.parse(localStorage.getItem("user") || "null");
      const studentName = user?.name || "Unknown Student";
      const requestFolder = getDateRequestFolder();
      const uploaded = await uploadRequirements(selectedFiles, "agreement", studentName, requestFolder);

      await createRequest({
        requestType: "agreement",
        formData: { purpose, details },
        requirements: uploaded,
      });

      alert("Agreement request submitted!");
      navigate("/student");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit Agreement request");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: "30px",
        borderRadius: "8px",
        width: "520px",
        textAlign: "center",
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
      }}
    >
      <h2>Agreement Request</h2>

      <input
        type="text"
        placeholder="Purpose"
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
        required
        style={{ width: "100%", padding: "10px", margin: "10px 0" }}
      />

      <textarea
        placeholder="Details (optional)"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        rows={4}
        style={{ width: "100%", padding: "10px", margin: "10px 0" }}
      />

      <div style={{ textAlign: "left", marginTop: "10px" }}>
        <h4 style={{ margin: 0 }}>Requirements (Agreement)</h4>
        <ul style={{ marginTop: "6px", fontSize: "13px", opacity: 0.85 }}>
          <li>Valid ID</li>
          <li>Signed request/authorization letter</li>
          <li>Other supporting document (if needed)</li>
        </ul>

        <div style={{ marginTop: "8px" }}>
          {files.map((file, index) => (
            <div key={index} style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>
                Attach file {index + 1}
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

              {file && (
                <div style={{ fontSize: "13px", marginTop: "4px", opacity: 0.85 }}>
                  Selected: {file.name}
                </div>
              )}
            </div>
          ))}
        </div>

        {files.filter(Boolean).length > 0 && (
          <div style={{ marginTop: "10px", fontSize: "13px" }}>
            <strong>Selected files:</strong>
            <ul>
              {files.filter(Boolean).map((f, idx) => (
                <li key={idx}>
                  {f.name} ({Math.round(f.size / 1024)} KB)
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button
        type="submit"
        style={{ width: "100%", padding: "10px", marginTop: "16px" }}
      >
        Submit Agreement Request
      </button>
    </form>
  );
}
