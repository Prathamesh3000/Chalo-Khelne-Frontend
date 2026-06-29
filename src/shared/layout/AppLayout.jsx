import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { CommandPaletteProvider, CommandPalette } from "../search";

export default function AppLayout({ role = "manager" }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <CommandPaletteProvider>
      <div className="flex h-screen bg-[#FAFAFA] max-h-[100vh]">
        <Sidebar
          role={role}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar onMenuClick={() => setMobileMenuOpen(true)} />

          <main className="overflow-y-scroll">
            <div className="mx-[24px]">
              <Outlet />
            </div>
          </main>
        </div>

        <CommandPalette />
      </div>
    </CommandPaletteProvider>
  );
}
