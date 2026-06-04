import { Routes, Route } from "react-router-dom";
import LHomeV2 from "./pages/landing/Home";
import LEvent from "./Landing-Page/LEvent";
import LTurfContent from "./Landing-Page/LTurfContent";
import LTrainer from "./Landing-Page/LTrainer";
import LSocial from "./Landing-Page/LSocial";
import LNews from "./Landing-Page/LNews";

// Note: the new landing page (LHomeV2) ships with its own dark LandingHeader.
// The legacy LNavbar that used to wrap this whole tree has been removed so
// the new hero isn't fighting two stacked top bars. Inner /l/* routes that
// still expect the legacy navbar should opt in per-route as we migrate them.
const LandingApp = () => {
  return (
    <Routes>
      <Route path="/" element={<LHomeV2 />} />
      <Route path="home" element={<LHomeV2 />} />
      <Route path="event" element={<LEvent />} />
      <Route path="turf-content" element={<LTurfContent />} />
      <Route path="trainer" element={<LTrainer />} />
      <Route path="social" element={<LSocial />} />
      <Route path="news" element={<LNews />} />
    </Routes>
  );
};

export default LandingApp;
