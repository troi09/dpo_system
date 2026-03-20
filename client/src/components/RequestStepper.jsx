import { Check, X } from "lucide-react";
import { motion } from "framer-motion";
import "./RequestStepper.css";

const NDA_STEPS = ["Submitted", "Reviewal", "Approved"];
const AGREEMENT_STEPS = [
  "Submitted",
  "Initial Reviewal",
  "Recipient Reviewal",
  "Final Reviewal",
  "Approved",
];

const STATUS_TO_INDEX = {
  // NDA workflow
  nda_pending: 1,
  stud_revision_requested: 1,
  nda_approved: 2,

  // Agreement workflow
  agr_pending_1: 1,
  agr_awaiting_rep_signature: 2,
  agr_rep_revision_requested: 3,
  agr_pending_2: 3,
  agr_approved: 4,
  agr_declined: 4,
};

const REVISION_LABEL = {
  stud_revision_requested: "Student Revisions",
  agr_rep_revision_requested: "Recipient Revisions",
};

export default function RequestStepper({ status, type }) {
  const steps = type === "agreement" ? AGREEMENT_STEPS : NDA_STEPS;
  const isDeclined = status === "agr_declined";
  const isRevision = status in REVISION_LABEL;
  const finalStepIndex = steps.length - 1;
  const declinedIndex = type === "agreement" ? 2 : 0;
  const activeIndex = isDeclined ? declinedIndex : (STATUS_TO_INDEX[status] ?? 0);
  const isFinalApproved = ["nda_approved", "agr_approved", "agreement_approved"].includes(status);

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
                      : isActive && isRevision
                      ? "is-active-revision"
                      : isActive
                      ? "is-active"
                      : "is-upcoming"
                  }`}
                >
                  {isDeclinedNode ? (
                    <X size={13} strokeWidth={3} />
                  ) : isCompleted ? (
                    <Check size={14} strokeWidth={3} />
                  ) : isActive ? (
                    <motion.span
                      className="request-stepper-node-core"
                      animate={{ scale: [1, 1.25, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ) : (
                    <span className="request-stepper-node-number">{index + 1}</span>
                  )}
                </div>

                <div
                  className={`request-stepper-label ${
                    isDeclinedNode
                      ? "is-declined"
                      : isCompleted
                      ? "is-completed"
                      : isActive && isRevision
                      ? "is-active-revision"
                      : isActive
                      ? "is-active"
                      : "is-upcoming"
                  }`}
                >
                  {isDeclinedNode
                    ? "Declined"
                    : isActive && isRevision
                    ? REVISION_LABEL[status]
                    : step}
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

