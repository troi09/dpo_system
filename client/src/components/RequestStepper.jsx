import { Check, X } from "lucide-react";
import { motion } from "framer-motion";
import "./RequestStepper.css";

const NDA_STEPS = ["Submitted", "Admin Reviewal", "Approved"];
const AGREEMENT_STEPS = [
  "Submitted",
  "Initial Admin Reviewal",
  "Awaiting Representative Approval",
  "Final Admin Reviewal",
  "Approved",
];

const STATUS_TO_INDEX = {
  nda_submitted: 0,
  nda_admin_reviewal: 1,
  nda_revision_requested: 1,
  nda_approved: 2,

  agreement_submitted: 0,
  agreement_initial_admin_reviewal: 1,
  agreement_awaiting_rep_approval: 2,
  agreement_rep_revision_requested: 2,
  agreement_final_admin_reviewal: 3,
  agreement_approved: 4,
  agreement_rep_declined: 4,

  // Legacy fallback mapping for old records
  nda_pending: 1,
  revision_requested: 1,
  agr_pending_1: 1,
  agr_awaiting_rep_signature: 2,
  agr_rep_revision_requested: 2,
  agr_pending_2: 3,
  agr_approved: 4,
  agr_rep_declined: 4,
};

export default function RequestStepper({ status, type }) {
  const steps = type === "agreement" ? AGREEMENT_STEPS : NDA_STEPS;
  const isDeclined = status === "agreement_rep_declined" || status === "agr_rep_declined" || status === "declined";
  const finalStepIndex = steps.length - 1;
  const declinedIndex = type === "agreement" ? 2 : 1;
  const activeIndex = isDeclined ? declinedIndex : (STATUS_TO_INDEX[status] ?? 0);
  const isFinalApproved = ["nda_approved", "agreement_approved", "agr_approved", "approved", "approved_completed"].includes(String(status || "").toLowerCase())
    || status === "nda_approved"
    || status === "agreement_approved"
    || status === "agr_approved";

  return (
    <div className="request-stepper-wrap">
      <div className="request-stepper-track">
        {steps.map((step, index) => {
          const isCompleted = index < activeIndex || (isFinalApproved && index <= finalStepIndex);
          const isActive = index === activeIndex;
          const isDeclinedNode = isDeclined && index === declinedIndex;

          return (
            <div key={`${step}-${index}`} className="request-stepper-segment">
              <div className="request-stepper-node-wrap">
                <div
                  className={`request-stepper-node ${
                    isDeclinedNode
                      ? "is-declined"
                      : isCompleted
                      ? "is-completed"
                      : isActive
                      ? "is-active"
                      : "is-upcoming"
                  }`}
                >
                  {isDeclinedNode ? (
                    <X size={14} strokeWidth={3} />
                  ) : isCompleted ? (
                    <Check size={14} strokeWidth={3} />
                  ) : (
                    <motion.span
                      className="request-stepper-node-core"
                      animate={isActive ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                      transition={{ duration: 1.2, repeat: isActive ? Infinity : 0 }}
                    />
                  )}
                </div>

                <div
                  className={`request-stepper-label ${
                    isDeclinedNode
                      ? "is-declined"
                      : isCompleted
                      ? "is-completed"
                      : isActive
                      ? "is-active"
                      : "is-upcoming"
                  }`}
                >
                  {isDeclinedNode ? "Declined" : step}
                </div>
              </div>

              {index < steps.length - 1 && (
                <div className="request-stepper-line-shell" aria-hidden="true">
                  <div className="request-stepper-line-base" />
                  <motion.div
                    className="request-stepper-line-fill"
                    initial={false}
                    animate={{
                      width: index < activeIndex ? "100%" : "0%",
                    }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

