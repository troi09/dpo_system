export const APPROVED_STATUSES = ["nda_approved", "agr_approved"];

export const PENDING_STATUSES = [
  "nda_pending",
  "agr_pending_1",
  "agr_pending_2",
  "agr_awaiting_rep_signature",
];

export const REVISION_STATUSES = [
  "stud_revision_requested",
  "agr_rep_revision_requested",
  "agr_declined",
];

export const CHART_LABELS = {
  chart_reviewal: "Reviewal",
  chart_approved: "Approved",
  chart_stud_revision: "Student Revisions",
  chart_rep_revision: "Recipient Revisions",
  chart_rep_declined: "Recipient Declined",
  chart_awaiting_rep: "Awaiting Recipient Approval",
};

export const CHART_COLORS = {
  chart_reviewal: "#ca8a04",
  chart_approved: "#059669",
  chart_stud_revision: "#ea580c",
  chart_rep_revision: "#7c3aed",
  chart_rep_declined: "#dc2626",
  chart_awaiting_rep: "#2563eb",
};

export const normalizeStatusForChart = (status) => {
  if (["nda_pending", "agr_pending_1", "agr_pending_2"].includes(status)) return "chart_reviewal";
  if (APPROVED_STATUSES.includes(status)) return "chart_approved";
  if (status === "stud_revision_requested") return "chart_stud_revision";
  if (status === "agr_rep_revision_requested") return "chart_rep_revision";
  if (status === "agr_declined") return "chart_rep_declined";
  if (status === "agr_awaiting_rep_signature") return "chart_awaiting_rep";

  // Unknown statuses fallback
  return "chart_reviewal";
};
