import React from "react";

const SIG = "#F97316";

export default function OptionCard({
  icon,
  title,
  description,
  selected,
  onClick,
  disabled,
  className = "",
}) {
  const base = "relative text-left rounded-lg border p-3.5 transition";
  const stateClass = disabled
    ? "border-white/[0.04] bg-white/[0.02] text-gray-600 cursor-not-allowed"
    : selected
    ? "border-transparent ring-2"
    : "border-white/[0.06] bg-[#181A22] hover:border-white/[0.12] hover:bg-white/[0.03]";

  const selectedStyle = selected && !disabled
    ? {
        backgroundColor: "rgba(249,115,22,0.10)",
        "--tw-ring-color": SIG,
      }
    : undefined;

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-pressed={!!selected}
      disabled={disabled}
      className={`${base} ${stateClass} ${className}`}
      style={selectedStyle}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <span className="text-xl flex-shrink-0 leading-none">{icon}</span>
        )}
        <div className="min-w-0">
          <div
            className={`text-[13px] font-semibold ${
              disabled ? "text-gray-600" : "text-white"
            }`}
          >
            {title}
          </div>
          {description && (
            <div
              className={`text-[12px] mt-0.5 ${
                disabled ? "text-gray-600" : "text-gray-400"
              }`}
            >
              {description}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
