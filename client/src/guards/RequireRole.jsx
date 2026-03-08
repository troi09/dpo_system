import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const RequireRole = ({ allowedRoles, children }) => {
  const { user } = useContext(AuthContext);

  if (!user) return <Navigate to="/" replace />;

  if (!allowedRoles.includes(user.role)) {
    const home = user.role === "admin" || user.role === "staff" ? "/admin" : "/student";
    return <Navigate to={home} replace />;
  }

  return children;
};

export default RequireRole;