import React, { useState, useContext, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell, Menu, LogOut, ChevronDown, Search,
} from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import { AuthContext } from "../context/AuthContext";

const SIG = "#5E6AD2";

const Navbar = ({ toggleSidebar }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { logout, auth } = useContext(AuthContext);
  const { unreadCount, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const role = auth?.role?.toLowerCase() || "manager";
  const roleLabel =
    role === "manager"
      ? "Manager"
      : role === "corporate_admin"
      ? "Corporate"
      : role.replace(/_/g, " ");

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const homePath =
    auth?.role === "corporate_admin" ? "/corporate-dashboard" : "/mdashboard";

  return (
    <header className="h-14 bg-white border-b border-neutral-200 px-4 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          className="md:hidden h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-neutral-100 text-neutral-700"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <Link to={homePath} className="flex items-center gap-2 flex-shrink-0">
          <img loading="lazy"
            src="/sportapp_logo.png"
            alt="ChaloKhelne"
            className="h-7 w-auto object-contain"
          />
        </Link>

        <span className="hidden md:inline-flex items-center h-6 px-1.5 rounded text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-600 bg-neutral-100">
          {roleLabel}
        </span>
      </div>

      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <div
          role="button"
          tabIndex={0}
          className="w-full h-8 inline-flex items-center gap-2 px-2.5 rounded-lg bg-neutral-100 hover:bg-neutral-200/60 transition cursor-pointer"
          aria-label="Search (Cmd+K)"
        >
          <Search className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
          <span className="flex-1 text-[12px] text-neutral-500 text-left">
            Search venues, tournaments, players…
          </span>
          <span className="font-mono text-[10px] text-neutral-500 bg-white border border-neutral-200 rounded px-1 py-px">
            ⌘K
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          className="md:hidden h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-neutral-100 text-neutral-700"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            navigate("/notification");
            markAllRead();
          }}
          className="relative h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-neutral-100 text-neutral-700 transition"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 inline-flex items-center justify-center font-mono tabular-nums text-[9px] font-semibold rounded-full text-white border border-white"
              style={{ backgroundColor: SIG }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        <div className="relative ml-1" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 h-8 pl-1 pr-2 rounded-md hover:bg-neutral-100 transition"
          >
            <div className="w-6 h-6 rounded-full bg-neutral-100 inline-flex items-center justify-center text-[11px] font-semibold text-neutral-700 border border-neutral-200">
              {(auth?.name || "M").charAt(0).toUpperCase()}
            </div>
            <span className="hidden md:inline text-[12px] font-medium text-neutral-900 max-w-[140px] truncate">
              {auth?.name || "Manager"}
            </span>
            <ChevronDown
              className={`w-3 h-3 text-neutral-400 transition-transform ${
                isProfileOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl border border-neutral-200 shadow-[0_12px_32px_rgba(0,0,0,0.10)] overflow-hidden z-50">
              <div className="px-3 py-2.5 border-b border-neutral-100">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500 mb-0.5">
                  Signed in as
                </p>
                <p className="text-[13px] font-medium text-neutral-900 truncate">
                  {auth?.name || "Manager"}
                </p>
                <p className="text-[12px] text-neutral-500 truncate">
                  {auth?.email || "manager@example.com"}
                </p>
              </div>
              <div className="p-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 h-8 px-2.5 text-[12px] font-medium text-rose-600 hover:bg-rose-50 rounded-md transition text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
