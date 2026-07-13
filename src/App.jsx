import { Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import Login from "./pages/auth/Login";
import ManagerApp from "./ManagerApp";
import PlayerApp from "./PlayerApp";
import LandingApp from "./LandingApp";
import ClubAdminApp from "./ClubAdminApp";
import ClubApp from "./ClubApp";
import CorporateApp from "./CorporateApp";
import SuperAdminapp from "./SuperAdminapp";
import TrainerApp from "./TrainerApp";
import VendorApp from "./VendorApp";
import AgencyApp from "./AgencyApp";
import RegisterTurf from "./pages/RegisterTurf";
import LAboutus from './Landing-Page/LAboutus';
import LPrivacyPolicy from './Landing-Page/LPrivacyPolicy';
import LTermsConditions from './Landing-Page/LTermsConditions';
import LFAQs from './Landing-Page/LFAQs';
import LHelpandSupport from './Landing-Page/LHelpandSupport';

import { useContext } from "react";

const App = () => {
  const { auth, isAuthenticated } = useContext(AuthContext);
  const role = auth?.role?.toLowerCase() || "player";
  // IONIX Event OS — office agency roles land in the AgencyApp shell.
  const isAgency = ["agencyadmin", "event_manager", "eventmanager", "coordinator"].includes(role);

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
      {/* /register removed — web is admin-only. Players register on mobile;
          admin roles (ClubAdmin/Manager/Corporate) are created by SuperAdmin. */}

      {/* Default route */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            role === "superadmin" ? (
              <Navigate to="/home" />
            ) : role === "manager" ? (
              <Navigate to="/mdashboard" />
            ) : role === "club_admin" ? (
              <Navigate to="/club/dashboard" />
            ) : role === "clubadmin" ? (
              <Navigate to="/club-dashboard" />
            ) : role === "corporate_admin" ? (
              <Navigate to="/corporate-dashboard" />
            ) : role === "trainer" ? (
              <Navigate to="/trainer-dashboard" />
            ) : role === "vendor" ? (
              <Navigate to="/vendor-dashboard" />
            ) : isAgency ? (
              <Navigate to="/agency/dashboard" />
            ) : (
              <Navigate to="/phome" />
            )
          ) : (
            <Navigate to="/l/home" />
          )
        }
      />
      <Route path="/about-us" element={<LAboutus />} />
      <Route path="/privacy-policy" element={<LPrivacyPolicy />} />
      <Route path="/terms-and-conditions" element={<LTermsConditions />} />
      <Route path="/faq" element={<LFAQs />} />
      <Route path="/help-support" element={<LHelpandSupport />} />

      {/* Landing App routes */}
      <Route
        path="/l/*"
        element={
          isAuthenticated ? (
            role === "superadmin" ? (
              <Navigate to="/home" />
            ) :
              role === "manager" ? (
                <Navigate to="/mdashboard" />
              ) : role === "club_admin" ? (
                <Navigate to="/club/dashboard" />
              ) : role === "clubadmin" ? (
                <Navigate to="/club-dashboard" />
              ) : role === "corporate_admin" ? (
                <Navigate to="/corporate-dashboard" />
              ) : role === "trainer" ? (
                <Navigate to="/trainer-dashboard" />
              ) : role === "vendor" ? (
                <Navigate to="/vendor-dashboard" />
              ) : isAgency ? (
                <Navigate to="/agency/dashboard" />
              ) : (
                <Navigate to="/phome" />
              )
          ) : (
            <LandingApp />
          )
        }
      />

      {/* Self-serve turf registration — available to any authenticated user
          (User principals). Matched over the role catch-all below. */}
      {isAuthenticated && (
        <Route path="/register-turf" element={<RegisterTurf />} />
      )}

      {/* Authenticated routes */}
      {isAuthenticated && (
        <Route
          path="/*"
          element={
            role === "superadmin" ? (
              <SuperAdminapp />
            ) :
              role === "manager" ? (
                <ManagerApp />
              ) : role === "club_admin" ? (
                <ClubApp />
              ) : role === "clubadmin" ? (
                <ClubAdminApp />
              ) : role === "corporate_admin" ? (
                <CorporateApp />
              ) : role === "trainer" ? (
                <TrainerApp />
              ) : role === "vendor" ? (
                <VendorApp />
              ) : isAgency ? (
                <AgencyApp />
              ) : (
                <PlayerApp />
              )
          }
        />
      )}

      {/* Fallback route */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/l/home"} />} />
    </Routes>
  );
};

export default App;
