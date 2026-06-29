import { createContext, useContext, useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import { AuthContext } from "./AuthContext";

const NotificationContext = createContext(null);

export const useNotifications = () => useContext(NotificationContext);

// Derive the socket origin from the API base (dev "/api" → localhost backend;
// prod "https://host/api" → "https://host"). The old VITE_API_URL var never
// existed, so this previously always fell back to localhost — breaking the
// socket (and the booking:new alerts below) in production.
const SERVER_URL =
  (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/i, "") || "http://localhost:3004";

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);
  const { isAuthenticated } = useContext(AuthContext);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !isAuthenticated) {
      // Disconnect existing socket on logout
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Connect socket with manager's JWT
    const socket = io(SERVER_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    socket.on("connect", () => {
    });

    // Listen for turf booking notifications
    socket.on("booking:new", (data) => {
      const notif = {
        id: Date.now(),
        type: "booking_new",
        title: data.title || "New Booking",
        message: data.message || "A new turf booking has been made",
        data: data,
        read: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);

      toast.success(
        <div>
          <strong>{notif.title}</strong>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>{notif.message}</p>
        </div>,
        { position: "top-right", autoClose: 6000 }
      );
    });

    socket.on("booking:cancel", (data) => {
      const notif = {
        id: Date.now(),
        type: "booking_cancel",
        title: data.title || "Booking Cancelled",
        message: data.message || "A turf booking has been cancelled",
        data: data,
        read: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);

      toast.warn(
        <div>
          <strong>{notif.title}</strong>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>{notif.message}</p>
        </div>,
        { position: "top-right", autoClose: 6000 }
      );
    });

    socket.on("connect_error", (err) => {
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAllRead, clearNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
