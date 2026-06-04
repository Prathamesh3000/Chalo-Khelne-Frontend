import { cn } from "../lib";

/**
 * Small uppercase tracking-wide label used above page titles and section heads.
 * tone: "default" (orange on light bg) | "light" (orange on dark bg)
 */
export function Eyebrow({ tone = "default", children, className }) {
  const tones = {
    default: "border border-orange-500/25 bg-orange-50 text-orange-600",
    light:   "border border-orange-500/30 bg-orange-500/10 text-orange-400 backdrop-blur",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em]",
        tones[tone],
        className
      )}
    >
      <span className="relative inline-flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-1.5 w-1.5 animate-pulse-ring rounded-full bg-current opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {children}
    </span>
  );
}

export default Eyebrow;
