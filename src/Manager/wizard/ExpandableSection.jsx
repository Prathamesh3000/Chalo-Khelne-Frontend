import React from "react";
import { ChevronDown } from "lucide-react";
import Collapsible from "./Collapsible";

export default function ExpandableSection({
  open,
  onToggle,
  label,
  description,
  icon,
  variant = "default",
  animate = true,
  className = "",
  children,
}) {
  const chevron = (
    <ChevronDown
      className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-150 ease-out ${
        open ? "rotate-180" : ""
      }`}
    />
  );

  const body = animate ? (
    <Collapsible open={open}>
      <div className="pt-3">{children}</div>
    </Collapsible>
  ) : (
    <div
      className="pt-3"
      style={{ display: open ? "block" : "none" }}
      aria-hidden={!open}
    >
      {children}
    </div>
  );

  if (variant === "link") {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="text-[12px] font-medium text-gray-400 hover:text-white inline-flex items-center gap-1 transition"
        >
          {label}
          {chevron}
        </button>
        {body}
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 bg-[#181A22] hover:bg-white/[0.04] px-3 h-9 rounded-lg border border-white/[0.06] transition"
      >
        <span className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-gray-400 flex-shrink-0">{icon}</span>}
          <span className="text-[12px] font-medium text-white text-left truncate">
            {label}
          </span>
          {description && (
            <span className="text-[11px] text-gray-400 truncate">
              {description}
            </span>
          )}
        </span>
        {chevron}
      </button>
      {body}
    </div>
  );
}
