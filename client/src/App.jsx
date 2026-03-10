import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";

import Navbar from "./components/Navbar";
import Headbar from "./components/Headbar";
import SessionWarningModal from "./components/SessionWarningModal";
import RequireRole from "./guards/RequireRole";

import Landing from "./pages/Landing";
import VerifyDocument from "./pages/VerifyDocument";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ActivateAccountPage from "./pages/ActivateAccountPage";
import RepSigningPage from "./pages/public/RepSigningPage";

// Student pages
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentNewRequest from "./pages/student/StudentNewRequest";
import StudentNDATypeChooser from "./pages/student/StudentNDATypeChooser";
import StudentNDAOrgActivities from "./pages/student/StudentNDAOrgActivities";
import StudentNDAResearch from "./pages/student/StudentNDAResearch";
import StudentAgreementRequest from "./pages/student/StudentAgreementRequest";
import StudentRequestReview from "./pages/student/StudentRequestReview";
import StudentProfile from "./pages/student/StudentProfile";
import StudentResubmitRequest from "./pages/student/StudentResubmitRequest";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminRequestReview from "./pages/admin/AdminRequestReview";
import AdminReports from "./pages/admin/AdminReports";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminArchives from "./pages/admin/AdminArchives";
import AdminAuditLog from "./pages/admin/AdminAuditLog";

function AppLayout() {
  const { user, showSessionWarning, extendSession } = useContext(AuthContext);

  return (
    <div className="app-container">
      {user && <Navbar />}

      <div className="page-container">
        {user && <Headbar />}
        <div className="page-content">
          <Outlet />
        </div>
      </div>

      {showSessionWarning && <SessionWarningModal onExtend={extendSession} />}
    </div>
  );
}

function App() {
  const { user } = useContext(AuthContext);

  return (
    <Router>
      <Routes>
        {/* Public routes (no auth, no layout) */}
        <Route path="/verify/:code" element={<VerifyDocument />} />
        <Route path="/sign/:token" element={<RepSigningPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/activate" element={<ActivateAccountPage />} />

        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={
              user
                ? <Navigate to={user.role === "student" ? "/student" : "/admin"} replace />
                : <Landing />
            }
          />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />

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
                <StudentNDATypeChooser />
              </RequireRole>
            }
          />
          <Route
            path="/student/new-request/nda/orgactivities"
            element={
              <RequireRole allowedRoles={["student"]}>
                <StudentNDAOrgActivities />
              </RequireRole>
            }
          />
          <Route
            path="/student/new-request/nda/research"
            element={
              <RequireRole allowedRoles={["student"]}>
                <StudentNDAResearch />
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
            path="/student/requests/:id"
            element={
              <RequireRole allowedRoles={["student"]}>
                <StudentRequestReview />
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

          <Route
            path="/admin"
            element={
              <RequireRole allowedRoles={["admin", "staff"]}>
                <AdminDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/admin/requests"
            element={
              <RequireRole allowedRoles={["admin", "staff"]}>
                <AdminRequests />
              </RequireRole>
            }
          />
          <Route
            path="/admin/requests/:id"
            element={
              <RequireRole allowedRoles={["admin", "staff"]}>
                <AdminRequestReview />
              </RequireRole>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <RequireRole allowedRoles={["admin", "staff"]}>
                <AdminReports />
              </RequireRole>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <RequireRole allowedRoles={["admin", "staff"]}>
                <AdminProfile />
              </RequireRole>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequireRole allowedRoles={["admin"]}>
                <AdminUsers />
              </RequireRole>
            }
          />
          <Route
            path="/admin/archives"
            element={
              <RequireRole allowedRoles={["admin", "staff"]}>
                <AdminArchives />
              </RequireRole>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <RequireRole allowedRoles={["admin", "staff"]}>
                <AdminAuditLog />
              </RequireRole>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;