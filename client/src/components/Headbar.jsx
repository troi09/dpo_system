import { useContext, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./Headbar.css";

const buildTitle = (pathname) => {
  if (pathname === "/student" || pathname === "/admin") return "Dashboard";
  if (pathname.startsWith("/student/new-request")) return "Create Request";
  if (pathname.startsWith("/student/requests")) return "Request Details";
  if (pathname.startsWith("/student/resubmit")) return "Resubmit Request";
  if (pathname.startsWith("/student/profile")) return "Profile";

  if (pathname === "/admin/requests") return "Requests";
  if (pathname.startsWith("/admin/requests/")) return "Request Review";
  if (pathname.startsWith("/admin/reports")) return "Reports";
  if (pathname.startsWith("/admin/users")) return "User Management";
  if (pathname.startsWith("/admin/archives")) return "Archives";
  if (pathname.startsWith("/admin/audit")) return "Audit Trail";
  if (pathname.startsWith("/admin/profile")) return "Profile";

  return "Dashboard";
};

const Headbar = () => {
  const { user } = useContext(AuthContext);
  const { pathname } = useLocation();

  const title = useMemo(() => buildTitle(pathname), [pathname]);

  const action =
    (user?.role === "admin" || user?.role === "staff")
      ? { label: "Review Requests", to: "/admin/requests" }
      : { label: "New Request", to: "/student/new-request" };

  const showAction = pathname === "/student" || pathname === "/admin";

  if (!user) return null;

  return (
    <div className="headbar">
      <h1 className="headbar-title">{title}</h1>

      {showAction && (
        <Link to={action.to} className="headbar-action">
          {action.label}
        </Link>
      )}
    </div>
  );
};

export default Headbar;