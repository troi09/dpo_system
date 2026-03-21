import { NavLink } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  FilePlus,
  ClipboardList,
  BarChart2,
  History,
  Users,
  Archive,
  Search,
  UserCircle,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const linkClass = ({ isActive }) =>
    `navbar-link${isActive ? " active" : ""}`;

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : (user?.firstName ? user.firstName[0].toUpperCase() : "?");

  return (
    <>
      <nav className="navbar">
        {/* Navigation links */}
        <div className="navbar-links">
          {user?.role === "student" && (
            <>
              <NavLink to="/student" className={linkClass} end>
                <ClipboardList size={16} className="nav-icon" />
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
                <BarChart2 size={16} className="nav-icon" />
                Dashboard
              </NavLink>
              <NavLink to="/admin/requests" className={linkClass}>
                <ClipboardList size={16} className="nav-icon" />
                Request Management
              </NavLink>
              {user?.role === "staff" && (
                <NavLink to="/admin/proxy-request" className={linkClass}>
                  <FilePlus size={16} className="nav-icon" />
                  Proxy Request
                </NavLink>
              )}
              <NavLink to="/admin/reports" className={linkClass}>
                <History size={16} className="nav-icon" />
                Transaction Records
              </NavLink>
              {user?.role === "admin" && (
                <NavLink to="/admin/audit" className={linkClass}>
                  <Search size={16} className="nav-icon" />
                  Audit Logs
                </NavLink>
              )}
              {user?.role === "admin" && (
                <NavLink to="/admin/users" className={linkClass}>
                  <Users size={16} className="nav-icon" />
                  User Management
                </NavLink>
              )}
              <NavLink to="/admin/archives" className={linkClass}>
                <Archive size={16} className="nav-icon" />
                Archives
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
            <button className="navbar-logout" onClick={() => setShowLogoutConfirm(true)}>
              <LogOut size={14} style={{ marginRight: 6 }} />
              Log out
            </button>
          </div>
        )}
      </nav>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
              <h3 className="modal-title">Log Out</h3>
              <p className="modal-text">Are you sure you want to log out?</p>
              <div className="modal-actions">
                <button className="ui-btn ui-btn--secondary" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
                <button className="ui-btn ui-btn--primary" onClick={logout}>Log Out</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
