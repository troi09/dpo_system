import { Check } from "lucide-react";

const STEPS = [
  { label: "Submitted", statuses: ["pending", "submitted"] },
  { label: "Under Review", statuses: ["revision_requested", "rep_revision_requested"] },
  { label: "Awaiting Signature", statuses: ["awaiting_signature", "pending_approval"] },
  { label: "Approved / Completed", statuses: ["approved", "completed", "declined"] },
];

function getActiveStep(status) {
  for (let i = STEPS.length - 1; i >= 0; i--) {
    if (STEPS[i].statuses.includes(status)) return i;
  }
  return 0;
}

export default function RequestStepper({ status }) {
  const active = getActiveStep(status);
  const isDeclined = status === "declined";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, width: "100%", padding: "8px 0" }}>
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
                width: 32, height: 32, borderRadius: "50%",
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
                color: labelColor, whiteSpace: "nowrap", textAlign: "center",
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
  );
}
