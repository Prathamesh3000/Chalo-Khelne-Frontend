import { Link } from "react-router-dom";
import { cn } from "../lib";

/**
 * Logo block — orange CK tile + wordmark. `tone="light"` for dark backgrounds.
 */
export function BrandMark({ tone = "dark", to = "/", className }) {
  return (
    <Link to={to} className={cn("inline-flex items-center gap-2 w-auto", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-md bg-orange-500 text-sm font-black text-white shadow-lg shadow-orange-500/30">
        CK
      </span>
      <span
        className={cn(
          "text-base font-black uppercase tracking-wider",
          tone === "light" ? "text-white" : "text-gray-900"
        )}
      >
        Chalo Khelne
      </span>
    </Link>
  );
}

export default BrandMark;
