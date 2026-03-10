import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const RequireRole = ({ allowedRoles, children }) => {
  const { user } = useContext(AuthContext);

  if (!user) return <Navigate to="/" replace />;

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === "student" ? "/student" : "/admin"} replace />;
  }

  return children;
};

export default RequireRole;