import { Routes, Route } from "react-router-dom";
import { AppLayout } from "./shared/layout";
import TrainerDashboard from "./Trainer/TrainerDashboard";
import TrainerHistory from "./Trainer/TrainerHistory";
import TrainerCurrentSession from "./Trainer/TrainerCurrentSessions";
import TrainerSessions from "./Trainer/TrainerSessions";
import TrainerProfile from "./Trainer/TrainerProfile";
import TrainerRequests from "./Trainer/TrainerRequests";
import TrainerPlayerRequests from "./Trainer/TrainerPlayerRequests";
import TrainerUpcomingSessions from "./Trainer/TrainerUpcomingSessions";
import TSocial from "./Trainer/TSocial";
import TNews from "./Trainer/TNews";
import ProtectedRoute, { ROLES } from "./components/ProtectedRoute";

const TrainerApp = () => {
  return (
    <Routes>
      <Route element={<AppLayout role="trainer" />}>
        <Route element={<ProtectedRoute allowedRoles={ROLES.trainer} />}>
          <Route path="/trainer-dashboard" element={<TrainerDashboard />} />
          <Route path="/trainer-history" element={<TrainerHistory />} />
          <Route
            path="/trainer-upcoming"
            element={<TrainerUpcomingSessions />}
          />
          <Route path="/trainer-current" element={<TrainerCurrentSession />} />
          <Route path="/trainer-profile" element={<TrainerProfile />} />
          <Route path="/trainer-sessions" element={<TrainerSessions />} />
          <Route path="/trainer-requests" element={<TrainerRequests />} />
          <Route
            path="/trainer/player-requests"
            element={<TrainerPlayerRequests />}
          />
          <Route path="/trainer-social" element={<TSocial />} />
          <Route path="/trainer-news" element={<TNews />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default TrainerApp;
