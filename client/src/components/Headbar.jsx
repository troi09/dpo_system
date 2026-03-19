import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "./Headbar.css";

const Headbar = () => {
  const { user } = useContext(AuthContext);

  if (!user) return null;

  return (
    <div className="headbar">
      <div className="headbar-brand">
        <img
          src="/dpo-logo.webp"
          alt="DPO Logo"
          className="headbar-brand-logo"
          width="40"
          height="40"
          loading="eager"
          decoding="async"
        />
        <span className="headbar-brand-name">Data PrivaDesk</span>
      </div>
    </div>
  );
};

export default Headbar;