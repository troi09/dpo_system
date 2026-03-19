import { useNavigate } from "react-router-dom";
import { FileText, ShieldCheck } from "lucide-react";
import "../../components/TypeChooser.css";

export default function StudentNewRequest({
  basePath = "/student/new-request",
  title = "What type of request would you like to submit?",
}) {
  const navigate = useNavigate();

  return (
    <div className="type-chooser-page">
      <div className="type-chooser-grid">
        <button
          type="button"
          className="type-chooser-card-btn"
          onClick={() => navigate(`${basePath}/nda`)}
        >
          <ShieldCheck size={64} strokeWidth={1.5} className="type-chooser-card-icon" />
          <span className="type-chooser-card-label">Non-Disclosure Agreement</span>
        </button>

        <button
          type="button"
          className="type-chooser-card-btn"
          onClick={() => navigate(`${basePath}/agreement`)}
        >
          <FileText size={64} strokeWidth={1.5} className="type-chooser-card-icon" />
          <span className="type-chooser-card-label">Agreement</span>
        </button>
      </div>
    </div>
  );
}