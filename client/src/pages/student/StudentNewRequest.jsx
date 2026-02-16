import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function StudentNewRequest() {
  const navigate = useNavigate();
  const [type, setType] = useState("nda");

  const handleContinue = (e) => {
    e.preventDefault();
    navigate(`/student/new-request/${type}`);
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>New Request</h2>

      <form onSubmit={handleContinue} style={{ maxWidth: 420 }}>
        <label style={{ display: "block", marginTop: 12 }}>Choose request form</label>

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 8 }}
        >
          <option value="nda">NDA</option>
          <option value="agreement">Agreement</option>
        </select>

        <button type="submit" style={{ width: "100%", padding: 10, marginTop: 16 }}>
          Continue
        </button>
      </form>
    </div>
  );
}
