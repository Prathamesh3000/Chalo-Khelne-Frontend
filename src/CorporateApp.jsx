import { Routes, Route } from "react-router-dom";
import CorporateDashboard from "./CorporateAdmin/CorporateDashboard";
import CorporateStaff from "./CorporateAdmin/CorporateStaff";
import CorporateProfile from "./CorporateAdmin/CorporateProfile";
import CorporateTournaments from "./CorporateAdmin/CorporateTournaments";
import CoGroupChatList from "./CorporateAdmin/CoGroupChatList";
import CoGroupChatPage from "./CorporateAdmin/CoGroupChatPage";
import CoNotification from "./CorporateAdmin/CoNotification";
import ProtectedRoute from "./components/ProtectedRoute";

// All Corporate pages own their own dark CorporateShell chrome. No AppLayout
// wrap — would double-render the sidebar.
const CorporateApp = () => {
  return (
    <Routes>
      <Route element={<ProtectedRoute role="corporate_admin" />}>
        <Route path="/corporate-dashboard"   element={<CorporateDashboard />} />
        <Route path="/corporate-tournaments" element={<CorporateTournaments />} />
        <Route path="/corporate-staff"       element={<CorporateStaff />} />
        <Route path="/corporate-profile"     element={<CorporateProfile />} />
        <Route path="/notification"          element={<CoNotification />} />
        <Route path="/group-chat"            element={<CoGroupChatList />} />
        <Route path="/group-chat/:chatId"    element={<CoGroupChatPage />} />
      </Route>
    </Routes>
  );
};

export default CorporateApp;
