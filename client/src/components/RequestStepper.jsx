import { Check } from "lucide-react";

const STEPS = [
  { label: "Submitted", statuses: ["nda_pending", "agr_pending_1"] },
  { label: "Under Review", statuses: ["revision_requested", "agr_rep_revision_requested"] },
  { label: "Awaiting Signature", statuses: ["agr_awaiting_rep_signature", "agr_pending_2"] },
  { label: "Approved / Completed", statuses: ["nda_approved", "agr_approved", "agr_rep_declined"] },
];

function getActiveStep(status) {
  for (let i = STEPS.length - 1; i >= 0; i--) {
    if (STEPS[i].statuses.includes(status)) return i;
  }
  return 0;
}

export default function RequestStepper({ status }) {
  const active = getActiveStep(status);
  const isDeclined = status === "agr_rep_declined";

  return (
    <div style={{ width: "100%", padding: "8px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0, width: "100%" }}>
      {STEPS.map((step, i) => {
        const done = i < active;
        const current = i === active;
        const future = i > active;

        const dotColor = isDeclined && i === STEPS.length - 1
          ? "#ef4444"
          : done || current
          ? "var(--primary)"
          : "var(--border-strong)";

        const labelColor = current
          ? "var(--primary)"
          : done
          ? "var(--text-secondary)"
          : "var(--text-muted)";

        return (
          <div key={step.label} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
            {/* Node */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: done ? "var(--primary)" : current ? "var(--primary)" : "var(--surface)",
                border: `2px solid ${dotColor}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
              }}>
                {done ? (
                  <Check size={15} color="#fff" strokeWidth={3} />
                ) : (
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: current
                      ? (isDeclined && i === STEPS.length - 1 ? "#ef4444" : "var(--primary)")
                      : "transparent",
                  }} />
                )}
              </div>
              <span style={{
                marginTop: 6, fontSize: 11, fontWeight: current ? 700 : 500,
                whiteSpace: "nowrap", textAlign: "center", lineHeight: 1.25,
                color: isDeclined && i === STEPS.length - 1 ? "#ef4444" : labelColor,
              }}>
                {isDeclined && i === STEPS.length - 1 ? "Declined" : step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, marginBottom: 22,
                background: done ? "var(--primary)" : "var(--border-strong)",
                transition: "background 0.2s",
              }} />
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
