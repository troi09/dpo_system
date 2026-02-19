import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function StudentNDATypeChooser() {
  const navigate = useNavigate();
  const [ndaType, setNdaType] = useState("orgactivities");

  const handleContinue = (e) => {
    e.preventDefault();
    navigate(`/student/new-request/nda/${ndaType}`);
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>NDA Type</h2>

      <form onSubmit={handleContinue} style={{ maxWidth: 420 }}>
        <label style={{ display: "block", marginTop: 12 }}>Choose NDA type</label>

        <select
          value={ndaType}
          onChange={(e) => setNdaType(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 8 }}
        >
          <option value="orgactivities">Student Organization Activities</option>
          <option value="research">Conduct of Research</option>
        </select>

        <button type="submit" style={{ width: "100%", padding: 10, marginTop: 16 }}>
          Continue
        </button>
      </form>
    </div>
  );
}
