import { useNavigate } from "react-router-dom";
import { FileSignature } from "lucide-react";
import "../../components/TypeChooser.css";

export default function StudentAgreementRequirements({
  formPath = "/student/new-request/agreement/form",
  fallbackPath = "/student",
}) {
  const navigate = useNavigate();

  return (
    <div className="type-chooser-page">
      <button
        type="button"
        className="type-chooser-back"
        onClick={() => {
          if (window.history.length > 1) navigate(-1);
          else navigate(fallbackPath);
        }}
      >
        ‹ Back
      </button>

      <div className="type-chooser-grid">
        <button
          type="button"
          className="type-chooser-card-btn type-chooser-card-btn--detailed"
          onClick={() => navigate(formPath)}
        >
          <FileSignature size={48} strokeWidth={1.5} className="type-chooser-card-icon" />
          <span className="type-chooser-card-label">Agreement</span>
          <span className="type-chooser-card-subtext">
            For assigning a representative to act on your behalf in data-related agreements with the DPO.
          </span>
          <span className="type-chooser-req-title">Requestee Requirements:</span>
          <ul className="type-chooser-req-list" aria-label="Requestee requirements">
            <li>Notarized Authorization Letter</li>
            <li>Government Issued Valid ID</li>
          </ul>
          <span className="type-chooser-req-title">Representative Requirements:</span>
          <ul className="type-chooser-req-list" aria-label="Representative requirements">
            <li>Government Issued Valid ID</li>
          </ul>
          <span className="type-chooser-card-subtext" style={{ marginTop: 8, fontStyle: "italic" }}>
            Click to continue to the form →
          </span>
        </button>
      </div>
    </div>
  );
}
