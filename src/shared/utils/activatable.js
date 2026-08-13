/**
 * Make a non-button element behave like a button — for mouse AND keyboard.
 *
 * §9.1: the audit counted 68 `<div onClick>` against 7 uses of tabIndex —
 * elements that look and behave like controls but are not focusable, not
 * keyboard-activatable, and not announced as controls by a screen reader.
 *
 * Most of that count was actually modal panels carrying
 * `onClick={(e) => e.stopPropagation()}` (containers, not controls — giving
 * those button semantics would be wrong) and backdrop overlays, which now have
 * dialog semantics instead. The genuine controls use this.
 *
 *   <div {...activatable(() => go(tab))} className="…">
 *
 * Prefer a real <button> in new code. This exists for the cases where the
 * element is a card or row whose styling would fight button defaults.
 */
export function activatable(handler, { disabled = false } = {}) {
  if (disabled) return { "aria-disabled": true };
  return {
    role: "button",
    tabIndex: 0,
    onClick: handler,
    onKeyDown: (e) => {
      // Space and Enter are what a real button responds to. preventDefault on
      // Space stops the page scrolling underneath.
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handler(e);
      }
    },
  };
}

export default activatable;
