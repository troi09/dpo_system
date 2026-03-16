import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { Suspense, lazy, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AuthContext } from "./context/AuthContext";

import Navbar from "./components/Navbar";
import Headbar from "./components/Headbar";
import SessionWarningModal from "./components/SessionWarningModal";
import InPageFeedbackHost from "./components/InPageFeedbackHost";
import RequireRole from "./guards/RequireRole";

import Landing from "./pages/Landing";
const VerifyDocument = lazy(() => import("./pages/VerifyDocument"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const ActivateAccountPage = lazy(() => import("./pages/ActivateAccountPage"));
const RepSigningPage = lazy(() => import("./pages/public/RepSigningPage"));

// Student pages
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const StudentNewRequest = lazy(() => import("./pages/student/StudentNewRequest"));
const StudentNDATypeChooser = lazy(() => import("./pages/student/StudentNDATypeChooser"));
const StudentNDAOrgActivities = lazy(() => import("./pages/student/StudentNDAOrgActivities"));
const StudentNDAResearch = lazy(() => import("./pages/student/StudentNDAResearch"));
const StudentAgreementRequest = lazy(() => import("./pages/student/StudentAgreementRequest"));
const StudentRequestReview = lazy(() => import("./pages/student/StudentRequestReview"));
const StudentProfile = lazy(() => import("./pages/student/StudentProfile"));
const StudentResubmitRequest = lazy(() => import("./pages/student/StudentResubmitRequest"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminRequests = lazy(() => import("./pages/admin/AdminRequests"));
const AdminRequestReview = lazy(() => import("./pages/admin/AdminRequestReview"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminArchives = lazy(() => import("./pages/admin/AdminArchives"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));
const StaffProxyTypeChooser = lazy(() => import("./pages/admin/StaffProxyTypeChooser"));
const StaffProxyNDATypeChooser = lazy(() => import("./pages/admin/StaffProxyNDATypeChooser"));
const StaffProxyNDAOrgActivities = lazy(() => import("./pages/admin/StaffProxyNDAOrgActivities"));
const StaffProxyNDAResearch = lazy(() => import("./pages/admin/StaffProxyNDAResearch"));
const StaffProxyAgreementRequest = lazy(() => import("./pages/admin/StaffProxyAgreementRequest"));

function GlobalLoader() {
  return (
    <div
      className="route-transition-shell"
      style={{
        minHeight: "160px",
        display: "grid",
        placeItems: "center",
      }}
      aria-live="polite"
      aria-busy="true"
    >
      <div
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "999px",
          border: "3px solid rgba(15, 45, 107, 0.2)",
          borderTopColor: "var(--primary)",
          animation: "spin 0.8s linear infinite",
        }}
      />
    </div>
  );
}

function AppLayout() {
  const { user, showSessionWarning, extendSession } = useContext(AuthContext);
  const location = useLocation();

  return (
    <div className="app-container">
      {user && <Navbar />}

      <div className="page-container">
        {user && <Headbar />}
        <div className="page-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              className="route-transition-shell"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Suspense fallback={<GlobalLoader />}>
                <Outlet />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {showSessionWarning && <SessionWarningModal onExtend={extendSession} />}
    </div>
  );
}

function App() {
  const { user } = useContext(AuthContext);

  return (
    <>
      <Router>
        <Suspense fallback={<GlobalLoader />}>
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
              path="/admin/proxy-request"
              element={
                <RequireRole allowedRoles={["staff"]}>
                  <StaffProxyTypeChooser />
                </RequireRole>
              }
            />
            <Route
              path="/admin/proxy-request/nda"
              element={
                <RequireRole allowedRoles={["staff"]}>
                  <StaffProxyNDATypeChooser />
                </RequireRole>
              }
            />
            <Route
              path="/admin/proxy-request/nda/orgactivities"
              element={
                <RequireRole allowedRoles={["staff"]}>
                  <StaffProxyNDAOrgActivities />
                </RequireRole>
              }
            />
            <Route
              path="/admin/proxy-request/nda/research"
              element={
                <RequireRole allowedRoles={["staff"]}>
                  <StaffProxyNDAResearch />
                </RequireRole>
              }
            />
            <Route
              path="/admin/proxy-request/agreement"
              element={
                <RequireRole allowedRoles={["staff"]}>
                  <StaffProxyAgreementRequest />
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
                <RequireRole allowedRoles={["admin"]}>
                  <AdminAuditLog />
                </RequireRole>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          </Routes>
        </Suspense>
      </Router>
      <InPageFeedbackHost />
    </>
  );
}

export default App;
