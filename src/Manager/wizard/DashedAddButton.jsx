import React from "react";
import { Plus } from "lucide-react";

const SIG = "#F97316";

export default function DashedAddButton({
  children,
  onClick,
  icon,
  className = "",
  disabled,
  tabIndex,
}) {
  const ic = icon === undefined ? <Plus className="w-3.5 h-3.5" /> : icon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      tabIndex={tabIndex}
      className={`w-full inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg border border-dashed border-white/[0.12] hover:border-white/[0.20] hover:bg-white/[0.03] text-[13px] font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={{ color: SIG }}
    >
      {ic}
      {children}
    </button>
  );
}
