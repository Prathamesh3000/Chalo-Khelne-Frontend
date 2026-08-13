import { Menu } from "lucide-react";

/**
 * Opens the sidebar drawer. Hidden at lg and up, where the sidebar is a static
 * column and there is nothing to open.
 *
 * 44×44 — the minimum comfortable touch target, and the reason this is a
 * component rather than an inline button: it is the first control a tablet user
 * reaches for on every screen.
 */
export default function ShellHamburger({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open menu"
      className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-gray-300 hover:bg-white/[0.06] hover:text-white lg:hidden"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
