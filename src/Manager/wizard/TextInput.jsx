import React from "react";

const SIG = "#F97316";
const SIG_TINT = "rgba(249,115,22,0.20)";

export default function TextInput({
  id,
  value,
  onChange,
  placeholder,
  error,
  className = "",
  type = "text",
  ...rest
}) {
  const errorClass = error
    ? "border-red-400/50 bg-red-500/10"
    : "border-white/[0.08] hover:border-white/[0.16]";

  return (
    <div>
      <input
        id={id}
        type={type}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={!!error || undefined}
        className={`w-full h-9 px-3 rounded-lg border ${errorClass} text-[13px] text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 transition ${className}`}
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
      />
      {error && (
        <p className="text-[11px] text-red-400 mt-1 font-medium">{error}</p>
      )}
    </div>
  );
}
