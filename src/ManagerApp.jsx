import { Routes, Route } from "react-router-dom";
import { AppLayout } from "./shared/layout";
import ProtectedRoute, { ROLES } from "./components/ProtectedRoute";

// Manager pages
import MDashboard from "./pages/manager/Dashboard";
import MTournamentManagement from "./pages/manager/Tournaments";
import MSlot_Booking from "./Manager/MSlot_Booking";
import MSocial from "./Manager/MSocialV2";
import MRefree from "./Manager/MRefree";
import MTrainers from "./Manager/MTrainers";
import MSettings from "./Manager/MSettings";
import AddTurf from "./Manager/MAddturf";
import MTurfDetails from "./Manager/MTurfDetails";
import MPayments from "./Manager/MPayments";
import MNews from "./Manager/MNews";
import MCoupons from "./Manager/MCoupons";
import InviteEmployees from "./Manager/InviteEmployees";
import BulkBookingUpload from "./Manager/BulkBookingUpload";
import NotificationPage from "./Manager/Notification";
import HireRequests from "./Manager/HireRequests";
import PaymentProofReview from "./Manager/PaymentProofReview";
import MGroupChatList from "./Manager/MGroupChatList";
import MGroupChatPage from "./Manager/MGroupChatPage";

// Tournament — legacy (still works, kept for backward compat)
import TeamKnockouts from "./Manager/TeamKnockouts";
import TeamKnockoutMatches from "./Manager/TeamKnockoutMatches";
import TeamKnockoutsScoreboard from "./Manager/TeamKnockoutsScoreboard";
import MGroupStageScoreBoard from "./Manager/MGroupStageScoreBoard";
import MGroupStageManagement from "./Manager/MGroupStageManagement";
import MDirectKnockout from "./Manager/MDirectKnockout";
import MSwiss from "./Manager/MSwiss";
import MCheckIn from "./Manager/MCheckIn";
import MPointsTableScreen from "./Manager/MPointsTableScreen";
import MatchScoringPage from "./Manager/GroupTabs/MatchScoringPage";

// Tournament — V2 route-based pages
import TournamentOverviewPage from "./Manager/Tournament/TournamentOverviewPage";
import PlayersPage from "./Manager/Tournament/PlayersPage";
import GroupListPage from "./Manager/Tournament/GroupListPage";
import GroupDetailPage from "./Manager/Tournament/GroupDetailPage";
import KnockoutPage from "./Manager/Tournament/KnockoutPage";
import CourtsPage from "./Manager/Tournament/CourtsPage";
import StaffApplicationsPage from "./Manager/Tournament/StaffApplicationsPage";
import AllStaffApplicationsPage from "./Manager/AllStaffApplicationsPage";
import TournamentLeaderboard from "./Manager/TournamentLeaderboard";

// Feature modules
import { LiveMatchPage } from "./features/live";
import { TournamentDashboardPage } from "./features/dashboard";
// Group chat: Manager uses MGroupChatList/MGroupChatPage wrappers (above) that
// supply the dark ManagerShell chrome around the shared ChatList/ChatPage.

