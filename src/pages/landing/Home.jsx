// Header and footer now come from LandingLayout, which wraps every /l/* route —
// rendering them here as well would stack two of each.
import {
  Preloader, Hero, ScrollingSportStrip, Tournaments, Turfs, Social,
  Coaching, WhyChaloKhelne, HowItWorks, SportsGrid, ForClubs, Inquiry, CTABanner,
} from "../../features/landing";
import { useSmoothScroll } from "../../features/landing/hooks/useSmoothScroll";
import { useDarkLandingChrome } from "../../features/landing/hooks/useDarkLandingChrome";

export default function LandingHome() {
  useSmoothScroll();

  /* Dark surfaces + hidden page scrollbars + horizontal-overflow clipping,
     all reverted on unmount. Shared with /for-organizers — see the hook. */
  useDarkLandingChrome();
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white antialiased">
      <Preloader />
      <main>
        <Hero />
        <ScrollingSportStrip />
        <Tournaments />
        <Turfs />
        <Social />
        <Coaching />
        <WhyChaloKhelne />
        <HowItWorks />
        <SportsGrid />
        <ForClubs />
        <CTABanner />
        <Inquiry />
      </main>
    </div>
  );
}
