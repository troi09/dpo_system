import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./Headbar.css";

const Headbar = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user) return null;

  const dashboardPath = user.role === "student" ? "/student" : "/admin";

  return (
    <div className="headbar">
      <div
        className="headbar-brand"
        onClick={() => navigate(dashboardPath)}
        style={{ cursor: "pointer" }}
      >
        <img
          src="/dpo-logo.webp"
          alt="DPO Logo"
          className="headbar-brand-logo"
          width="40"
          height="40"
          loading="eager"
          decoding="async"
        />
        <div className="headbar-brand-text">
          <span className="headbar-brand-name">Data Protection Office</span>
          <span className="headbar-brand-sub">Rizal Technological University</span>
        </div>
      </div>
    </div>
  );
};

export default Headbar;