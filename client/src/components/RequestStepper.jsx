import { Check, X } from "lucide-react";
import { motion } from "framer-motion";
import "./RequestStepper.css";

const NDA_STEPS = ["Reviewal", "Approved"];
const AGREEMENT_STEPS = [
  "Initial Reviewal",
  "Recipient Reviewal",
  "Final Reviewal",
  "Approved",
];

const STATUS_TO_INDEX = {
  // NDA workflow
  nda_pending: 0,
  stud_revision_requested: 0,
  nda_approved: 1,

  // Agreement workflow
  agr_pending_1: 0,
  agr_awaiting_rep_signature: 1,
  agr_rep_revision_requested: 1,
  agr_pending_2: 2,
  agr_approved: 3,
  agr_declined: 3,
};

export default function RequestStepper({ status, type }) {
  const steps = type === "agreement" ? AGREEMENT_STEPS : NDA_STEPS;
  const isDeclined = status === "agr_declined";
  const finalStepIndex = steps.length - 1;
  const declinedIndex = type === "agreement" ? 1 : 0;
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

