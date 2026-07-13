import { Routes, Route, Navigate } from "react-router-dom";
import ClubLayout from "./Club/ClubLayout";
import ClubDashboard from "./Club/ClubDashboard";
import Courts from "./Club/Courts";
import BookingCalendar from "./Club/BookingCalendar";
import Members from "./Club/Members";
import Coupons from "./Club/Coupons";
import CRM from "./Club/CRM";
import Placeholder from "./Club/Placeholder";

/**
 * ClubApp — the new facility-business Club Admin shell (role club_admin).
 * Dark Event-OS themed. Separate from the Academy flow (which stays on the
 * legacy ClubAdmin role). Modules under /club/* are built phase-by-phase;
 * unbuilt ones fall through to the Placeholder.
 */
const ClubApp = () => (
  <Routes>
    <Route element={<ClubLayout />}>
      <Route path="/club/dashboard" element={<ClubDashboard />} />
      <Route path="/club/courts" element={<Courts />} />
      <Route path="/club/calendar" element={<BookingCalendar />} />
      <Route path="/club/members" element={<Members />} />
      <Route path="/club/coupons" element={<Coupons />} />
      <Route path="/club/crm" element={<CRM />} />
      <Route path="/club/:view" element={<Placeholder />} />
      <Route path="/club" element={<Navigate to="/club/dashboard" replace />} />
    </Route>
    <Route path="*" element={<Navigate to="/club/dashboard" replace />} />
  </Routes>
);

export default ClubApp;
