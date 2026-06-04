import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./shared/lib";
import { AuthProvider } from "./features/auth";
import NotificationProvider from "./context/NotificationContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { initSocket } from "./features/realtime";
import { setupApiInterceptors } from "./shared/api";

// Setup global axios interceptors — auto token, 401 handling, error toasts
setupApiInterceptors();

// Initialize WebSocket if user is authenticated (lazy — don't block startup)
try {
  if (localStorage.getItem("token")) {
    initSocket();
  }
} catch (e) {
  // Socket init failure is non-critical — polling fallback handles it
}

// Set axios base URL for production (when no Vite proxy is available)
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
if (apiBaseUrl.startsWith("http")) {
  axios.defaults.baseURL = apiBaseUrl.replace(/\/api$/, "");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
            <ToastContainer />
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
