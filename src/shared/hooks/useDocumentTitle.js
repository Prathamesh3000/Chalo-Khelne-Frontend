import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Sets the browser tab title from the current route.
 *
 * §9.1 / §4.4: `document.title` was never set anywhere in the app — 0
 * occurrences across 461 files. Every route in all eleven portals shared one
 * tab title, so bookmarks and open tabs were indistinguishable, and a screen
 * reader announced the same page name everywhere.
 *
 * Longest-prefix match, so a nested route inherits its section's title without
 * needing its own entry.
 */

const BRAND = "Chalo Khelne";

const ROUTE_TITLES = [
  ["/tournament-management/check-in", "Check-in"],
  ["/tournament-management/group-stage", "Group stage"],
  ["/tournament-management/direct-knockout", "Knockout bracket"],
  ["/tournament-management/team-knockouts", "Team knockouts"],
  ["/tournament-management/match", "Live scoring"],
  ["/tournament-management", "Tournament management"],
  ["/mtournament-management", "Tournaments"],
  ["/ptournament-management", "Tournaments"],
  ["/payment-proof-review", "Payment reviews"],
  ["/mdashboard", "Manager dashboard"],
  ["/mcoupons", "Coupons"],
  ["/mrefree", "Referees"],
  ["/msocial", "Social"],
  ["/club-dashboard", "Club admin"],
  ["/club/dashboard", "Club dashboard"],
  ["/club/", "Club"],
  ["/corporate-dashboard", "Corporate"],
  ["/trainer-dashboard", "Trainer"],
  ["/vendor-dashboard", "Vendor"],
  ["/agency/", "Event OS"],
  ["/phome", "Home"],
  ["/home", "SuperAdmin"],
  ["/login", "Sign in"],
  ["/l/home", "Chalo Khelne — Play more sport"],
  ["/l/", "Chalo Khelne"],
  ["/about-us", "About us"],
  ["/privacy-policy", "Privacy policy"],
  ["/terms-and-conditions", "Terms & conditions"],
  ["/faq", "FAQs"],
  ["/help-support", "Help & support"],
];

export function titleForPath(pathname) {
  if (!pathname) return BRAND;
  // Longest prefix wins, so /club/dashboard beats /club/.
  const hit = ROUTE_TITLES
    .filter(([prefix]) => pathname.startsWith(prefix))
    .sort((a, b) => b[0].length - a[0].length)[0];
  if (!hit) return BRAND;
  return hit[1] === BRAND || hit[1].startsWith(BRAND)
    ? hit[1]
    : `${hit[1]} · ${BRAND}`;
}

export default function useDocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = titleForPath(pathname);
  }, [pathname]);
}
