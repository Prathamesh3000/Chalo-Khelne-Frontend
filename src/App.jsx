import { Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import { homeForRole, PUBLIC_HOME } from "./features/auth/roleHome";
import useDocumentTitle from "./shared/hooks/useDocumentTitle";
import Login from "./pages/auth/Login";

import { lazy, Suspense, useContext } from "react";

// §4.1 — the eleven role applications are code-split.
//
// They were all imported at module scope, so the single bundle was
// 5.35 MB raw / 1.36 MB gzipped with ZERO Suspense boundaries. A visitor
// landing on the public marketing page downloaded the SuperAdmin console,
// the RBAC screens, the club-admin finance module, the vendor marketplace
// and the Event OS shell before anything became interactive — for a page
// that needs perhaps 3% of it.
//
// This was also the multiplier on §2.3: with every portal already in
// memory, a failed role guard cost an attacker nothing to exploit. Now a
// portal's code is only fetched once its guard has admitted you.
const ManagerApp = lazy(() => import("./ManagerApp"));
const PlayerApp = lazy(() => import("./PlayerApp"));
const LandingApp = lazy(() => import("./LandingApp"));
const ClubAdminApp = lazy(() => import("./ClubAdminApp"));
const ClubApp = lazy(() => import("./ClubApp"));
const CorporateApp = lazy(() => import("./CorporateApp"));
const SuperAdminapp = lazy(() => import("./SuperAdminapp"));
const TrainerApp = lazy(() => import("./TrainerApp"));
const VendorApp = lazy(() => import("./VendorApp"));
const AgencyApp = lazy(() => import("./AgencyApp"));
const RegisterTurf = lazy(() => import("./pages/RegisterTurf"));
// /for-organizers — the B2B page. LandingLayout is lazy too: importing it
// statically would pull the landing header and footer into the main bundle for
// every dashboard user, undoing the §4.1 split. Safe because the whole route
// tree below already sits inside one <Suspense>.
const ForOrganizers = lazy(() => import("./pages/landing/ForOrganizers"));
const LandingLayout = lazy(() => import("./features/landing/LandingLayout"));
const LAboutus = lazy(() => import('./Landing-Page/LAboutus'));
const LPrivacyPolicy = lazy(() => import('./Landing-Page/LPrivacyPolicy'));
const LTermsConditions = lazy(() => import('./Landing-Page/LTermsConditions'));
const LFAQs = lazy(() => import('./Landing-Page/LFAQs'));
const LHelpandSupport = lazy(() => import('./Landing-Page/LHelpandSupport'));



/**
 * Shown while a role application's chunk downloads. Intentionally dependency-
 * free so it cannot itself pull anything into the initial bundle.
 */
function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#6B7280",
        fontSize: 14,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      Loading…
    </div>
  );
}

const App = () => {
  const { auth, isAuthenticated } = useContext(AuthContext);
  // §9.1 — every route in all eleven portals shared one tab title.
  useDocumentTitle();
  const role = auth?.role?.toLowerCase() || "player";
  // IONIX Event OS — office agency roles land in the AgencyApp shell.
  const isAgency = ["agencyadmin", "event_manager", "eventmanager", "coordinator"].includes(role);

  return (
    // One boundary for the whole route tree. Route-level fallbacks land in
    // §5.4/§9.2; this is the change that removes the payload.
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
      {/* /register removed — web is admin-only. Players register on mobile;
          admin roles (ClubAdmin/Manager/Corporate) are created by SuperAdmin. */}

      {/* Default route */}
      {/* Default route.
          §9.2 — was a nine-branch nested ternary that disagreed with the map
          LoginForm used. Both now read features/auth/roleHome.js. */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={homeForRole(role)} replace />
          ) : (
            <Navigate to={PUBLIC_HOME} replace />
          )
        }
      />
      <Route path="/about-us" element={<LAboutus />} />
      <Route path="/privacy-policy" element={<LPrivacyPolicy />} />
      <Route path="/terms-and-conditions" element={<LTermsConditions />} />
      <Route path="/faq" element={<LFAQs />} />
      <Route path="/help-support" element={<LHelpandSupport />} />

      {/* Public marketing page for tournament organizers.
          Deliberately top-level rather than under /l/* for two reasons: the URL
          goes on posters, QR codes and bracket PDF footers, where "/l/" means
          nothing to a human — and /l/* redirects any authenticated visitor to
          their dashboard, which would stop you opening your own sales page
          mid-demo and stop a club admin forwarding it to a fellow organizer.
          Wrapped in LandingLayout so it gets the landing header and footer.
          The -isers spelling redirects in; -izers is canonical. */}
      <Route element={<LandingLayout />}>
        <Route path="/for-organizers" element={<ForOrganizers />} />
      </Route>
      <Route path="/for-organisers" element={<Navigate to="/for-organizers" replace />} />

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
    </Suspense>
  );
};

export default App;
