import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Users, IndianRupee, ArrowRight } from "lucide-react";
import { cn } from "../../../shared/lib";
import { resolveManageUrl } from "../lib/manageUrl";

// Per-sport accent colour for the left rail + sport tag dot. Falls back to
// the brand orange for any sport not listed here.
const SPORT_ACCENT = {
  Cricket:      "#F97316",
  Football:     "#10B981",
  Badminton:    "#3B82F6",
  Tennis:       "#EAB308",
  Basketball:   "#EF4444",
  Volleyball:   "#EC4899",
  Kabaddi:      "#8B5CF6",
  Hockey:       "#06B6D4",
  "Table Tennis": "#84CC16",
};

const STATUS = {
  live:      { label: "Live",      bg: "bg-red-50",       text: "text-red-600",      ring: "ring-red-200",      dot: true  },
  upcoming:  { label: "Upcoming",  bg: "bg-blue-50",      text: "text-blue-600",     ring: "ring-blue-200",     dot: false },
  completed: { label: "Completed", bg: "bg-gray-100",     text: "text-gray-500",     ring: "ring-gray-200",     dot: false },
};

function formatDateRange(start, end) {
  if (!start) return "";
  const opts = { day: "numeric", month: "short" };
  const s = new Date(start).toLocaleDateString("en-IN", opts);
  if (!end) return s;
  return `${s} – ${new Date(end).toLocaleDateString("en-IN", opts)}`;
}

export function TournamentCard({ tournament, actionLabel = "View", onAction, to, className }) {
  const t = tournament;
  const navigate = useNavigate();
  const accent = SPORT_ACCENT[t.sport] || t.bannerColor || "#F97316";
  const status = STATUS[t.status] || STATUS.upcoming;
  const fillPct = t.capacity ? Math.min(100, Math.round((t.registered / t.capacity) * 100)) : 0;

  // Click priority: explicit onAction → explicit to → V1 manage URL.
  // The default routes to the V1 management screen that matches the
  // tournament's type (group stage / team knockout / direct knockout) —
  // we deliberately don't link to the V2 /tournaments/:id flow anymore;
  // see features/tournaments/lib/manageUrl.js for the branch logic.
  function handleClick() {
    if (onAction) return onAction(t);
    const dest = typeof to === "function" ? to(t) : to;
    navigate(dest || resolveManageUrl(t));
  }

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white",
        "shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200",
        "hover:-translate-y-1 hover:border-gray-300 hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)]",
        className
      )}
    >
      {/* Sport-accent rail — thin, on the left edge */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: accent }}
      />

      <div className="p-5 pl-6 flex flex-col flex-1">
        {/* Sport tag + status */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: accent }}
            />
            {t.sport}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset",
              status.bg, status.text, status.ring
            )}
          >
            {status.dot && <span className="h-1 w-1 rounded-full bg-current animate-pulse" />}
            {status.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-black uppercase tracking-tight leading-tight text-gray-900 line-clamp-2 mb-3">
          {t.name}
        </h3>

        {/* Meta */}
        <div className="space-y-1.5 text-xs text-gray-500">
          <div className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{formatDateRange(t.startDate, t.endDate)}</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{t.city || t.venue}</span>
          </div>
        </div>

        {/* Progress + fee */}
        {t.capacity > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
              <span className="inline-flex items-center gap-1 text-gray-700 tabular-nums">
                <Users className="h-3 w-3" /> {t.registered}/{t.capacity}
              </span>
              {t.fee != null && (
                <span className="inline-flex items-center text-gray-900 tabular-nums">
                  <IndianRupee className="h-3 w-3" />{t.fee}
                </span>
              )}
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${fillPct}%`, background: accent }}
              />
            </div>
          </div>
        )}

        {/* Action — sits at the bottom regardless of card height */}
        <button
          type="button"
          onClick={handleClick}
          className="mt-5 -mb-1 inline-flex items-center gap-1 self-start text-xs font-black uppercase tracking-wider text-orange-500 transition-colors hover:text-orange-600 w-auto"
        >
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </article>
  );
}

export default TournamentCard;
