import { useNavigate } from "react-router-dom";
import { Building2, FlaskConical, Info } from "lucide-react";
import "../../components/TypeChooser.css";

function LoiTooltip({ content }) {
  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: 6, verticalAlign: "middle" }}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="loi-tooltip-trigger">
        <Info size={13} style={{ color: "var(--text-muted)", cursor: "pointer" }} />
        <span className="loi-tooltip-box">
          <strong style={{ display: "block", marginBottom: 4, fontSize: 11 }}>Letter of Intent should include:</strong>
          {content.map((item, i) => (
            <span key={i} style={{ display: "block", fontSize: 11, lineHeight: 1.5 }}>• {item}</span>
          ))}
        </span>
      </span>
    </span>
  );
}

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


      <div className="type-chooser-grid">
        <button
          type="button"
          className="type-chooser-card-btn type-chooser-card-btn--detailed"
          onClick={() => navigate(`${basePath}/orgactivities`)}
        >
          <Building2 size={48} strokeWidth={1.5} className="type-chooser-card-icon" />
          <span className="type-chooser-card-label">School Organization Activities/Projects</span>
          <span className="type-chooser-card-subtext">
            For student organization events or partner engagements involving confidential documents.
          </span>
          <span className="type-chooser-req-title">Requirements:</span>
          <ul className="type-chooser-req-list" aria-label="School organization NDA requirements">
            <li>Letter of Intent<LoiTooltip content={["Title of the Activity/Project", "Objectives of the Activity/Project", "Participants of the Activity/Project", "Data to be collected from the Participants", "Schedule of Activity/Project"]} /></li>
            <li>School ID</li>
            <li>Registration Form</li>
            <li>Sample Forms or Collaterals (if applicable)</li>
          </ul>
          <span className="type-chooser-card-subtext" style={{ marginTop: 8, fontStyle: "italic" }}>
            Click to continue to the form →
          </span>
        </button>

        <button
          type="button"
          className="type-chooser-card-btn type-chooser-card-btn--detailed"
          onClick={() => navigate(`${basePath}/research`)}
        >
          <FlaskConical size={48} strokeWidth={1.5} className="type-chooser-card-icon" />
          <span className="type-chooser-card-label">Conduct of Research within the University</span>
          <span className="type-chooser-card-subtext">
            For thesis, capstone, or research involving sensitive data or unpublished findings.
          </span>
          <span className="type-chooser-req-title">Requirements:</span>
          <ul className="type-chooser-req-list" aria-label="Research NDA requirements">
            <li>Letter of Intent<LoiTooltip content={["Research Title", "Introduction / Background of the Research", "Research Objectives", "Research Questions / Hypothesis", "Methodology", "Target Respondents", "Timeline"]} /></li>
            <li>Questionnaire with Data Privacy Consent Form</li>
            <li>School ID</li>
            <li>Registration Form</li>
          </ul>
          <span className="type-chooser-card-subtext" style={{ marginTop: 8, fontStyle: "italic" }}>
            Click to continue to the form →
          </span>
        </button>
      </div>
    </div>
  );
}