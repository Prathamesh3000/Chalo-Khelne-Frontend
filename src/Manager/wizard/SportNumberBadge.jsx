import React from "react";

const SIG = "#F97316";

export default function SportNumberBadge({ index, className = "" }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-white text-[11px] font-mono tabular-nums font-semibold ${className}`}
      style={{ backgroundColor: SIG }}
    >
      {index}
    </span>
  );
}
