import { Routes, Route } from "react-router-dom";
import Home from "./pages/super-admin/Dashboard";
import Pending from "./SuperAdmin/Pending";
import Approved from "./SuperAdmin/Approved";
import Inquiries from "./SuperAdmin/Inquiries";
import SportsManagement from "./SuperAdmin/SportsManagement";
import SportsLibrary from "./SuperAdmin/SportsLibrary";
import SportRuleBooks from "./SuperAdmin/SportRuleBooks";
import CategoryTemplates from "./SuperAdmin/CategoryTemplates";
import RbacManagement from "./SuperAdmin/RbacManagement";
import VendorMarketplace from "./SuperAdmin/VendorMarketplace";
import TurfApprovals from "./SuperAdmin/TurfApprovals";
import CreateClubAdmin from "./SuperAdmin/CreateClubAdmin";
import ManageClubs from "./SuperAdmin/ManageClubs";
import BulkUserUpload from "./SuperAdmin/BulkUserUpload";
import SuGroupChatList from "./SuperAdmin/SuGroupChatList";
import SuGroupChatPage from "./SuperAdmin/SuGroupChatPage";
import SuNotification from "./SuperAdmin/SuNotification";
import SuSocial from "./SuperAdmin/SuSocial";
import SuNews from "./SuperAdmin/SuNews";
import ProtectedRoute, { ROLES } from "./components/ProtectedRoute";

// All SuperAdmin pages own their own dark SuperAdminShell chrome. No
// AppLayout wrap — would double-render the sidebar.
// News + VendorMarketplace are out of MVP scope so their routes are dropped.
const SuperAdminapp = () => {
  return (
    <Routes>
      <Route element={<ProtectedRoute allowedRoles={ROLES.superAdmin} />}>
        <Route path="/home"               element={<Home />} />
        <Route path="/pending"            element={<Pending />} />
        <Route path="/approved"           element={<Approved />} />
        <Route path="/inquiries"          element={<Inquiries />} />
        <Route path="/create-club-admin"  element={<CreateClubAdmin />} />
        <Route path="/manage-clubs"       element={<ManageClubs />} />
        <Route path="/sports"             element={<SportsManagement />} />
        <Route path="/sports-library"     element={<SportsLibrary />} />
        <Route path="/rule-books"         element={<SportRuleBooks />} />
        <Route path="/category-templates" element={<CategoryTemplates />} />
        <Route path="/rbac"               element={<RbacManagement />} />
        <Route path="/bulk-user-upload"   element={<BulkUserUpload />} />
        <Route path="/vendor-marketplace" element={<VendorMarketplace />} />
        <Route path="/turf-approvals"     element={<TurfApprovals />} />
        <Route path="/notification"       element={<SuNotification />} />
        <Route path="/su-social"          element={<SuSocial />} />
        <Route path="/news"               element={<SuNews />} />
        <Route path="/group-chat"         element={<SuGroupChatList />} />
        <Route path="/group-chat/:chatId" element={<SuGroupChatPage />} />
      </Route>
    </Routes>
  );
};

export default SuperAdminapp;
