import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav
      style={{
        padding: "12px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        {user?.role === "student" && (
          <>
            <Link to="/student">Dashboard</Link>
            <Link to="/student/new-request">New Request</Link>
            <Link to="/student/profile">Profile</Link>
          </>
        )}

        {user?.role === "admin" && (
          <>
            <Link to="/admin">Dashboard</Link>
            <Link to="/admin/requests">Requests</Link>
            <Link to="/admin/templates">Templates</Link>
            <Link to="/admin/reports">Reports</Link>
            <Link to="/admin/profile">Profile</Link>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        {user && (
          <>
            <span style={{ fontSize: "14px" }}>
              {user.name} ({user.role})
            </span>
            <button onClick={logout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;