const ManagerApp = () => {
  return (
    <Routes>
      {/* ═══════════════════════════════════════════════════
          FULL-SCREEN PAGES (no sidebar/topbar)
          Used for scoreboards, live scoring, immersive views
          ═══════════════════════════════════════════════════ */}
      <Route path="/tournament-management/team-knockouts/:id/scoreboard" element={<TeamKnockoutsScoreboard />} />
      <Route path="/tournament-management/group-stage/:id/scoreboard" element={<MGroupStageScoreBoard />} />
      <Route path="/tournament-management/match/:tournamentId/:matchId/score" element={<MatchScoringPage />} />
      <Route path="/live/:matchId" element={<LiveMatchPage />} />
      <Route path="/tournaments/:tournamentId/live/:matchId" element={<LiveMatchPage />} />

      {/* ═══════════════════════════════════════════════════
          CUSTOM-SHELL PAGES (own their own sidebar+topbar)
          /mdashboard uses ManagerShell; /tournament-management/*
          uses TournamentShell. Both sit OUTSIDE AppLayout to avoid
          double-chrome rendering.
          ═══════════════════════════════════════════════════ */}
      <Route element={<ProtectedRoute allowedRoles={ROLES.manager} />}>
        <Route path="/mdashboard" element={<MDashboard />} />
        <Route path="/mtournament-management" element={<MTournamentManagement />} />
        <Route path="/tournament-management/group-stage" element={<MGroupStageManagement />} />
        <Route path="/tournament-management/team-knockouts" element={<TeamKnockouts />} />
        <Route path="/tournament-management/direct-knockout" element={<MDirectKnockout />} />
        <Route path="/tournament-management/swiss" element={<MSwiss />} />
        {/* Tournament-day check-in — the draw is built from who is present. */}
        <Route path="/tournament-management/check-in" element={<MCheckIn />} />
        {/* Pages that own their dark ManagerShell chrome — must stay outside AppLayout to avoid double sidebar. */}
        <Route path="/mcoupons"      element={<MCoupons />} />
        <Route path="/msettings"     element={<MSettings />} />
        <Route path="/mslot-Booking" element={<MSlot_Booking />} />
        <Route path="/msocial"       element={<MSocial />} />
        <Route path="/mrefree"       element={<MRefree />} />
        <Route path="/payments"          element={<MPayments />} />
        <Route path="/notification"      element={<NotificationPage />} />
        <Route path="/invite-employees"  element={<InviteEmployees />} />
        <Route path="/bulk-booking"      element={<BulkBookingUpload />} />
        <Route path="/hire-requests"        element={<HireRequests />} />
        <Route path="/payment-proof-review" element={<PaymentProofReview />} />
        <Route path="/staff-applications"   element={<AllStaffApplicationsPage />} />
        <Route path="/turf-details/:id"     element={<MTurfDetails />} />
        <Route path="/mtrainers"            element={<MTrainers />} />
        <Route path="/group-chat"           element={<MGroupChatList />} />
        <Route path="/group-chat/:chatId"   element={<MGroupChatPage />} />
      </Route>

      {/* ═══════════════════════════════════════════════════
          APP LAYOUT (dark sidebar + topbar)
          All standard manager pages render inside this
          ═══════════════════════════════════════════════════ */}
      <Route element={<AppLayout role="manager" />}>
        <Route element={<ProtectedRoute allowedRoles={ROLES.manager} />}>

          {/* Dashboard route moved above (uses ManagerShell). */}

          {/* Tournament Management list route moved above (uses ManagerShell). */}
          {/* /staff-applications moved above — uses dark ManagerShell. */}
          {/* /hire-requests moved above — uses dark ManagerShell. */}
          {/* /invite-employees and /bulk-booking moved above — both use dark ManagerShell. */}

          {/* Facility */}
          {/* /mslot-Booking and /turf-details/:id moved above — both use dark ManagerShell. */}

          {/* Management */}
          {/* /msocial, /mrefree, /mtrainers moved above — all use dark ManagerShell. */}
          <Route path="/mnews" element={<MNews />} />

          {/* Finance */}
          {/* /payments, /mcoupons, /payment-proof-review moved above — all use dark ManagerShell. */}

          {/* Group Chat moved above — uses dark MGroupChatList/MGroupChatPage wrappers. */}

          {/* Notifications & Settings */}
          {/* /notification and /msettings moved above — both use dark ManagerShell. */}

          {/* Team Knockout — entry route moved above (uses TournamentShell). */}
          <Route path="/tournament-management/team-knockouts/:id/matches" element={<TeamKnockoutMatches />} />

          {/* Direct Knockout entry route moved above (uses TournamentShell). */}

          {/* V2 Tournament Pages */}
          <Route path="/tournaments/:tournamentId" element={<TournamentOverviewPage />} />
          <Route path="/tournaments/:tournamentId/dashboard" element={<TournamentDashboardPage />} />
          <Route path="/tournaments/:tournamentId/players" element={<PlayersPage />} />
          <Route path="/tournaments/:tournamentId/groups" element={<GroupListPage />} />
          <Route path="/tournaments/:tournamentId/groups/:groupId" element={<GroupDetailPage />} />
          <Route path="/tournaments/:tournamentId/knockout" element={<KnockoutPage />} />
          <Route path="/tournaments/:tournamentId/courts" element={<CourtsPage />} />
          <Route path="/tournaments/:tournamentId/staff" element={<StaffApplicationsPage />} />

          {/* Legacy Group Stage (backward compat) — entry route moved above. */}
          <Route path="/tournament-management/group-stage/:tournamentId/:groupId/scoreboard" element={<MGroupStageScoreBoard />} />
          <Route path="/tournament-management/group-stage/:tournamentId/:groupId/points-table" element={<MPointsTableScreen />} />
          <Route path="/tournament-management/group-stage/:tournamentId/leaderboard" element={<TournamentLeaderboard />} />
          <Route path="/tournament-management/group-stage/:tournamentId/final-knockout" element={
            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Final Knockout Phase</h2>
              <p className="text-gray-500">Individual player knockout — coming soon</p>
            </div>
          } />

        </Route>
      </Route>
    </Routes>
  );
};

export default ManagerApp;
