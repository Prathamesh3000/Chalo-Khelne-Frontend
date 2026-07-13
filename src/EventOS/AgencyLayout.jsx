import { NavLink, Outlet } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { NAV_GROUPS } from "./nav";

/**
 * Event OS shell — IONIX Sports Events. A role-gated module inside sports_app
 * (rendered by AgencyApp), using the app's dark tokens, auth and axios.
 */
export default function AgencyLayout() {
  const { auth, logout } = useAuth();
  const initials = (auth?.name || "AA").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex h-screen bg-[#0F1117] text-gray-200">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-[#0a0d14] border-r border-white/[0.06] flex flex-col">
        <div className="h-15 flex items-center gap-2.5 px-4 py-4 border-b border-white/[0.06]">
          <span className="bg-emerald-600 text-white font-black text-[13px] rounded-lg px-2 py-1.5 tracking-wider">IX</span>
          <div>
            <div className="text-white font-bold text-[13px] leading-none">IONIX Sports Events</div>
            <div className="text-gray-500 text-[10px] font-mono tracking-wider mt-0.5">EVENT OS · v0.1</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3.5">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="mb-4">
              <div className="px-2.5 pb-1.5 text-[10px] font-bold tracking-widest text-gray-500 uppercase">{group.title}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.id} to={`/agency/${item.id}`}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] mb-0.5 transition ${
                        isActive ? "bg-emerald-600 text-white font-semibold" : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
                      }`}>
                    <Icon size={16} className="flex-shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && <span className="text-[9px] font-bold bg-indigo-500 text-white rounded-full px-1.5 py-px">{item.badge}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-15 border-b border-white/[0.06] bg-[#12141B] flex items-center justify-end px-5 py-3.5 gap-3.5">
          <div className="text-right">
            <div className="text-[13px] font-semibold text-gray-100">{auth?.name || "Agency Admin"}</div>
            <div className="text-[11px] text-gray-500 font-mono">{auth?.role || "agencyadmin"}</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center">{initials}</div>
          <button onClick={logout} title="Log out" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] w-auto bg-transparent">
            <LogOut size={15} /> Logout
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
