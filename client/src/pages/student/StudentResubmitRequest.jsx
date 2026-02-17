import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { resubmitRequest, getRequestById } from "../../services/requestService";
import { uploadRequirements, getDateRequestFolder } from "../../services/firebaseStorageService";

const getInitialFolderFromPath = (path = "") => {
  // expected: <slug>/requests/<type>/<date_timestamp>/...
  const parts = String(path).split("/");
  return parts[3] || "";
};

export default function StudentResubmitRequest() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [reqData, setReqData] = useState(null);
  const [purpose, setPurpose] = useState("");
  const [details, setDetails] = useState("");
  const [files, setFiles] = useState([null, null, null]);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await getRequestById(id);
        setReqData(r);
        setPurpose(r.formData?.purpose || "");
        setDetails(r.formData?.details || "");
      } catch (err) {
        alert(err.response?.data?.message || "Failed to load request");
        navigate("/student");
      }
    };
    load();
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reqData) return;

    try {
      const selectedFiles = files.filter(Boolean);
      if (selectedFiles.length === 0) {
        alert("Please upload at least 1 requirement file.");
        return;
      }

      const user = JSON.parse(localStorage.getItem("user") || "null");
      const studentName = user?.name || "Unknown Student";

      const basePath = reqData.requirements?.[0]?.path || "";
      const initialFolder = getInitialFolderFromPath(basePath);
      if (!initialFolder) {
        alert("Missing original request folder. (No existing file path found)");
        return;
      }

      // creates: <initialFolder>/resubM-D-YYYY_HHMM/
      const resubFolder = `resub${getDateRequestFolder()}`;
      const uploaded = await uploadRequirements(
        selectedFiles,
        reqData.requestType,
        studentName,
        `${initialFolder}/${resubFolder}`
      );

      await resubmitRequest(id, {
        formData: { purpose, details },
        requirements: uploaded, // replaces old files in MongoDB
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

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: "30px",
        borderRadius: "8px",
        width: "520px",
        textAlign: "center",
      }}
    >
      <h2>Resubmit {reqData.requestType === "nda" ? "NDA" : "Agreement"} Request</h2>

      <div style={{ textAlign: "left", marginTop: "10px" }}>
        <h4 style={{ margin: "0 0 6px 0" }}>Admin Remarks</h4>
        <div style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "6px" }}>
          {reqData.adminRemarks || "No remarks provided."}
        </div>
      </div>

      <input
        type="text"
        placeholder="Purpose"
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
        required
        style={{ width: "100%", padding: "10px", margin: "14px 0 10px" }}
      />

      <textarea
        placeholder="Details (optional)"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        rows={4}
        style={{ width: "100%", padding: "10px", margin: "10px 0" }}
      />

      <div style={{ textAlign: "left", marginTop: "10px" }}>
        <h4 style={{ margin: 0 }}>Upload Revised Requirements</h4>

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
            </div>
          ))}
        </div>
      </div>

      <button type="submit" style={{ width: "100%", padding: "10px", marginTop: "16px" }}>
        Submit Resubmission
      </button>
    </form>
  );
}
