import {
  FiBell,
  FiPlus,
  FiSearch,
  FiMenu,
  FiX,
  FiUser,
  FiLogOut,
  FiTrash2,
  FiCheck,
} from "react-icons/fi";
import { MdOutlineLightMode, MdOutlineDarkMode } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { useState, useEffect, useRef, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "../App.css";

const TrainerNavbar = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isPanelOpen, setPanelOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("all");
  const [selected, setSelected] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] =
    useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const { logout } = useContext(AuthContext);

  // Sample notifications
  const allNotifications = [
    {
      date: "Today",
      items: [
        {
          id: 1,
          name: "System",
          message: "New training request received from Michael Johnson.",
          time: "09:00 AM",
          type: "new",
        },
        {
          id: 2,
          name: "System",
          message: "Your upcoming session starts in 30 minutes.",
          time: "10:30 AM",
          type: "new",
        },
      ],
    },
    {
      date: "Yesterday",
      items: [
        {
          id: 3,
          name: "System",
          message: "Your schedule has been updated for next week.",
          time: "02:15 PM",
          type: "old",
        },
      ],
    },
  ];

  const [filteredNotifications, setFilteredNotifications] =
    useState(allNotifications);

  // Update filteredNotifications when selectedTab changes
  useEffect(() => {
    if (selectedTab === "all") {
      setFilteredNotifications(allNotifications);
    } else {
      const filtered = allNotifications
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => item.type === "request"),
        }))
        .filter((section) => section.items.length > 0);
      setFilteredNotifications(filtered);
    }
  }, [selectedTab]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setIsNotificationDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleProfileClick = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
    setIsNotificationDropdownOpen(false);
  };

  const handleNotificationClick = () => {
    setIsNotificationDropdownOpen(!isNotificationDropdownOpen);
    setIsProfileDropdownOpen(false);
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const toggleSelect = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((item) => item !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const selectAll = () => {
    const allIds = filteredNotifications.flatMap((section) =>
      section.items.map((item) => item.id)
    );
    setSelected(allIds);
  };

  const deselectAll = () => {
    setSelected([]);
  };

  const deleteSelected = () => {
    setFilteredNotifications((prevNotifications) => {
      const newNotifications = prevNotifications.map((section) => ({
        ...section,
        items: section.items.filter((item) => !selected.includes(item.id)),
      }));
      return newNotifications.filter((section) => section.items.length > 0);
    });
    setSelected([]);
  };

  const clearAllNotifications = () => {
    setFilteredNotifications([]);
    setSelected([]);
  };

  const handleSelectionToggle = () => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
    } else {
      if (selected.length === 0) {
        selectAll();
      } else {
        deselectAll();
      }
    }
  };

  const allSelected = filteredNotifications.every((section) =>
    section.items.every((item) => selected.includes(item.id))
  );

  // Get notification count
  const notificationCount = filteredNotifications.reduce(
    (count, section) =>
      count + section.items.filter((item) => item.type === "new").length,
    0
  );

  return (
    <div className={`navbar ${darkMode ? "navbar-dark" : ""}`}>
      <div className="flex items-center w-full md:w-auto navbar1">
        <img loading="lazy"
          src="/sportapp_logo.png"
          alt="Logo"
          className="w-[45.811px] h-[35.481px]"
        />
        <div className="search-container ml-2">
          <input
            type="text"
            placeholder="Search"
            className="bg-white searchinput"
          />
          <FiSearch className="search-icon" />
        </div>

        <button
          className="md:hidden text-gray-600 text-2xl w-auto bg-transparent border-none focus:outline-none focus:ring-0"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>

      <div
        className={`right-section md:flex ${
          isOpen
            ? "flex flex-col items-start p-4 absolute top-16 right-4 bg-white shadow-md rounded-lg w-48 z-50"
            : "hidden"
        }`}
      >
        <button
          onClick={() => navigate("/trainer-current")}
          className="flex items-center gap-2 text-emerald-600 font-semibold px-6 w-auto py-2 rounded-full transition bg-transparent hover:bg-transparent mt-0 createtournaments"
          style={{ border: "1px solid #0EA572" }}
        >
          <FiPlus />
          Start Session
        </button>

        {/* <div className="relative flex items-center">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`toggle-button mt-0 ${
              darkMode ? "toggle-button-dark" : "toggle-button-light"
            }`}
          >
            <div
              className={`toggle-switch mt-0 ${
                darkMode ? "toggle-switch-dark" : "toggle-switch-light"
              }`}
            >
              {darkMode ? (
                <MdOutlineDarkMode className="text-gray-600 text-lg" />
              ) : (
                <MdOutlineLightMode className="text-orange-500 text-lg" />
              )}
            </div>
          </button>
        </div> */}

        {/* Notification Bell */}
        <div className="relative" ref={notificationRef}>
          <div
            className="notification-icon cursor-pointer"
            onClick={handleNotificationClick}
          >
            <FiBell className="text-gray-600 text-2xl" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </div>

          {/* Notification Dropdown */}
          {isNotificationDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Notifications</h3>
                  <div className="flex space-x-2">
                    {isSelectionMode && (
                      <>
                        <button
                          onClick={deleteSelected}
                          disabled={selected.length === 0}
                          className={`p-1 rounded-full ${
                            selected.length === 0
                              ? "text-gray-400"
                              : "text-red-500 hover:bg-red-100"
                          }`}
                        >
                          <FiTrash2 size={18} />
                        </button>
                        <button
                          onClick={deselectAll}
                          disabled={selected.length === 0}
                          className={`p-1 rounded-full ${
                            selected.length === 0
                              ? "text-gray-400"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          <FiX size={18} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleSelectionToggle}
                      className={`p-1 rounded-full ${
                        isSelectionMode && allSelected
                          ? "bg-blue-100 text-blue-600"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <FiCheck size={18} />
                    </button>
                  </div>
                </div>
                <div className="flex mt-2">
                  <button
                    onClick={() => setSelectedTab("all")}
                    className={`mr-4 pb-1 text-sm ${
                      selectedTab === "all"
                        ? "border-b-2 border-blue-500 text-blue-600 font-medium"
                        : "text-gray-500"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSelectedTab("requests")}
                    className={`mr-4 pb-1 text-sm ${
                      selectedTab === "requests"
                        ? "border-b-2 border-blue-500 text-blue-600 font-medium"
                        : "text-gray-500"
                    }`}
                  >
                    Requests
                  </button>
                </div>
              </div>

              <div className="py-2">
                {filteredNotifications.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-gray-500">No notifications</p>
                  </div>
                ) : (
                  filteredNotifications.map((section) => (
                    <div key={section.date} className="mb-2">
                      <div className="px-4 py-1 bg-gray-50 text-xs font-medium text-gray-500">
                        {section.date}
                      </div>
                      {section.items.map((item) => (
                        <div
                          key={item.id}
                          className={`px-4 py-3 hover:bg-gray-50 ${
                            item.type === "new" ? "bg-blue-50" : ""
                          }`}
                        >
                          <div className="flex items-start">
                            {isSelectionMode && (
                              <div className="mr-2 mt-1">
                                <input
                                  type="checkbox"
                                  checked={selected.includes(item.id)}
                                  onChange={() => toggleSelect(item.id)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </div>
                            )}
                            <div className="flex-grow">
                              <div className="flex justify-between">
                                <span className="font-medium text-sm">
                                  {item.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {item.time}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {item.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>

              {filteredNotifications.length > 0 && (
                <div className="p-2 text-center border-t">
                  <button
                    onClick={clearAllNotifications}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear all notifications
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile Icon with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div
            className="profile-icon cursor-pointer"
            onClick={handleProfileClick}
          >
            <FaUserCircle className="text-gray-600 text-2xl" />
          </div>

          {/* Profile Dropdown */}
          {isProfileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50">
              <div className="py-1">
                <div
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    navigate("/trainer-profile");
                    setIsProfileDropdownOpen(false);
                  }}
                >
                  <FiUser className="mr-2" />
                  My Profile
                </div>
                <div
                  className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 cursor-pointer"
                  onClick={handleLogout}
                >
                  <FiLogOut className="mr-2" />
                  Logout
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainerNavbar;
