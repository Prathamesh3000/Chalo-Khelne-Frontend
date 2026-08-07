import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute, { ROLES } from "./components/ProtectedRoute";
import ClubLayout from "./Club/ClubLayout";
import ClubDashboard from "./Club/ClubDashboard";
import Courts from "./Club/Courts";
import BookingCalendar from "./Club/BookingCalendar";
import Members from "./Club/Members";
import Coupons from "./Club/Coupons";
import CRM from "./Club/CRM";
import Coaches from "./Club/Coaches";
import Staff from "./Club/Staff";
import Inventory from "./Club/Inventory";
import Finance from "./Club/Finance";
import Reports from "./Club/Reports";
import Communication from "./Club/Communication";
import Reviews from "./Club/Reviews";
import Settings from "./Club/Settings";
import TournamentBoard from "./Club/TournamentBoard";
import Placeholder from "./Club/Placeholder";

// Reused manager tournament-management screens — they own their own full-screen
// chrome and work for any authenticated owner (the club owns its tournaments via
// managerId=[club _id] and has the tournament:* permissions incl. score).
import MGroupStageManagement from "./Manager/MGroupStageManagement";
import MGroupStageScoreBoard from "./Manager/MGroupStageScoreBoard";
import MatchScoringPage from "./Manager/GroupTabs/MatchScoringPage";
import MDirectKnockout from "./Manager/MDirectKnockout";
import TeamKnockouts from "./Manager/TeamKnockouts";
import TeamKnockoutMatches from "./Manager/TeamKnockoutMatches";
import TeamKnockoutsScoreboard from "./Manager/TeamKnockoutsScoreboard";
import MPointsTableScreen from "./Manager/MPointsTableScreen";
import TournamentLeaderboard from "./Manager/TournamentLeaderboard";

/**
 * ClubApp — the new facility-business Club Admin shell (role club_admin).
 * Dark Event-OS themed. Separate from the Academy flow (which stays on the
 * legacy ClubAdmin role). Modules under /club/* are built phase-by-phase;
 * tournament management reuses the manager screens under /tournament-management/*.
 */
const ClubApp = () => (
  <Routes>
    {/* Every route in this shell requires the matching role — this
        portal previously had no guard of any kind. */}
    <Route element={<ProtectedRoute allowedRoles={ROLES.clubAdmin} />}>
      {/* Tournament management (reused manager screens — own their chrome) */}
      <Route path="/tournament-management/group-stage" element={<MGroupStageManagement />} />
      <Route path="/tournament-management/group-stage/:id/scoreboard" element={<MGroupStageScoreBoard />} />
      <Route path="/tournament-management/group-stage/:tournamentId/:groupId/scoreboard" element={<MGroupStageScoreBoard />} />
      <Route path="/tournament-management/group-stage/:tournamentId/:groupId/points-table" element={<MPointsTableScreen />} />
      <Route path="/tournament-management/group-stage/:tournamentId/leaderboard" element={<TournamentLeaderboard />} />
      <Route path="/tournament-management/match/:tournamentId/:matchId/score" element={<MatchScoringPage />} />
      <Route path="/tournament-management/direct-knockout" element={<MDirectKnockout />} />
      <Route path="/tournament-management/team-knockouts" element={<TeamKnockouts />} />
      <Route path="/tournament-management/team-knockouts/:id/matches" element={<TeamKnockoutMatches />} />
      <Route path="/tournament-management/team-knockouts/:id/scoreboard" element={<TeamKnockoutsScoreboard />} />

      {/* Club OS shell */}
      <Route element={<ClubLayout />}>
        <Route path="/club/dashboard" element={<ClubDashboard />} />
        <Route path="/club/courts" element={<Courts />} />
        <Route path="/club/calendar" element={<BookingCalendar />} />
        <Route path="/club/tournament" element={<TournamentBoard />} />
        <Route path="/club/members" element={<Members />} />
        <Route path="/club/coupons" element={<Coupons />} />
        <Route path="/club/crm" element={<CRM />} />
        <Route path="/club/coaches" element={<Coaches />} />
        <Route path="/club/staff" element={<Staff />} />
        <Route path="/club/inventory" element={<Inventory />} />
        <Route path="/club/finance" element={<Finance />} />
        <Route path="/club/reports" element={<Reports />} />
        <Route path="/club/communication" element={<Communication />} />
        <Route path="/club/reviews" element={<Reviews />} />
        <Route path="/club/settings" element={<Settings />} />
        <Route path="/club/:view" element={<Placeholder />} />
        <Route path="/club" element={<Navigate to="/club/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/club/dashboard" replace />} />
    </Route>
  </Routes>
);

export default ClubApp;
