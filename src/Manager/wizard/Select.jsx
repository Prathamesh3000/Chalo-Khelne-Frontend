import React from "react";
import { ChevronDown } from "lucide-react";

const SIG = "#F97316";
const SIG_TINT = "rgba(249,115,22,0.20)";

export default function Select({
  id,
  value,
  onChange,
  options = [],
  placeholder,
  error,
  disabled,
  className = "",
  ...rest
}) {
  const errorClass = error
    ? "border-red-400/50 bg-red-500/10"
    : "border-white/[0.08] hover:border-white/[0.16]";

  return (
    <div>
      <div className="relative">
        <select
          id={id}
          value={value ?? ""}
          onChange={onChange}
          disabled={disabled}
          aria-invalid={!!error || undefined}
          className={`w-full appearance-none h-9 px-3 pr-9 rounded-lg border ${errorClass} text-[13px] text-gray-100 focus:outline-none focus:ring-2 transition disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
          style={{
            background: error ? undefined : "rgba(255,255,255,0.04)",
            "--tw-ring-color": error ? "rgba(239,68,68,0.25)" : SIG_TINT,
          }}
          onFocus={(e) => {
            if (!error) e.currentTarget.style.borderColor = SIG;
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "";
            rest.onBlur?.(e);
          }}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled className="bg-[#181A22]">
              {placeholder}
            </option>
          )}
          {options.map((opt) => {
            const v = typeof opt === "object" ? opt.value : opt;
            const l = typeof opt === "object" ? opt.label : opt;
            return (
              <option key={String(v)} value={v} className="bg-[#181A22]">
                {l}
              </option>
            );
          })}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
      </div>
      {error && (
        <p className="text-[11px] text-red-400 mt-1 font-medium">{error}</p>
      )}
    </div>
  );
}
