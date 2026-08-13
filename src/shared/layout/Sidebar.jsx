import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { PanelLeftClose, PanelLeft, LogOut } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { getSidebarForRole } from "./sidebarConfig";
import SidebarSection from "./SidebarSection";

import DialogA11y from "../../shared/components/DialogA11y";
const SIG = "#5E6AD2";

export default function Sidebar({ role = "manager", mobileOpen = false, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const { auth, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const sections = getSidebarForRole(role);
  const isExpanded = !collapsed || hoverExpanded;
  const initial = (auth?.name || "U").charAt(0).toUpperCase();
  const roleLabel = role.replace(/_/g, " ");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white">
      <div
        className={`h-14 flex items-center border-b border-neutral-100 ${
          isExpanded ? "px-4" : "px-2 justify-center"
        }`}
      >
        {isExpanded ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <img loading="lazy"
              src="/sportapp_logo.png"
              alt="ChaloKhelne"
              className="w-7 h-7 rounded-md object-contain flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-neutral-950 leading-none tracking-tight truncate">
                ChaloKhelne
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500 mt-1">
                {roleLabel}
              </p>
            </div>
          </div>
        ) : (
          <img loading="lazy"
            src="/sportapp_logo.png"
            alt="ChaloKhelne"
            className="w-7 h-7 rounded-md object-contain"
          />
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-hide">
        {sections.map((section) => (
          <SidebarSection
            key={section.key}
            section={section}
            collapsed={!isExpanded}
          />
        ))}
      </nav>

      <div className="border-t border-neutral-100 p-2">
        <div
          className={`flex items-center gap-2.5 px-2 py-2 rounded-lg ${
            !isExpanded ? "justify-center" : ""
          }`}
        >
          <div className="w-7 h-7 rounded-full bg-neutral-100 inline-flex items-center justify-center text-[11px] font-semibold text-neutral-700 border border-neutral-200 flex-shrink-0">
            {initial}
          </div>
          {isExpanded && (
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-neutral-900 truncate">
                {auth?.name || "User"}
              </p>
              <p className="text-[11px] text-neutral-500 truncate capitalize">
                {auth?.email || roleLabel}
              </p>
            </div>
          )}
        </div>

        <div
          className={`flex mt-1 ${
            isExpanded ? "gap-1" : "flex-col gap-0.5 items-center"
          }`}
        >
          <button
            onClick={handleLogout}
            title={!isExpanded ? "Sign out" : undefined}
            className={`flex items-center gap-2 rounded-md text-neutral-600 hover:text-rose-600 hover:bg-rose-50 transition ${
              isExpanded
                ? "flex-1 h-8 px-2.5 text-[12px] font-medium"
                : "h-8 w-8 justify-center"
            }`}
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            {isExpanded && <span>Sign out</span>}
          </button>
          <button
            onClick={() => {
              setCollapsed(!collapsed);
              setHoverExpanded(false);
            }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition"
          >
            {collapsed ? (
              <PanelLeft className="w-3.5 h-3.5" />
            ) : (
              <PanelLeftClose className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside
        onMouseEnter={() => {
          if (collapsed) setHoverExpanded(true);
        }}
        onMouseLeave={() => setHoverExpanded(false)}
        className={`hidden md:flex flex-col bg-white border-r border-neutral-200 h-screen sticky top-0 z-30 transition-[width] duration-200 ease-out ${
          isExpanded ? "w-[240px]" : "w-14"
        }`}
      >
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-40 md:hidden"
        onClick={onMobileClose}
      >
        <DialogA11y onClose={onMobileClose} />
          <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-[260px] bg-white border-r border-neutral-200 shadow-[0_24px_64px_rgba(0,0,0,0.16)]"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
