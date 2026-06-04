import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "../lib";

/**
 * Contained pill tab bar — dark theme (manager workspace).
 *
 *   Container: bg-white/[0.04], p-1, rounded-md, border-white/[0.06], w-fit
 *   Tab:       rounded-[5px], text-[13px], font-medium
 *   Inactive:  text-gray-400, hover:text-white
 *   Active:    bg-[#181A22], text-white, subtle shadow
 *   Count:     orange-500 + white on active; white/8 + gray on inactive
 *
 * URL sync mode (recommended for any tab worth refreshing/deep-linking):
 *   <TabBar urlKey="tab" tabs={[…]} defaultKey="players" />
 * Controlled mode:
 *   <TabBar tabs={[…]} value={x} onChange={setX} />
 *
 * Tab descriptor: { key, label, icon?, count?, hidden? }
 */
export function TabBar({
  tabs,
  value,
  onChange,
  urlKey,
  defaultKey,
  className,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const visible = useMemo(() => (tabs || []).filter((t) => !t.hidden), [tabs]);

  const activeFromUrl = urlKey ? searchParams.get(urlKey) : null;
  const active = value ?? activeFromUrl ?? defaultKey ?? visible[0]?.key;

  const handleClick = useCallback(
    (key) => {
      if (urlKey) {
        const next = new URLSearchParams(searchParams);
        next.set(urlKey, key);
        // Push (not replace) so each tab click is its own history entry.
        // Without this, navigating Tab → child page → browser-back lands the
        // user on whatever was BEFORE the tab page instead of the tab they
        // were last on — e.g., open Groups tab → match scoreboard → back
        // would skip "Groups" and bounce all the way to the Players default.
        setSearchParams(next);
      }
      onChange?.(key);
    },
    [urlKey, onChange, searchParams, setSearchParams]
  );

  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 p-1 rounded-md w-fit",
        className
      )}
      style={{
        // Recessed track — darker than both the page (#0F1117) and the card
        // (#181A22) so the raised active tab reads as a lifted pill against
        // either surface.
        background: "rgba(0,0,0,0.30)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {visible.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleClick(tab.key)}
            className={cn(
              "inline-flex items-center gap-1.5 h-7 px-3 rounded-[5px] text-[13px] font-medium transition-all w-auto whitespace-nowrap",
              isActive
                ? "text-white"
                : "text-gray-400 hover:text-white"
            )}
            style={
              isActive
                ? {
                    // Raised active pill — distinctly lighter than the
                    // recessed track, regardless of whether the bar sits on
                    // the page bg or inside a card.
                    background: "#2A2D36",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.06)",
                  }
                : undefined
            }
          >
            {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
            <span>{tab.label}</span>
            {tab.count != null && (
              <span
                className="tabular-nums text-[10px] font-bold rounded-full px-1.5 min-w-[1.1rem] h-4 inline-flex items-center justify-center"
                style={{
                  background: isActive ? "#f97316" : "rgba(255,255,255,0.08)",
                  color:      isActive ? "#ffffff" : "#9ca3af",
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Underline sub-tabs — dark theme.
 *
 *   Track:   full-width, 0.5px bottom border on rgba(255,255,255,0.06)
 *   Tab:     text-[13px], muted default, no underline
 *   Active:  orange underline (2px), text-orange-400, font-medium
 *   Hover:   text-white (was gray-700 — invisible on dark)
 */
export function SubTabs({ tabs, value, onChange, urlKey, defaultKey, className }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const visible = (tabs || []).filter((t) => !t.hidden);

  const activeFromUrl = urlKey ? searchParams.get(urlKey) : null;
  const active = value ?? activeFromUrl ?? defaultKey ?? visible[0]?.key;

  const handleClick = (key) => {
    if (urlKey) {
      const next = new URLSearchParams(searchParams);
      next.set(urlKey, key);
      // Push (not replace) for the same reason TabBar above does — sub-tab
      // clicks should be real history entries so browser back restores them.
      setSearchParams(next);
    }
    onChange?.(key);
  };

  return (
    <div
      role="tablist"
      className={cn("flex items-center gap-6 w-full", className)}
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      {visible.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleClick(tab.key)}
            className={cn(
              "relative inline-flex items-center gap-1.5 -mb-px py-3 text-[13px] transition-colors w-auto whitespace-nowrap",
              isActive
                ? "text-orange-400 font-medium"
                : "text-gray-400 hover:text-white font-normal"
            )}
          >
            <span>{tab.label}</span>
            {tab.count != null && (
              <span
                className={cn(
                  "font-mono tabular-nums text-[10px]",
                  isActive ? "text-orange-300" : "text-gray-500"
                )}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full"
                style={{ background: "#f97316" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default TabBar;
