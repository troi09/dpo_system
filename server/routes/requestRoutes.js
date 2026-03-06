const express = require("express");
const router = express.Router();

const { protect, authorizeAdmin } = require("../middleware/authMiddleware");
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
router.get("/all", protect, authorizeAdmin, getAllRequests);
router.patch("/:id/approved-document", protect, authorizeAdmin, saveApprovedDocument);

// Agreement-specific admin actions
router.patch("/:id/generate-signing-link", protect, authorizeAdmin, generateSigningLink);
router.patch("/:id/admin-phase3", protect, authorizeAdmin, adminPhase3Action);

// NDA status update (pending → approved | revision_required)
router.patch("/:id", protect, authorizeAdmin, updateRequestStatus);

router.get("/:id", protect, getRequestById);

module.exports = router;
