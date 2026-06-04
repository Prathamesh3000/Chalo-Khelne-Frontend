import {
  LandingHeader, Hero, ScrollingSportStrip, StatsBar,
  HowItWorks, SportsGrid, ForClubs, CTABanner, LandingFooter,
} from "../../features/landing";

export default function LandingHome() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white antialiased">
      <style>{`html { scroll-behavior: smooth; }`}</style>
      <LandingHeader />
      <main>
        <Hero />
        <ScrollingSportStrip />
        <StatsBar />
        <HowItWorks />
        <SportsGrid />
        <ForClubs />
        <CTABanner />
      </main>
      <LandingFooter />
    </div>
  );
}
