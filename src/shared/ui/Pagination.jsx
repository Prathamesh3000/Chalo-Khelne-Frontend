import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Pagination — dark, reusable pager for SuperAdmin (and other dark-shell) list
 * screens driven by SERVER-SIDE pagination.
 *
 * Props:
 *   page       current 1-based page
 *   totalPages total number of pages
 *   total      total record count (for the "x–y of N" label)
 *   limit      page size (for the "x–y" range label)
 *   onPage(n)  called with the target page
 *   loading    disables controls while a fetch is in flight
 *
 * Renders nothing when there's a single page (or none) and no records — the
 * caller shows its own empty state.
 */
export default function Pagination({ page = 1, totalPages = 1, total = 0, limit = 10, onPage, loading = false }) {
  if (totalPages <= 1) return null;

  const go = (n) => {
    if (loading) return;
    const target = Math.min(Math.max(1, n), totalPages);
    if (target !== page) onPage?.(target);
  };

  // Compact numbered window: 1 … (p-1) p (p+1) … last
  const nums = [];
  const push = (n) => { if (!nums.includes(n) && n >= 1 && n <= totalPages) nums.push(n); };
  push(1);
  push(page - 1);
  push(page);
  push(page + 1);
  push(totalPages);
  nums.sort((a, b) => a - b);

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap mt-4">
      <p className="text-[12px] text-gray-500">
        Showing <span className="font-mono tabular-nums text-gray-300">{from}</span>–
        <span className="font-mono tabular-nums text-gray-300">{to}</span> of{" "}
        <span className="font-mono tabular-nums text-gray-300">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => go(page - 1)}
          disabled={loading || page <= 1}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-300 hover:bg-white/[0.08] transition disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {nums.map((n, i) => {
          const gap = i > 0 && n - nums[i - 1] > 1;
          return (
            <span key={n} className="flex items-center">
              {gap && <span className="px-1 text-gray-600 text-[12px]">…</span>}
              <button
                onClick={() => go(n)}
                disabled={loading}
                aria-current={n === page ? "page" : undefined}
                className={`min-w-8 h-8 px-2 rounded-md text-[13px] font-semibold transition disabled:opacity-50 ${
                  n === page
                    ? "bg-white/[0.12] text-white"
                    : "text-gray-400 hover:bg-white/[0.06] hover:text-gray-200"
                }`}
              >
                {n}
              </button>
            </span>
          );
        })}

        <button
          onClick={() => go(page + 1)}
          disabled={loading || page >= totalPages}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-300 hover:bg-white/[0.08] transition disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
