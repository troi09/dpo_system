import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";

import Navbar from "./components/Navbar";
import RequireRole from "./components/RequireRole";

import Landing from "./pages/Landing";

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
import AdminTemplates from "./pages/admin/AdminTemplates";
import AdminReports from "./pages/admin/AdminReports";
import AdminProfile from "./pages/admin/AdminProfile";

function App() {
  const { user } = useContext(AuthContext);

  return (
    <Router>
      <div className="app-container">
        {user && <Navbar />}

        <div className="page-container">
          <Routes>
            <Route path="/" element={!user ? <Landing /> : <Navigate to="/student" replace />} />
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
              path="/admin/requests/:id"
              element={
                <RequireRole allowedRoles={["admin"]}>
                  <AdminRequestReview />
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

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;