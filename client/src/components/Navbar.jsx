import { NavLink } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  const linkClass = ({ isActive }) =>
    `navbar-link${isActive ? " active" : ""}`;

  return (
    <nav className="navbar">
      <div className="navbar-links">
        {user?.role === "student" && (
          <>
            <NavLink to="/student" className={linkClass} end>
              Dashboard
            </NavLink>
            <NavLink to="/student/new-request" className={linkClass}>
              Create Request
            </NavLink>
            <NavLink to="/student/profile" className={linkClass}>
              Profile
            </NavLink>
          </>
        )}

        {user?.role === "admin" && (
          <>
            <NavLink to="/admin" className={linkClass} end>
              Dashboard
            </NavLink>
            <NavLink to="/admin/requests" className={linkClass}>
              Requests
            </NavLink>
            <NavLink to="/admin/templates" className={linkClass}>
              Templates
            </NavLink>
            <NavLink to="/admin/reports" className={linkClass}>
              Reports
            </NavLink>
            <NavLink to="/admin/profile" className={linkClass}>
              Profile
            </NavLink>
          </>
        )}
      </div>

      {user && (
        <div className="navbar-user">
          <span className="navbar-user-name">
            {user.name} ({user.role})
          </span>
          <button className="navbar-logout" onClick={logout}>
            Log out
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;