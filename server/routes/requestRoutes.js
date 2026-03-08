const express = require("express");
const router = express.Router();

const { protect, authorizeAdmin, authorizeAdminOrStaff } = require("../middleware/authMiddleware");
const { apiLimiter } = require("../middleware/rateLimiter");
const {
  createRequest,
  getMyRequests,
  resubmitRequest,
  getAllRequests,
  getArchivedRequests,
  saveApprovedDocument,
  updateRequestStatus,
  getRequestById,
  verifyRequestCode,
  generateSigningLink,
  getBySigningToken,
  repSubmit,
  repReject,
  adminPhase3Action,
  getSignatureImages,
} = require("../controllers/requestController");

<<<<<<< HEAD
// PUBLIC (no auth) – rate limited
router.get("/verify/:code", apiLimiter, verifyRequestCode);

// STUDENT (protected)
router.post("/", apiLimiter, protect, createRequest);
router.get("/my", apiLimiter, protect, getMyRequests);
router.patch("/:id/resubmit", apiLimiter, protect, resubmitRequest);

// ADMIN + STAFF (can view and review)
router.get("/all", apiLimiter, protect, authorizeAdminOrStaff, getAllRequests);
router.patch("/:id/approved-document", apiLimiter, protect, authorizeAdminOrStaff, saveApprovedDocument);
router.patch("/:id", apiLimiter, protect, authorizeAdminOrStaff, updateRequestStatus);
=======
// ── Public ─────────────────────────────────────────────────────────────────
router.get("/verify/:code", verifyRequestCode);

// Agreement signing page (public – no auth required)
router.get("/sign/:token", getBySigningToken);
router.post("/sign/:token/submit", repSubmit);
router.post("/sign/:token/reject", repReject);

// ── Student ────────────────────────────────────────────────────────────────
router.post("/", protect, createRequest);
router.get("/my", protect, getMyRequests);
router.patch("/:id/resubmit", protect, resubmitRequest);

// ── Admin ──────────────────────────────────────────────────────────────────
router.get("/all", protect, authorizeAdmin, getAllRequests);
router.patch("/:id/approved-document", protect, authorizeAdmin, saveApprovedDocument);

// Agreement-specific admin actions
router.patch("/:id/generate-signing-link", protect, authorizeAdmin, generateSigningLink);
router.patch("/:id/admin-phase3", protect, authorizeAdmin, adminPhase3Action);
router.get("/:id/sig-images", protect, authorizeAdmin, getSignatureImages);

// NDA status update (pending → approved | revision_required)
router.patch("/:id", protect, authorizeAdmin, updateRequestStatus);
>>>>>>> origin/Branch-ni-Kurl!

// ADMIN ONLY (archives)
router.get("/archived", apiLimiter, protect, authorizeAdmin, getArchivedRequests);

<<<<<<< HEAD
// SHARED (protected - checks ownership)
router.get("/:id", apiLimiter, protect, getRequestById);

=======
>>>>>>> origin/Branch-ni-Kurl!
module.exports = router;
