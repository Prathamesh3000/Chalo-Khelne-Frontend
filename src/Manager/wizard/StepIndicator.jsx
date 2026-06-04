import React, { Fragment } from "react";
import { Check } from "lucide-react";

const SIG = "#F97316";

export default function StepIndicator({ steps, currentStep, onStepClick }) {
  return (
    <div className="w-full">
      <div className="flex items-center">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;
          const isClickable = isCompleted && typeof onStepClick === "function";

          const circleStyle = isCurrent
            ? { backgroundColor: SIG, color: "#FFFFFF" }
            : undefined;
          const circleClass = isCompleted
            ? "bg-emerald-500 text-white"
            : isCurrent
            ? ""
            : "border border-white/[0.10] bg-[#181A22] text-gray-500";

          const labelClass = isCompleted
            ? "text-emerald-400"
            : isCurrent
            ? "text-white"
            : "text-gray-500";

          return (
            <Fragment key={step.id}>
              <button
                type="button"
                onClick={isClickable ? () => onStepClick(idx) : undefined}
                disabled={!isClickable}
                aria-current={isCurrent ? "step" : undefined}
                className={`flex items-center gap-2 ${
                  isClickable ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-semibold font-mono tabular-nums transition ${circleClass}`}
                  style={circleStyle}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : idx + 1}
                </span>
                <span
                  className={`text-[12px] font-medium hidden sm:block ${labelClass}`}
                >
                  {step.label}
                </span>
              </button>

              {idx < steps.length - 1 && (
                <div className="flex-1 mx-3 relative h-0">
                  <div
                    className={`absolute inset-x-0 top-1/2 h-px -translate-y-1/2 ${
                      idx < currentStep ? "bg-emerald-500" : "bg-white/[0.10]"
                    }`}
                  />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      <div className="mt-3 text-[11px] text-gray-400 font-mono tabular-nums">
        Step {currentStep + 1} of {steps.length}
      </div>
    </div>
  );
}
