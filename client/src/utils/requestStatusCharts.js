export const APPROVED_STATUSES = ["nda_approved", "agreement_approved", "agr_approved"];

export const PENDING_STATUSES = [
  "nda_submitted",
  "nda_admin_reviewal",
  "agreement_submitted",
  "agreement_initial_admin_reviewal",
  "agreement_final_admin_reviewal",
  "agreement_awaiting_rep_approval",
  "nda_pending",
  "agr_pending_1",
  "agr_pending_2",
  "agr_awaiting_rep_signature",
];

export const REVISION_STATUSES = [
  "nda_revision_requested",
  "agreement_rep_revision_requested",
  "revision_requested",
  "agr_rep_revision_requested",
  "agreement_rep_declined",
  "agr_rep_declined",
];

export const CHART_LABELS = {
  chart_submitted: "Submitted",
  chart_admin_reviewal: "Admin Reviewal",
  chart_revision_requested: "Revision Requested",
  chart_initial_admin_reviewal: "Initial Admin Reviewal",
  chart_awaiting_rep_approval: "Awaiting Representative Approval",
  chart_final_admin_reviewal: "Final Admin Reviewal",
  chart_approved: "Approved",
};

export const CHART_COLORS = {
  chart_submitted: "#ea580c",
  chart_admin_reviewal: "#ca8a04",
  chart_revision_requested: "#dc2626",
  chart_initial_admin_reviewal: "#f59e0b",
  chart_awaiting_rep_approval: "#2563eb",
  chart_final_admin_reviewal: "#0ea5e9",
  chart_approved: "#059669",
};

export const normalizeStatusForChart = (status) => {
  if (APPROVED_STATUSES.includes(status)) return "chart_approved";

  if (["nda_submitted", "agreement_submitted"].includes(status)) {
    return "chart_submitted";
  }

  if (["nda_admin_reviewal", "nda_pending"].includes(status)) {
    return "chart_admin_reviewal";
  }

  if (["agreement_initial_admin_reviewal", "agr_pending_1"].includes(status)) {
    return "chart_initial_admin_reviewal";
  }

  if (["agreement_awaiting_rep_approval", "agr_awaiting_rep_signature"].includes(status)) {
    return "chart_awaiting_rep_approval";
  }

  if (["agreement_final_admin_reviewal", "agr_pending_2"].includes(status)) {
    return "chart_final_admin_reviewal";
  }

  if (REVISION_STATUSES.includes(status)) return "chart_revision_requested";

  // Unknown historical statuses are treated as current admin review bucket.
  return "chart_admin_reviewal";
};
