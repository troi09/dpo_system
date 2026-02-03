import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRequest } from "../../services/requestService";

const StudentNewRequest = () => {
  const navigate = useNavigate();

  const [requestType, setRequestType] = useState("nda");
  const [purpose, setPurpose] = useState("");
  const [details, setDetails] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await createRequest({
        requestType,
        formData: { purpose, details },
      });

      alert("Request submitted!");
      navigate("/student");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit request");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: "30px",
        borderRadius: "8px",
        width: "420px",
        textAlign: "center",
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
      }}
    >
      <h2>New Request</h2>

      <select
        value={requestType}
        onChange={(e) => setRequestType(e.target.value)}
        style={{ width: "100%", padding: "10px", margin: "10px 0" }}
      >
        <option value="nda">Non-Disclosure Agreement (NDA)</option>
        <option value="authorization">Authorization Agreement</option>
      </select>

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

      <button type="submit" style={{ width: "100%", padding: "10px" }}>
        Submit Request
      </button>
    </form>
  );
};

export default StudentNewRequest;
