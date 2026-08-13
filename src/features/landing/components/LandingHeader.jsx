import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, ArrowRight } from "lucide-react";
import { cn } from "../../../shared/lib";

const NAV = [
  { label: "Tournaments", href: "#tournaments" },
  { label: "Turfs",       href: "#turfs" },
  { label: "Community",   href: "#social" },
  { label: "Sports",      href: "#sports" },
  { label: "For Clubs",   href: "#for-clubs" },
];

/**
 * @param {boolean} solid
 *   Force the opaque treatment and route the section anchors back to the home
 *   page. The default (false) is the home-page behaviour: transparent over the
 *   dark hero until scrolled. On the light inner pages (/l/event, /l/news, …)
 *   transparent means white text on a white background — invisible — and the
 *   bare "#tournaments" anchors point at sections that only exist on home.
 */
export function LandingHeader({ solid = false }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState("");

  const opaque = solid || scrolled;
  // On an inner page the section lives on home, so anchor there instead.
  const anchor = (href) => (solid ? `/l/home${href}` : href);

  /* scrolled state + reading progress */
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? Math.min(1, window.scrollY / h) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* scroll-spy — highlight the section currently in view */
  useEffect(() => {
    const ids = NAV.map((n) => n.href.slice(1));
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive("#" + e.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  /* lock body scroll when mobile menu open */
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
        open
          ? "border-b border-white/10 bg-[#0A0A0A]"
          : opaque
            ? "border-b border-white/10 bg-[#0A0A0A]/80 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
      )}
    >
      {/* reading progress — a home-page device; on an inner page it tracks a
          short scroll and just jitters, so it is hidden there. */}
      {!solid && (
        <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 origin-left bg-green-500" style={{ transform: `scaleX(${progress})` }} />
      )}

      <div className="mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/l/home" className="inline-flex w-auto shrink-0 items-center gap-2.5">
          <img loading="lazy" src="/CK.png" alt="Chalo Khelne" className="h-9 w-auto" />
          <span className="whitespace-nowrap text-sm font-black uppercase tracking-wider text-white">Chalo Khelne</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const on = active === item.href;
            return (
              <a
                key={item.href}
                href={anchor(item.href)}
                className={cn(
                  "relative w-auto whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold uppercase tracking-wide transition-colors",
                  on ? "text-green-400" : "text-white/70 hover:text-white"
                )}
              >
                {item.label}
                <span className={cn("absolute -bottom-0.5 left-3 right-3 h-0.5 rounded-full bg-green-500 transition-all duration-300", on ? "opacity-100" : "opacity-0")} />
              </a>
            );
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <Link to="/login" className="inline-flex h-9 w-auto shrink-0 items-center whitespace-nowrap rounded-md px-3 text-sm font-semibold uppercase tracking-wide text-white/70 transition-colors hover:text-white">
            Sign in
          </Link>
          <a
            href={anchor("#inquire")}
            className="group relative inline-flex h-10 w-auto shrink-0 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-md bg-green-600 px-4 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-green-600/30 transition-all hover:bg-green-700 active:scale-[0.97]"
          >
            <span className="relative z-10">Get Started</span>
            <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 -z-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-0 group-hover:animate-shine group-hover:opacity-100" />
          </a>
        </div>

        <button
          type="button"
          className="relative z-[60] grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/15 bg-white/[0.05] text-white transition-colors hover:bg-white/10 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        style={{ backgroundColor: "#0A0A0A" }}
        className={cn("fixed inset-x-0 bottom-0 top-16 z-40 transition-opacity duration-300 lg:hidden", open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")}
      >
        <div className="flex h-full flex-col gap-2 px-6 pb-10 pt-8">
          {NAV.map((item, i) => (
            <a
              key={item.href}
              href={anchor(item.href)}
              onClick={() => setOpen(false)}
              style={{ transitionDelay: open ? `${100 + i * 70}ms` : "0ms", transform: open ? "translateY(0)" : "translateY(20px)", opacity: open ? 1 : 0 }}
              className={cn(
                "w-auto border-b border-white/10 py-4 text-3xl font-black uppercase tracking-tight transition-all duration-300",
                active === item.href ? "text-green-400" : "text-white"
              )}
            >
              {item.label}
            </a>
          ))}
          <div className="mt-auto flex flex-col gap-3">
            <Link to="/login" onClick={() => setOpen(false)} className="inline-flex h-12 w-auto items-center justify-center rounded-md border border-white/20 text-base font-bold uppercase tracking-wide text-white">
              Sign in
            </Link>
            <a href={anchor("#inquire")} onClick={() => setOpen(false)} className="inline-flex h-12 w-auto items-center justify-center gap-1.5 rounded-md bg-green-600 text-base font-bold uppercase tracking-wide text-white">
              Get Started <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

export default LandingHeader;
