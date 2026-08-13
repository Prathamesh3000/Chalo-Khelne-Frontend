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
import { setupApiInterceptors } from "./shared/api";
import { loadScoringConfig } from "./shared/utils/scoringConfig";

// Setup global axios interceptors — auto token, 401 handling, error toasts
setupApiInterceptors();

// §4.4 — socket init MOVED into AuthProvider.
//
// It used to run here at module scope from a raw localStorage read, before the
// AuthProvider had mounted, wrapped in a try/catch whose comment said "polling
// fallback handles it". There is no polling fallback. The socket now lives and
// dies with the session — see features/auth/context/AuthContext.jsx.

// Set axios base URL for production (when no Vite proxy is available)
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
if (apiBaseUrl.startsWith("http")) {
  axios.defaults.baseURL = apiBaseUrl.replace(/\/api$/, "");
}

// §6.1 — pull the authoritative sport→scoringType map and its labels from the
// server. Fire-and-forget: the module ships a seed copy so the first paint is
// correct, and this replaces it as soon as the response lands. Must come after
// the axios baseURL is set.
loadScoringConfig();

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
