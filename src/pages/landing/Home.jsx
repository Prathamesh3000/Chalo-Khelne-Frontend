import { useEffect } from "react";
// Header and footer now come from LandingLayout, which wraps every /l/* route —
// rendering them here as well would stack two of each.
import {
  Preloader, Hero, ScrollingSportStrip, Tournaments, Turfs, Social,
  Coaching, WhyChaloKhelne, HowItWorks, SportsGrid, ForClubs, Inquiry, CTABanner,
} from "../../features/landing";
import { useSmoothScroll } from "../../features/landing/hooks/useSmoothScroll";

export default function LandingHome() {
  useSmoothScroll();

  /* The app's global body background is light (#F5F7FA). On this dark landing
     page, any sliver of horizontal overflow would otherwise reveal that light
     color as a white strip on the right. Paint the page surfaces dark while the
     landing is mounted, and restore on unmount so dashboards stay light. */
  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const prevHtml = html.style.backgroundColor;
    const prevBody = body.style.backgroundColor;
    html.style.backgroundColor = "#0A0A0A";
    body.style.backgroundColor = "#0A0A0A";
    return () => {
      html.style.backgroundColor = prevHtml;
      body.style.backgroundColor = prevBody;
    };
  }, []);
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
