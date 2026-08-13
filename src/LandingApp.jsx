import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

// §4.1 — the landing sub-pages are split too. A visitor arriving at /l/home
// was downloading Events, Turf, Trainer, Social and News as well; only Home is
// needed to make the page interactive.
const LHomeV2 = lazy(() => import("./pages/landing/Home"));
const LEvent = lazy(() => import("./Landing-Page/LEvent"));
const LTurfContent = lazy(() => import("./Landing-Page/LTurfContent"));
const LTrainer = lazy(() => import("./Landing-Page/LTrainer"));
const LSocial = lazy(() => import("./Landing-Page/LSocial"));
const LNews = lazy(() => import("./Landing-Page/LNews"));

// Header + footer are rendered once by LandingLayout, which wraps the whole
// tree — so every /l/* route gets them, including any added later. Previously
// only LHomeV2 rendered chrome and the other five routes had none at all: no
// logo, no menu, no links.
import LandingLayout from "./features/landing/LandingLayout";

const LandingApp = () => {
  return (
    <Suspense fallback={<div style={{minHeight:"50vh"}} />}>
    <Routes>
      <Route element={<LandingLayout />}>
        <Route path="/" element={<LHomeV2 />} />
        <Route path="home" element={<LHomeV2 />} />
        <Route path="event" element={<LEvent />} />
        <Route path="turf-content" element={<LTurfContent />} />
        <Route path="trainer" element={<LTrainer />} />
        <Route path="social" element={<LSocial />} />
        <Route path="news" element={<LNews />} />
      </Route>
    </Routes>
    </Suspense>
  );
};

export default LandingApp;
