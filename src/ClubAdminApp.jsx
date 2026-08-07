import { Routes, Route } from "react-router-dom";
import ProtectedRoute, { ROLES } from "./components/ProtectedRoute";
import ClubAdminDashboard from "./ClubAdmin/ClubAdminDashboard";
import TurfManagement from "./ClubAdmin/TurfManagement";
import ViewTurf from "./ClubAdmin/ViewTurf";
import EditTurf from "./ClubAdmin/EditTurf";
import PaymentHistory from "./ClubAdmin/PaymentHistory";
import ManagerAdmin from "./ClubAdmin/ManagerAdmin";
import TrainerManagement from "./ClubAdmin/TrainerManagement";
import ClubAdminProfile from "./ClubAdmin/ClubAdminProfile";
import CSocial from "./ClubAdmin/CSocial";
import CNews from "./ClubAdmin/CNews";
import CRefree from "./ClubAdmin/CRefree";
import ClubAdminFinance from "./ClubAdmin/ClubAdminFinance";
import CNotification from "./ClubAdmin/CNotification";
import CGroupChatList from "./ClubAdmin/CGroupChatList";
import CGroupChatPage from "./ClubAdmin/CGroupChatPage";

// All ClubAdmin pages own their own dark ClubAdminShell chrome (mirrors
// ManagerShell). No AppLayout wrap needed — would double-render the sidebar.
const ClubAdminApp = () => {
  return (
    <Routes>
      <Route element={<ProtectedRoute allowedRoles={ROLES.clubAdmin} />}>
        <Route path="/club-dashboard"     element={<ClubAdminDashboard />} />
        <Route path="/turf-management"    element={<TurfManagement />} />
        <Route path="/ClubAdminProfile"   element={<ClubAdminProfile />} />
        <Route path="/turf/:id"           element={<ViewTurf />} />
        <Route path="/turf/edit/:id"      element={<EditTurf />} />
        <Route path="/staff-admin"        element={<ManagerAdmin />} />
        <Route path="/trainer-management" element={<TrainerManagement />} />
        <Route path="/payment-history"    element={<PaymentHistory />} />
        <Route path="/club-social"        element={<CSocial />} />
        <Route path="/club-news"          element={<CNews />} />
        <Route path="/club-refree"        element={<CRefree />} />
        <Route path="/club-finance"       element={<ClubAdminFinance />} />
        <Route path="/notification"       element={<CNotification />} />
        <Route path="/group-chat"         element={<CGroupChatList />} />
        <Route path="/group-chat/:chatId" element={<CGroupChatPage />} />
      </Route>
    </Routes>
  );
};

export default ClubAdminApp;
