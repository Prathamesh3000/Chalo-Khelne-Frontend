import { Routes, Route, Navigate } from "react-router-dom";
import AgencyLayout from "./EventOS/AgencyLayout";
import Dashboard from "./EventOS/Dashboard";
import EventPlanner from "./EventOS/EventPlanner";
import EventDetail from "./EventOS/EventDetail";
import EventChecklist from "./EventOS/EventChecklist";
import SchedulePlanner from "./EventOS/SchedulePlanner";
import TeamsPlayers from "./EventOS/TeamsPlayers";
import Schools from "./EventOS/Schools";
import Corporate from "./EventOS/Corporate";
import Clubs from "./EventOS/Clubs";
import OfficialsHub from "./EventOS/OfficialsHub";
import StaffHub from "./EventOS/StaffHub";
import VenueManager from "./EventOS/VenueManager";
import EquipmentLog from "./EventOS/EquipmentLog";
import Registrations from "./EventOS/Registrations";
import FinanceLedger from "./EventOS/FinanceLedger";
import SponsorsHub from "./EventOS/SponsorsHub";
import ReportsAnalytics from "./EventOS/ReportsAnalytics";
import TournamentBoard from "./EventOS/TournamentBoard";
import Placeholder from "./EventOS/Placeholder";

// Reused manager tournament-management screens — they own their own full-screen
// chrome and work for any authenticated owner (the agency owns its tournaments
// via managerId, and has tournament:manage/score permissions).
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
 * AgencyApp — the IONIX Sports Events "Event OS" role shell.
 * Rendered by App.jsx for agency web roles (agency_admin / event_manager /
 * coordinator). Event-OS routes live under /agency/*; tournament management
 * reuses the manager screens under /tournament-management/*.
 */
const AgencyApp = () => (
  <Routes>
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

    {/* Event OS shell */}
    <Route element={<AgencyLayout />}>
      <Route path="/agency/dashboard" element={<Dashboard />} />
      <Route path="/agency/planner" element={<EventPlanner />} />
      <Route path="/agency/tournament" element={<TournamentBoard />} />
      <Route path="/agency/checklist" element={<EventChecklist />} />
      <Route path="/agency/schedule" element={<SchedulePlanner />} />
      <Route path="/agency/teams" element={<TeamsPlayers />} />
      <Route path="/agency/schools" element={<Schools />} />
      <Route path="/agency/corporate" element={<Corporate />} />
      <Route path="/agency/clubs" element={<Clubs />} />
      <Route path="/agency/officials" element={<OfficialsHub />} />
      <Route path="/agency/staff" element={<StaffHub />} />
      <Route path="/agency/venue" element={<VenueManager />} />
      <Route path="/agency/equipment" element={<EquipmentLog />} />
      <Route path="/agency/registration" element={<Registrations />} />
      <Route path="/agency/finance" element={<FinanceLedger />} />
      <Route path="/agency/sponsors" element={<SponsorsHub />} />
      <Route path="/agency/reports" element={<ReportsAnalytics />} />
      <Route path="/agency/event/:id" element={<EventDetail />} />
      <Route path="/agency/:view" element={<Placeholder />} />
      <Route path="/agency" element={<Navigate to="/agency/dashboard" replace />} />
    </Route>
    <Route path="*" element={<Navigate to="/agency/dashboard" replace />} />
  </Routes>
);

export default AgencyApp;
