import { Routes, Route } from "react-router-dom";
import { AppLayout } from "./shared/layout";
import PTournamentManagement from "./pages/tournaments/List";
import ProtectedRoute from "./components/ProtectedRoute";
import PHome from "./pages/player/Home";
import PSlotbooking from "./Player/PSlotbooking";
import Ptrainers from "./Player/Ptrainers";
import Psettings from "./Player/Psettings";
import PTurfdetails from "./Player/PTurf-details";
import PTurfbook from "./Player/PTurf-book";
import PProfile from "./Player/PProfile";

const PlayerApp = () => {
  return (
    <Routes>
      <Route element={<AppLayout role="player" />}>
        <Route element={<ProtectedRoute />}>
        <Route 
            path="/phome" 
            element={<PHome />} 
          />
          <Route 
            path="/ptournament-management" 
            element={<PTournamentManagement />} 
          />
          <Route 
            path="/pslot-booking" 
            element={<PSlotbooking />} 
          />
          <Route 
            path="/ptrainers" 
            element={<Ptrainers />} 
          />
          <Route 
            path="/psettings" 
            element={<Psettings />} 
          />
          <Route 
            path="/pturf-details/:id" 
            element={<PTurfdetails />} 
          />
          <Route path="/turfs/:turfId/book" element={<PTurfbook />} />
          <Route path="/pprofile" element={<PProfile />} />

        </Route>
      </Route>
    </Routes>
  );
};

export default PlayerApp;
