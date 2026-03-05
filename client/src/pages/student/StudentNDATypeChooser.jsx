import { useNavigate } from "react-router-dom";
import "../../components/TypeChooser.css";

export default function StudentNDATypeChooser() {
  const navigate = useNavigate();

  return (
    <div className="type-chooser-page">
      <div className="type-chooser-card">
        <button
          type="button"
          className="type-chooser-back"
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate("/student");
          }}
        >
          ‹ Back
        </button>

        <h2 className="type-chooser-title">Non-Disclosure Agreement Types</h2>

        <button
          type="button"
          className="type-chooser-option"
          onClick={() => navigate("/student/new-request/nda/orgactivities")}
        >
          Student Organization Activities
          <span className="type-chooser-arrow">›</span>
        </button>

        <button
          type="button"
          className="type-chooser-option"
          onClick={() => navigate("/student/new-request/nda/research")}
        >
          Conduct of Research
          <span className="type-chooser-arrow">›</span>
        </button>
      </div>
    </div>
  );
}