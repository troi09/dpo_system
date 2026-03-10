import { useNavigate } from "react-router-dom";
import { FileText, ShieldCheck } from "lucide-react";
import "../../components/TypeChooser.css";

export default function StudentNewRequest() {
  const navigate = useNavigate();

  return (
    <div className="type-chooser-page">
      <h2 className="type-chooser-heading">What type of request would you like to submit?</h2>
      <div className="type-chooser-grid">
        <button
          type="button"
          className="type-chooser-card-btn"
          onClick={() => navigate("/student/new-request/nda")}
        >
          <ShieldCheck size={48} strokeWidth={1.5} className="type-chooser-card-icon" />
          <span className="type-chooser-card-label">Non-Disclosure Agreement</span>
        </button>

        <button
          type="button"
          className="type-chooser-card-btn"
          onClick={() => navigate("/student/new-request/agreement")}
        >
          <FileText size={48} strokeWidth={1.5} className="type-chooser-card-icon" />
          <span className="type-chooser-card-label">Agreement</span>
        </button>
      </div>
    </div>
  );
}