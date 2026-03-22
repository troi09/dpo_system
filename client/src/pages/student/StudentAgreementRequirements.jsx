import { useNavigate } from "react-router-dom";
import { FileSignature, Info } from "lucide-react";
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
          <strong style={{ display: "block", marginBottom: 4, fontSize: 11 }}>Authorization Letter should include:</strong>
          {content.map((item, i) => (
            <span key={i} style={{ display: "block", fontSize: 11, lineHeight: 1.5 }}>• {item}</span>
          ))}
        </span>
      </span>
    </span>
  );
}

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
          <span className="type-chooser-req-title">Requestor Requirements:</span>
          <ul className="type-chooser-req-list" aria-label="Requestor requirements">
            <li>Notarized Authorization Letter<LoiTooltip content={["Scope of authority granted to the representative", "If located outside the Philippines — must be consular-notarized"]} /></li>
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
