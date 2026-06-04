import { forwardRef } from "react";
import { cn } from "../lib";

const SIZES = {
  sm: "h-9 px-3.5 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-sm",
};

/**
 * Primary button with a hover-only shine sweep. Uses the global `.animate-shine`
 * keyframe from index.css.
 */
export const ShineButton = forwardRef(function ShineButton(
  { children, loading = false, size = "md", className, type = "button", disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "group relative inline-flex items-center justify-center gap-1.5 overflow-hidden",
        "rounded-md bg-orange-500 font-bold uppercase tracking-wide text-white",
        "shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-600 active:scale-[0.97]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-orange-500 disabled:active:scale-100 w-auto",
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="relative z-10 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      <span className="relative z-10 inline-flex items-center gap-1.5">{children}</span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 -z-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-0 group-hover:animate-shine group-hover:opacity-100"
      />
    </button>
  );
});

export default ShineButton;
