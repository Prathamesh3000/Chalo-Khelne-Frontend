import { io } from "socket.io-client";

// Derive socket origin from the API base (dev "/api" → localhost; prod
// "https://host/api" → "https://host"). VITE_API_URL never existed → this used
// to always hit localhost, breaking live-scoring sockets in production.
const SERVER_URL =
  (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/i, "") || "http://localhost:3003";

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;
const subscriptions = new Map(); // roomId → Set of callbacks

/**
 * Initialize socket connection.
 * Called once at app startup if user is authenticated.
 */
export function initSocket() {
  if (socket?.connected) return socket;

  const token = localStorage.getItem("token");
  if (!token) return null;

  socket = io(SERVER_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
  });

  socket.on("connect", () => {
    reconnectAttempts = 0;

    // Re-join all active rooms on reconnect
    for (const [roomId] of subscriptions) {
      const [type, id] = roomId.split(":");
      if (type === "match") socket.emit("join:match", { matchId: id });
      if (type === "tournament") socket.emit("join:tournament", { tournamentId: id });
    }
  });

  socket.on("connect_error", (err) => {
    reconnectAttempts++;
    if (reconnectAttempts === 1) {
    }
    if (reconnectAttempts >= MAX_RECONNECT) {
      socket.disconnect(); // Stop trying
    }
  });

  socket.on("disconnect", (reason) => {
  });

  return socket;
}

/**
 * Get the current socket instance.
 */
export function getSocket() {
  return socket;
}

/**
 * Check if socket is connected and healthy.
 */
export function isSocketConnected() {
  return socket?.connected === true;
}

/**
 * Subscribe to a match room. Returns unsubscribe function.
 *
 * @param {string} matchId
 * @param {Object} handlers - { onScoreUpdate, onSetComplete, onMatchComplete }
 * @returns {Function} unsubscribe
 */
export function subscribeMatch(matchId, handlers) {
  if (!socket) initSocket();
  if (!socket) return () => {};

  const roomId = `match:${matchId}`;

  // Join room (only once per roomId)
  if (!subscriptions.has(roomId)) {
    subscriptions.set(roomId, new Set());
    socket.emit("join:match", { matchId });
  }
  subscriptions.get(roomId).add(handlers);

  // Register listeners (idempotent — socket.io deduplicates by event name)
  const onScore = (data) => {
    if (data.matchId !== matchId) return;
    for (const h of subscriptions.get(roomId) || []) {
      h.onScoreUpdate?.(data);
    }
  };
  const onSetDone = (data) => {
    if (data.matchId !== matchId) return;
    for (const h of subscriptions.get(roomId) || []) {
      h.onSetComplete?.(data);
    }
  };
  const onMatchDone = (data) => {
    if (data.matchId !== matchId) return;
    for (const h of subscriptions.get(roomId) || []) {
      h.onMatchComplete?.(data);
    }
  };

  socket.off("score:update", onScore);
  socket.on("score:update", onScore);
  socket.off("set:complete", onSetDone);
  socket.on("set:complete", onSetDone);
  socket.off("match:complete", onMatchDone);
  socket.on("match:complete", onMatchDone);

  // Unsubscribe
  return () => {
    const subs = subscriptions.get(roomId);
    if (subs) {
      subs.delete(handlers);
      if (subs.size === 0) {
        subscriptions.delete(roomId);
        socket?.emit("leave:match", { matchId });
      }
    }
  };
}

/**
 * Subscribe to a tournament room. Returns unsubscribe function.
 *
 * @param {string} tournamentId
 * @param {Object} handlers - { onScoreUpdate, onMatchComplete }
 * @returns {Function} unsubscribe
 */
export function subscribeTournament(tournamentId, handlers) {
  if (!socket) initSocket();
  if (!socket) return () => {};

  const roomId = `tournament:${tournamentId}`;

  if (!subscriptions.has(roomId)) {
    subscriptions.set(roomId, new Set());
    socket.emit("join:tournament", { tournamentId });
  }
  subscriptions.get(roomId).add(handlers);

  const onScore = (data) => {
    if (data.tournamentId !== tournamentId) return;
    for (const h of subscriptions.get(roomId) || []) {
      h.onScoreUpdate?.(data);
    }
  };
  const onMatchDone = (data) => {
    if (data.tournamentId !== tournamentId) return;
    for (const h of subscriptions.get(roomId) || []) {
      h.onMatchComplete?.(data);
    }
  };

  socket.off("score:update", onScore);
  socket.on("score:update", onScore);
  socket.off("match:complete", onMatchDone);
  socket.on("match:complete", onMatchDone);

  return () => {
    const subs = subscriptions.get(roomId);
    if (subs) {
      subs.delete(handlers);
      if (subs.size === 0) {
        subscriptions.delete(roomId);
        socket?.emit("leave:tournament", { tournamentId });
      }
    }
  };
}

/**
 * Disconnect socket entirely.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    subscriptions.clear();
  }
}
