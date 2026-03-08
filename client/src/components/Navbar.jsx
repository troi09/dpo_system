import { NavLink } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  const linkClass = ({ isActive }) =>
    `navbar-link${isActive ? " active" : ""}`;

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <nav className="navbar">
      {/* Brand */}
      <div className="navbar-brand">
        <img src="/dpo-logo.png" alt="DPO Logo" className="navbar-brand-logo" />
        <span className="navbar-brand-name">DPO Portal</span>
      </div>

      {/* Navigation links */}
      <div className="navbar-links">
        {user?.role === "student" && (
          <>
<<<<<<< HEAD
            <NavLink to="/student" className={linkClass} end>Dashboard</NavLink>
            <NavLink to="/student/new-request" className={linkClass}>Create Request</NavLink>
            <NavLink to="/student/profile" className={linkClass}>Profile</NavLink>
=======
            <NavLink to="/student" className={linkClass} end>
              <span className="nav-icon">⊞</span>
              Dashboard
            </NavLink>
            <NavLink to="/student/new-request" className={linkClass}>
              <span className="nav-icon">＋</span>
              Create Request
            </NavLink>
            <NavLink to="/student/profile" className={linkClass}>
              <span className="nav-icon">◎</span>
              Profile
            </NavLink>
>>>>>>> origin/Branch-ni-Kurl!
          </>
        )}

        {(user?.role === "admin" || user?.role === "staff") && (
          <>
<<<<<<< HEAD
            <NavLink to="/admin" className={linkClass} end>Dashboard</NavLink>
            <NavLink to="/admin/requests" className={linkClass}>Requests</NavLink>
            <NavLink to="/admin/templates" className={linkClass}>Templates</NavLink>
            <NavLink to="/admin/reports" className={linkClass}>Reports</NavLink>
            {user?.role === "admin" && (
              <>
                <NavLink to="/admin/users" className={linkClass}>Users</NavLink>
                <NavLink to="/admin/archives" className={linkClass}>Archives</NavLink>
              </>
            )}
            <NavLink to="/admin/profile" className={linkClass}>Profile</NavLink>
=======
            <NavLink to="/admin" className={linkClass} end>
              <span className="nav-icon">⊞</span>
              Dashboard
            </NavLink>
            <NavLink to="/admin/requests" className={linkClass}>
              <span className="nav-icon">≡</span>
              Requests
            </NavLink>
            <NavLink to="/admin/templates" className={linkClass}>
              <span className="nav-icon">◈</span>
              Templates
            </NavLink>
            <NavLink to="/admin/reports" className={linkClass}>
              <span className="nav-icon">◷</span>
              Reports
            </NavLink>
            <NavLink to="/admin/profile" className={linkClass}>
              <span className="nav-icon">◎</span>
              Profile
            </NavLink>
>>>>>>> origin/Branch-ni-Kurl!
          </>
        )}
      </div>

      {/* User section */}
      {user && (
        <div className="navbar-user">
          <div className="navbar-user-top">
            <div className="navbar-user-avatar">
              {initials}
            </div>
            <div className="navbar-user-info">
              <span className="navbar-user-name">{user.name}</span>
              <span className="navbar-user-role">{user.role}</span>
            </div>
          </div>
          <button className="navbar-logout" onClick={logout}>
            Log out
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
