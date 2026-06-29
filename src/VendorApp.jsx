import { Routes, Route } from "react-router-dom";
import { AppLayout } from "./shared/layout";
import ProtectedRoute from "./components/ProtectedRoute";
import VendorDashboard from "./Vendor/VendorDashboard";
import VendorProfile from "./Vendor/VendorProfile";
import VendorIncoming from "./Vendor/VendorIncoming";
import VendorAcquisitions from "./Vendor/VendorAcquisitions";
import VSocial from "./Vendor/VSocial";
import VNews from "./Vendor/VNews";

const VendorApp = () => {
  return (
    <Routes>
      <Route element={<AppLayout role="vendor" />}>
        <Route element={<ProtectedRoute allowedRoles={["vendor"]} />}>
          <Route path="/vendor-dashboard" element={<VendorDashboard />} />
          <Route path="/vendor-incoming" element={<VendorIncoming />} />
          <Route path="/vendor-acquisitions" element={<VendorAcquisitions />} />
          <Route path="/vendor-profile" element={<VendorProfile />} />
          <Route path="/vendor-social" element={<VSocial />} />
          <Route path="/vendor-news" element={<VNews />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default VendorApp;
