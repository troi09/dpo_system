import { NavLink } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  LayoutDashboard,
  FilePlus,
  ClipboardList,
  BarChart2,
  Users,
  Archive,
  Activity,
  UserCircle,
  LogOut,
} from "lucide-react";
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
            <NavLink to="/student" className={linkClass} end>
              <LayoutDashboard size={16} className="nav-icon" />
              Dashboard
            </NavLink>
            <NavLink to="/student/new-request" className={linkClass}>
              <FilePlus size={16} className="nav-icon" />
              Create Request
            </NavLink>
            <NavLink to="/student/profile" className={linkClass}>
              <UserCircle size={16} className="nav-icon" />
              Profile
            </NavLink>
          </>
        )}

        {(user?.role === "admin" || user?.role === "staff") && (
          <>
            <NavLink to="/admin" className={linkClass} end>
              <LayoutDashboard size={16} className="nav-icon" />
              Dashboard
            </NavLink>
            <NavLink to="/admin/requests" className={linkClass}>
              <ClipboardList size={16} className="nav-icon" />
              Requests
            </NavLink>
            <NavLink to="/admin/reports" className={linkClass}>
              <BarChart2 size={16} className="nav-icon" />
              Reports
            </NavLink>
            {user?.role === "admin" && (
              <NavLink to="/admin/users" className={linkClass}>
                <Users size={16} className="nav-icon" />
                Users
              </NavLink>
            )}
            <NavLink to="/admin/archives" className={linkClass}>
              <Archive size={16} className="nav-icon" />
              Archives
            </NavLink>
            <NavLink to="/admin/audit" className={linkClass}>
              <Activity size={16} className="nav-icon" />
              Audit
            </NavLink>
            <NavLink to="/admin/profile" className={linkClass}>
              <UserCircle size={16} className="nav-icon" />
              Profile
            </NavLink>
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
            <LogOut size={14} style={{ marginRight: 6 }} />
            Log out
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
