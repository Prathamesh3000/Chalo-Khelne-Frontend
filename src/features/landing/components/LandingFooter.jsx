import { Link } from "react-router-dom";

const FOOTER_LINKS = [
  {
    title: "Product",
    links: [
      { label: "Features",   href: "#features" },
      { label: "Sports",     href: "#sports" },
      { label: "For Clubs",  href: "#for-clubs" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About",    to: "/about-us" },
      { label: "Privacy",  to: "/privacy-policy" },
      { label: "Terms",    to: "/terms-and-conditions" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help & Support", to: "/help-support" },
      { label: "FAQs",           to: "/faq" },
      { label: "Sign in",        to: "/login" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="bg-[#050505] text-white border-t border-white/10">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-orange-500 text-sm font-black text-white">
                CK
              </span>
              <span className="text-base font-black uppercase tracking-wider text-white">
                Chalo Khelne
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-white/50 leading-relaxed">
              India's sports tournament platform. Built for clubs, managers, referees, and the players who keep the game alive.
            </p>
          </div>

          {FOOTER_LINKS.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.to ? (
                      <Link to={l.to} className="text-sm text-white/70 hover:text-white transition-colors w-auto">
                        {l.label}
                      </Link>
                    ) : (
                      <a href={l.href} className="text-sm text-white/70 hover:text-white transition-colors w-auto">
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-white/40">
          <p>© {new Date().getFullYear()} Chalo Khelne. All rights reserved.</p>
          <p className="font-bold uppercase tracking-wider">Made in India · Built for sports</p>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;
