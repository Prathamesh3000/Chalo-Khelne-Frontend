import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, ArrowRight } from "lucide-react";
import { cn } from "../../../shared/lib";

const NAV = [
  { label: "Features",  href: "#features" },
  { label: "Sports",    href: "#sports" },
  { label: "For Clubs", href: "#for-clubs" },
  { label: "Contact",   href: "#inquire" },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-white/10 bg-[#0A0A0A]/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/l/home" className="inline-flex items-center gap-2 w-auto">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-orange-500 font-black text-white">
            CK
          </span>
          <span className="text-sm font-black uppercase tracking-wider text-white">
            Chalo Khelne
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm font-semibold uppercase tracking-wide text-white/70 transition-colors hover:text-white w-auto"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            to="/login"
            className="inline-flex h-9 items-center rounded-md px-3 text-sm font-semibold uppercase tracking-wide text-white/70 transition-colors hover:text-white w-auto"
          >
            Sign in
          </Link>
          <a
            href="#inquire"
            className="group relative inline-flex h-10 items-center gap-1.5 overflow-hidden rounded-md bg-orange-500 px-4 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-orange-500/30 transition-all hover:bg-orange-600 active:scale-[0.97] w-auto"
          >
            <span className="relative z-10">Get Started</span>
            <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 -z-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-0 group-hover:animate-shine group-hover:opacity-100"
            />
          </a>
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-md text-white transition-colors hover:bg-white/10 md:hidden w-auto"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "fixed inset-0 top-16 z-40 bg-[#0A0A0A] transition-opacity duration-300 md:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <div className="flex h-full flex-col gap-2 px-6 pb-10 pt-8">
          {NAV.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              style={{
                transitionDelay: open ? `${100 + i * 70}ms` : "0ms",
                transform: open ? "translateY(0)" : "translateY(20px)",
                opacity: open ? 1 : 0,
              }}
              className="border-b border-white/10 py-4 text-3xl font-black uppercase tracking-tight text-white transition-all duration-300 w-auto"
            >
              {item.label}
            </a>
          ))}
          <div className="mt-auto flex flex-col gap-3">
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="inline-flex h-12 items-center justify-center rounded-md border border-white/20 text-base font-bold uppercase tracking-wide text-white w-auto"
            >
              Sign in
            </Link>
            <a
              href="#inquire"
              onClick={() => setOpen(false)}
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-md bg-orange-500 text-base font-bold uppercase tracking-wide text-white w-auto"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

export default LandingHeader;
