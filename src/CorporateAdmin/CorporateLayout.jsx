import { useState, useContext } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    HomeIcon,
    UserGroupIcon,
    BuildingOfficeIcon,
    ArrowRightOnRectangleIcon,
    Bars3Icon,
    XMarkIcon,
    TrophyIcon,
    ChatBubbleLeftRightIcon
} from "@heroicons/react/24/outline";
import MNavbar from "../Manager/MNavbar";
import { AuthContext } from "../context/AuthContext";

import DialogA11y from "../shared/components/DialogA11y";
export default function CorporateLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useContext(AuthContext);

    const navigation = [
        { name: "Dashboard", href: "/corporate-dashboard", icon: HomeIcon },
        { name: "Tournaments", href: "/corporate-tournaments", icon: TrophyIcon },
        { name: "Staff Management", href: "/corporate-staff", icon: UserGroupIcon },
        { name: "Profile", href: "/corporate-profile", icon: BuildingOfficeIcon },
        { name: "Group Chats", href: "/group-chat", icon: ChatBubbleLeftRightIcon },
    ];

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
        onClick={() => setSidebarOpen(false)}
      >
        <DialogA11y onClose={() => setSidebarOpen(false)} /></div>
            )}

            {/* Sidebar */}
            <div
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="flex items-center justify-between h-16 px-6 border-b">
                    <h1 className="text-xl font-bold text-blue-600">Corporate Portal</h1>
                    <button
                        className="lg:hidden text-gray-500 hover:text-gray-700"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <nav className="p-4 space-y-1">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${isActive
                                    ? "bg-blue-50 text-blue-600"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                            >
                                <item.icon className="w-5 h-5 mr-3" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="absolute bottom-0 w-full p-4 border-t">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
                    >
                        <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
                        Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Manager Navbar Integration for Tournament Creation & Profile */}
                <MNavbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

                {/* Content Area */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
