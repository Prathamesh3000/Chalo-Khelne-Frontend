/* Imported from their own files rather than the features/landing barrel on
   purpose. The barrel also exports Hero, which pulls in Hero3D and with it
   three.js — ~1MB this page has no use for. A marketing page converting cold
   traffic on a phone cannot afford to ship the home page's 3D scene. */
import { OrganizerHero } from "../../features/landing/components/OrganizerHero";
import { TurnUpDraws } from "../../features/landing/components/TurnUpDraws";
import { TournamentDay } from "../../features/landing/components/TournamentDay";
import { OldWayNewWay } from "../../features/landing/components/OldWayNewWay";
import { OrganizerFAQ } from "../../features/landing/components/OrganizerFAQ";
import { OrganizerInquiry } from "../../features/landing/components/OrganizerInquiry";
import { useSmoothScroll } from "../../features/landing/hooks/useSmoothScroll";
import { useDarkLandingChrome } from "../../features/landing/hooks/useDarkLandingChrome";
import {
  ClipboardList, CreditCard, GitBranch, Radio, Users, FileDown, Layers, Gavel,
} from "lucide-react";

/**
 * /for-organizers — the B2B page.
 *
 * Why this exists separately from /l/home: the home page gives Tournaments,
 * Turfs, Social and Coaching equal billing because it has to serve players,
 * clubs, trainers and turf owners at once. An organizer landing there sees a
 * marketplace that also, somewhere, does tournaments — and the one capability
 * that actually wins the deal is not mentioned at all.
 *
 * So this page is aimed at exactly one buyer, and deliberately says nothing
 * about turfs, the social feed or coaching.
 *
 * Nothing here is borrowed from the home page. An earlier cut reused
 * HowItWorks, SportsGrid, CTABanner and the general Inquiry — and each one
 * pulled the argument back towards "a platform for clubs" just as the page had
 * finished making a case to one organizer about one event. Every section below
 * exists to move the same person one step closer to using this for their next
 * tournament:
 *
 *   Hero          — the promise, in their words
 *   TurnUpDraws   — the one capability nobody else has, made playable
 *   TournamentDay — their whole Sunday with it, hour by hour
 *   Toolkit       — what is in the box, once they want the detail
 *   OldWayNewWay  — beating the real incumbent, a WhatsApp group and a sheet
 *   FAQ           — the objections that otherwise kill the deal in silence
 *   Inquiry       — a form that qualifies instead of one that collects
 */

const TOOLKIT = [
  { icon: ClipboardList, title: "Entries & categories", body: "Open registration by category with its own fee. Bulk-import an existing list from Excel." },
  { icon: CreditCard,    title: "Money, collected",     body: "Online payment, UPI QR, or cash at the desk with proof verification. Nothing is marked paid without it." },
  { icon: GitBranch,     title: "Four draw formats",    body: "Knockout, group stage, team knockout with tie formats, and Swiss pairing." },
  { icon: Users,         title: "Day-of check-in",      body: "Mark attendance, admit walk-ins, and draw from who is present." },
  { icon: Radio,         title: "Live scoring",         body: "Scores update in real time on every device watching — including the ones not at the venue." },
  { icon: Gavel,         title: "Referees & officials", body: "Assign officials per match with scoped permissions, so only they can score it." },
  { icon: Layers,        title: "Standings & leaderboards", body: "Group tables and rankings that compute themselves as results land." },
  { icon: FileDown,      title: "Draw sheets & exports", body: "Bracket PDFs and Excel exports for the noticeboard, the association, and your records." },
];

export default function ForOrganizers() {
  useSmoothScroll();
  useDarkLandingChrome();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white antialiased">
      <main>
        <OrganizerHero />
        <TurnUpDraws />
        <TournamentDay />

        {/* What you actually get — kept to the organizer's job, nothing else */}
        <section className="relative overflow-hidden bg-[#0A0A0A] py-24">
          <div className="relative mx-auto max-w-[1300px] px-6 sm:px-10 lg:px-16">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.35em] text-green-500">
              Everything the event needs
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl">
              From the first entry to the <span className="text-green-600">final result.</span>
            </h2>

            <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
              {TOOLKIT.map(({ icon: Icon, title, body }) => (
                <div key={title} className="bg-[#0A0A0A] p-6">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-green-600/15 text-green-400">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-black text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <OldWayNewWay />
        <OrganizerFAQ />
        <OrganizerInquiry />
      </main>
    </div>
  );
}
