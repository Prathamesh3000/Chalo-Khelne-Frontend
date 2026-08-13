import {
  FiBell,
  FiSearch,
  FiMenu,
  FiX,
  FiUser,
  FiLogOut,
  FiTrash2,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { useState, useEffect, useRef, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import "../App.css";

import { activatable } from "../shared/utils/activatable";
const ClubAdminNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const { logout } = useContext(AuthContext);
  const { notifications, unreadCount, markAllRead, clearNotifications } = useNotifications();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = () => {
    setIsNotificationDropdownOpen(!isNotificationDropdownOpen);
    setIsProfileDropdownOpen(false);
    if (!isNotificationDropdownOpen && unreadCount > 0) {
      markAllRead();
    }
  };

  const handleProfileClick = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
    setIsNotificationDropdownOpen(false);
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <div className="navbar">
      <div className="flex items-center w-full md:w-auto navbar1">
        <img loading="lazy" src="/sportapp_logo.png" alt="Logo" className="w-[45.811px] h-[35.481px]" />
        <div className="search-container ml-2">
          <input type="text" placeholder="Search" className="bg-white searchinput" />
          <FiSearch className="search-icon" />
        </div>
        <button
          className="md:hidden text-gray-600 text-2xl w-auto bg-transparent border-none focus:outline-none focus:ring-0"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>

      <div className={`right-section md:flex ${isOpen ? "flex flex-col items-start p-4 absolute top-16 right-4 bg-white shadow-md rounded-lg w-48 z-50" : "hidden"}`}>
        {/* Notification Bell */}
        <div className="relative" ref={notificationRef}>
          <div className="notification-icon cursor-pointer" aria-label="Notifications" {...activatable(handleNotificationClick)}>
            <FiBell className="text-gray-600 text-2xl" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>

          {/* Notification Dropdown */}
          {isNotificationDropdownOpen && (
            <div className="absolute right-[-82px] mt-2 w-80 bg-white rounded-lg shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold">Notifications</h3>
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="p-1 bg-transparent hover:bg-red-50 rounded-full text-red-500 w-auto"
                    title="Clear all"
                  >
                    <FiTrash2 size={16} />
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <FiBell className="mx-auto text-gray-300 text-3xl mb-2" />
                    <p className="text-gray-400 text-sm">No notifications yet</p>
                    <p className="text-gray-300 text-xs mt-1">Booking alerts will appear here in real-time</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${!notif.read ? "bg-blue-50/50" : ""}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              notif.type === "booking_new" ? "bg-green-500" :
                              notif.type === "booking_cancel" ? "bg-red-500" :
                              "bg-blue-500"
                            }`} />
                            <span className="font-medium text-sm text-gray-800">{notif.title}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 ml-4">{notif.message}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                          {formatTime(notif.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Icon with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div className="profile-icon cursor-pointer" aria-label="Your profile" {...activatable(handleProfileClick)}>
            <FaUserCircle className="text-gray-600 text-2xl" />
          </div>

          {isProfileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50">
              <div className="py-1">
                <div
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  onClick={() => { navigate("/ClubAdminProfile"); setIsProfileDropdownOpen(false); }}
                >
                  <FiUser className="mr-2" /> My Profile
                </div>
                <div
                  className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 cursor-pointer"
                  onClick={handleLogout}
                >
                  <FiLogOut className="mr-2" /> Logout
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClubAdminNavbar;
