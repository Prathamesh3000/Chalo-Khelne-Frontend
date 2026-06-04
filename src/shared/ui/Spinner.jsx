import { cn } from "../lib/cn";

export function Spinner({ size = "md", className }) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-10 h-10 border-[3px]",
  };
  return (
    <span
      className={cn(
        "inline-block rounded-full border-current border-t-transparent animate-spin text-orange-500",
        sizes[size],
        className
      )}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner size="lg" />
    </div>
  );
}

export default Spinner;
