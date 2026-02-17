import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";

import Navbar from "./components/Navbar";
import RequireRole from "./components/RequireRole";

import Login from "./pages/Login";
import Register from "./pages/Register";

// Student pages
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentNewRequest from "./pages/student/StudentNewRequest";
import StudentNDARequest from "./pages/student/StudentNDARequest";
import StudentAgreementRequest from "./pages/student/StudentAgreementRequest";
import StudentProfile from "./pages/student/StudentProfile";
import StudentResubmitRequest from "./pages/student/StudentResubmitRequest";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminTemplates from "./pages/admin/AdminTemplates";
import AdminReports from "./pages/admin/AdminReports";
import AdminProfile from "./pages/admin/AdminProfile";

function App() {
  const { user } = useContext(AuthContext);

  return (
    <Router>
      <div className="app-container">
        <Navbar />

        <div className="page-container">
          <Routes>
            {/* Public */}
            {!user && (
              <>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </>
            )}

            {/* Logged in */}
            {user && (
              <>
                {/* Student routes */}
                <Route
                  path="/student"
                  element={
                    <RequireRole allowedRoles={["student"]}>
                      <StudentDashboard />
                    </RequireRole>
                  }
                />
                <Route
                  path="/student/new-request"
                  element={
                    <RequireRole allowedRoles={["student"]}>
                      <StudentNewRequest />
                    </RequireRole>
                  }
                />
                <Route
                  path="/student/new-request/nda"
                  element={
                    <RequireRole allowedRoles={["student"]}>
                      <StudentNDARequest />
                    </RequireRole>
                  }
                />
                <Route
                  path="/student/new-request/agreement"
                  element={
                    <RequireRole allowedRoles={["student"]}>
                      <StudentAgreementRequest />
                    </RequireRole>
                  }
                />
                <Route
                  path="/student/profile"
                  element={
                    <RequireRole allowedRoles={["student"]}>
                      <StudentProfile />
                    </RequireRole>
                  }
                />
                <Route
                  path="/student/resubmit/:id"
                  element={
                    <RequireRole allowedRoles={["student"]}>
                      <StudentResubmitRequest />
                    </RequireRole>
                  }
                />

                {/* Admin routes */}
                <Route
                  path="/admin"
                  element={
                    <RequireRole allowedRoles={["admin"]}>
                      <AdminDashboard />
                    </RequireRole>
                  }
                />
                <Route
                  path="/admin/requests"
                  element={
                    <RequireRole allowedRoles={["admin"]}>
                      <AdminRequests />
                    </RequireRole>
                  }
                />
                <Route
                  path="/admin/templates"
                  element={
                    <RequireRole allowedRoles={["admin"]}>
                      <AdminTemplates />
                    </RequireRole>
                  }
                />
                <Route
                  path="/admin/reports"
                  element={
                    <RequireRole allowedRoles={["admin"]}>
                      <AdminReports />
                    </RequireRole>
                  }
                />
                <Route
                  path="/admin/profile"
                  element={
                    <RequireRole allowedRoles={["admin"]}>
                      <AdminProfile />
                    </RequireRole>
                  }
                />

                {/* Default redirects */}
                <Route
                  path="/"
                  element={<Navigate to={user.role === "admin" ? "/admin" : "/student"} replace />}
                />
                <Route
                  path="*"
                  element={<Navigate to={user.role === "admin" ? "/admin" : "/student"} replace />}
                />
              </>
            )}
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
