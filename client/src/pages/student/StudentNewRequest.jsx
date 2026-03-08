import { useNavigate } from "react-router-dom";
import AITriageChat from "../../components/AITriageChat";
import "../../components/TypeChooser.css";

export default function StudentNewRequest() {
  const navigate = useNavigate();

  return (
    <div className="type-chooser-page">
      <div className="type-chooser-card">
        <h2 className="type-chooser-title">Request Type</h2>

        <button
          type="button"
          className="type-chooser-option"
          onClick={() => navigate("/student/new-request/nda")}
        >
          Non-Disclosure Agreement
          <span className="type-chooser-arrow">›</span>
        </button>

        <button
          type="button"
          className="type-chooser-option"
          onClick={() => navigate("/student/new-request/agreement")}
        >
          Agreement
          <span className="type-chooser-arrow">›</span>
        </button>
      </div>

      <div style={{ marginTop: "24px", maxWidth: "560px", width: "100%" }}>
        <AITriageChat />
      </div>
    </div>
  );
}