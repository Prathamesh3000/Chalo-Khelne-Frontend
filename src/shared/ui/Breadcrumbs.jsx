import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "../lib";

/**
 * Explicit-crumb breadcrumbs. Pass an array of { label, to? }.
 * The last item is rendered as the current page (no link, bolder).
 *
 *   <Breadcrumbs items={[
 *     { label: "Tournaments", to: "/mtournament-management" },
 *     { label: tournament.title, to: manageUrl },
 *     { label: "Scoreboard" },          // last — current page
 *   ]} />
 *
 * Intentionally not auto-deriving from the URL: V1 routes don't have a clean
 * mapping (e.g. /tournament-management/group-stage/<tid>/<gid>/scoreboard
 * has three opaque IDs in a row). Page-level callers know the real labels.
 */
export function Breadcrumbs({ items, className }) {
  const list = (items || []).filter(Boolean);
  if (list.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1",
        className
      )}
    >
      {list.map((crumb, i) => {
        const isLast = i === list.length - 1;
        return (
          <Fragment key={`${i}-${crumb.label}`}>
            {i > 0 && (
              <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
            )}
            {isLast || !crumb.to ? (
              <span className="text-[12px] font-semibold text-gray-900 truncate max-w-[14rem]">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.to}
                className="text-[12px] font-medium text-gray-500 hover:text-orange-600 transition truncate max-w-[14rem]"
              >
                {crumb.label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

export default Breadcrumbs;
