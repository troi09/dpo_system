const express = require("express");
const router = express.Router();

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  createRequest,
  getMyRequests,
  resubmitRequest,
  getAllRequests,
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
  getRequestStats,
  getArchivedRequests,
} = require("../controllers/requestController");

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
router.get("/all", protect, authorizeRoles("admin", "staff"), getAllRequests);
router.get("/stats", protect, authorizeRoles("admin", "staff"), getRequestStats);
router.get("/archived", protect, authorizeRoles("admin", "staff"), getArchivedRequests);
router.patch("/:id/approved-document", protect, authorizeRoles("admin", "staff"), saveApprovedDocument);

// Agreement-specific admin actions
router.patch("/:id/generate-signing-link", protect, authorizeRoles("admin", "staff"), generateSigningLink);
router.patch("/:id/admin-phase3", protect, authorizeRoles("admin"), adminPhase3Action);
router.get("/:id/sig-images", protect, authorizeRoles("admin", "staff"), getSignatureImages);

// NDA status update (pending → approved | revision_required)
router.patch("/:id", protect, authorizeRoles("admin"), updateRequestStatus);

router.get("/:id", protect, getRequestById);

module.exports = router;

