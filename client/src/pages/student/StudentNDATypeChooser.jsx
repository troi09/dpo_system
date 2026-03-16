import { useNavigate } from "react-router-dom";
import { FlaskConical, Users } from "lucide-react";
import "../../components/TypeChooser.css";

export default function StudentNDATypeChooser({
  basePath = "/student/new-request/nda",
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

      <h2 className="type-chooser-heading">Choose your NDA category</h2>

      <div className="type-chooser-grid">
        <button
          type="button"
          className="type-chooser-card-btn type-chooser-card-btn--detailed"
          onClick={() => navigate(`${basePath}/orgactivities`)}
        >
          <Users size={48} strokeWidth={1.5} className="type-chooser-card-icon" />
          <span className="type-chooser-card-label">School Organization Activities/Projects</span>
          <span className="type-chooser-card-subtext">
            For student organization events or partner engagements involving confidential documents.
          </span>
          <span className="type-chooser-req-title">Required Documents:</span>
          <ul className="type-chooser-req-list" aria-label="School organization NDA requirements">
            <li>Project concept paper or activity proposal</li>
            <li>Endorsement from adviser or organization head</li>
            <li>List of members or partner entities involved</li>
            <li>Supporting materials containing confidential data scope</li>
          </ul>
        </button>

        <button
          type="button"
          className="type-chooser-card-btn type-chooser-card-btn--detailed"
          onClick={() => navigate(`${basePath}/research`)}
        >
          <FlaskConical size={48} strokeWidth={1.5} className="type-chooser-card-icon" />
          <span className="type-chooser-card-label">Conduct of Research within RTU</span>
          <span className="type-chooser-card-subtext">
            For thesis, capstone, or research involving sensitive data or unpublished findings.
          </span>
          <span className="type-chooser-req-title">Required Documents:</span>
          <ul className="type-chooser-req-list" aria-label="Research NDA requirements">
            <li>Research proposal or approved synopsis</li>
            <li>Endorsement from research adviser or panel</li>
            <li>Data collection instruments or protocol</li>
            <li>Ethics clearance or equivalent approval, if applicable</li>
          </ul>
        </button>
      </div>
    </div>
  );
}