import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  FaCalendarPlus,
  FaSearch,
  FaFilter,
  FaCalendarAlt,
  FaPlay,
  FaHistory,
  FaEdit,
  FaTimes,
  FaEllipsisH,
} from "react-icons/fa";

// Color scheme with green as primary
const colors = {
  background: "#F5F7FA",
  white: "#FFFFFF",
  primary: "#0EA572", // Green primary
  primaryLight: "#C7FBE8", // Light green for backgrounds
  primaryDark: "#07875E", // Darker green for hover states
  text: "#111827", // Dark blue-gray for text
  textLight: "#6B778C", // Lighter text color
  border: "#DFE1E6",
  success: "#0EA572",
  danger: "#EF4444",
};

const TrainerSessions = () => {
  const { auth, isAuthenticated } = useContext(AuthContext);
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [newSession, setNewSession] = useState({
    title: "",
    type: "individual",
    startTime: "",
    endTime: "",
    location: "",
    notes: "",
  });

  // Fallback sessions data
  const fallbackSessions = [
    {
      _id: "fallback-1",
      title: "Beginner Fitness Workshop",
      type: "group",
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
      ).toISOString(),
      location: "Main Gym",
      status: "scheduled",
      notes: "Introductory fitness class for new members",
    },
    {
      _id: "fallback-2",
      title: "Personal Training - Advanced Strength",
      type: "individual",
      startTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(
        Date.now() + 10 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000
      ).toISOString(),
      location: "Weight Training Area",
      status: "scheduled",
      notes: "Advanced strength training for experienced client",
    },
  ];

  // Modify the fetchSessions logic in useEffect
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        if (!isAuthenticated || !auth) {
          throw new Error("auth not authenticated");
        }

        try {
          const response = await axios.get(
            `${import.meta.env.VITE_API_BASE_URL}/trainer/requests/${auth._id}`
          );

          // Use fallback if no sessions found
          const sessionsData =
            response.data.length > 0 ? response.data : fallbackSessions;

          setSessions(sessionsData);
          setFilteredSessions(sessionsData);
          setLoading(false);
        } catch (apiError) {
          setSessions(fallbackSessions);
          setFilteredSessions(fallbackSessions);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error details:", err.response?.data || err);
        setError(err.response?.data?.message || err.message);
        setLoading(false);
      }
    };

    if (isAuthenticated && auth && auth._id) {
      fetchSessions();
    }
  }, [auth, isAuthenticated]);

  useEffect(() => {
    // Apply filters and search
    let result = [...sessions];

    // Apply session type filter
    if (filter !== "all") {
      result = result.filter((session) => session.type === filter);
    }

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (session) =>
          session.title.toLowerCase().includes(term) ||
          session.location.toLowerCase().includes(term)
      );
    }

    setFilteredSessions(result);
  }, [filter, searchTerm, sessions]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSession((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Format session data
      const sessionData = {
        ...newSession,
        trainerId: auth._id,
      };

      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/trainer/sessions`,
        sessionData
      );

      // Refresh sessions
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/trainer/sessions/${auth._id}`
      );
      setSessions(response.data);

      // Reset form
      setNewSession({
        title: "",
        type: "individual",
        startTime: "",
        endTime: "",
        location: "",
        notes: "",
      });
      setShowSessionForm(false);
    } catch (err) {
      setError("Failed to create session: " + err.message);
    }
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ backgroundColor: colors.background }}
      >
        <div
          className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2"
          style={{ borderColor: colors.primary }}
        ></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-6 rounded-lg mx-auto max-w-4xl mt-6"
        style={{ backgroundColor: colors.white, color: colors.danger }}
      >
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 rounded"
          style={{ backgroundColor: colors.danger, color: colors.white }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div
      className="px-6 py-8 w-full min-h-screen"
      style={{ backgroundColor: colors.background }}
    >
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
          Training Sessions
        </h1>

        <button
          onClick={() => setShowSessionForm(!showSessionForm)}
          className="px-4 py-2 rounded-md flex items-center w-auto"
          style={{
            backgroundColor: showSessionForm ? colors.white : colors.primary,
            color: showSessionForm ? colors.primary : colors.white,
            border: showSessionForm ? `1px solid ${colors.primary}` : "none",
          }}
        >
          <FaCalendarPlus className="mr-2" />
          {showSessionForm ? "Cancel" : "Schedule Session"}
        </button>
      </div>

      {/* Session Creation Form */}
      {showSessionForm && (
        <div
          className="rounded-lg shadow-md p-6 mb-8"
          style={{ backgroundColor: colors.white }}
        >
          <h2
            className="text-xl font-semibold mb-4"
            style={{ color: colors.text }}
          >
            Schedule New Session
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-1" style={{ color: colors.text }} htmlFor="session-title">
                  Session Title
                </label>
                <input id="session-title"
                  type="text"
                  name="title"
                  value={newSession.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ border: `1px solid ${colors.border}` }}
                  required
                />
              </div>

              <div>
                <label className="block mb-1" style={{ color: colors.text }} htmlFor="session-type">
                  Session Type
                </label>
                <select id="session-type"
                  name="type"
                  value={newSession.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ border: `1px solid ${colors.border}` }}
                  required
                >
                  <option value="individual">Individual</option>
                  <option value="group">Group</option>
                  <option value="club">Club</option>
                </select>
              </div>

              <div>
                <label className="block mb-1" style={{ color: colors.text }} htmlFor="start-time">
                  Start Time
                </label>
                <input id="start-time"
                  type="datetime-local"
                  name="startTime"
                  value={newSession.startTime}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ border: `1px solid ${colors.border}` }}
                  required
                />
              </div>

              <div>
                <label className="block mb-1" style={{ color: colors.text }} htmlFor="end-time">
                  End Time
                </label>
                <input id="end-time"
                  type="datetime-local"
                  name="endTime"
                  value={newSession.endTime}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ border: `1px solid ${colors.border}` }}
                  required
                />
              </div>

              <div>
                <label className="block mb-1" style={{ color: colors.text }} htmlFor="location">
                  Location
                </label>
                <input id="location"
                  type="text"
                  name="location"
                  value={newSession.location}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ border: `1px solid ${colors.border}` }}
                  required
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block mb-1" style={{ color: colors.text }} htmlFor="notes">
                Notes
              </label>
              <textarea id="notes"
                name="notes"
                value={newSession.notes}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-lg"
                style={{ border: `1px solid ${colors.border}` }}
                rows="3"
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSessionForm(false)}
                className="px-4 py-2 rounded-lg mr-3 w-auto"
                style={{
                  backgroundColor: colors.white,
                  color: colors.textLight,
                  border: `1px solid ${colors.border}`,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg w-auto"
                style={{ backgroundColor: colors.primary, color: colors.white }}
              >
                Create Session
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div
        className="rounded-lg shadow-md p-4 mb-8"
        style={{ backgroundColor: colors.white }}
      >
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="w-full md:w-1/2 mb-4 md:mb-0">
            <div className="relative">
              <FaSearch
                className="absolute top-3 left-3"
                style={{ color: colors.textLight }}
              />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg"
                style={{
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.background,
                  color: colors.text,
                }}
              />
            </div>
          </div>

          <div className="w-full md:w-auto flex items-center">
            <FaFilter className="mr-2" style={{ color: colors.primary }} />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border rounded-lg px-3 py-2"
              style={{ borderColor: colors.border }}
            >
              <option value="all">All Sessions</option>
              <option value="individual">Individual</option>
              <option value="group">Group</option>
              <option value="club">Club</option>
            </select>
          </div>
        </div>
      </div>

      {/* Session Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link to="/trainer-upcoming">
          <div
            className="rounded-lg shadow-md p-5 hover:shadow-lg transition-all flex items-center"
            style={{ backgroundColor: colors.white }}
          >
            <div
              className="rounded-full p-3 mr-4"
              style={{ backgroundColor: colors.primaryLight }}
            >
              <FaCalendarAlt style={{ color: colors.primary }} />
            </div>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: colors.text }}>
                Upcoming Sessions
              </h3>
              <p style={{ color: colors.textLight }}>
                View and manage scheduled sessions
              </p>
            </div>
          </div>
        </Link>

        <Link to="/trainer-current">
          <div
            className="rounded-lg shadow-md p-5 hover:shadow-lg transition-all flex items-center"
            style={{ backgroundColor: colors.white }}
          >
            <div
              className="rounded-full p-3 mr-4"
              style={{ backgroundColor: colors.primaryLight }}
            >
              <FaPlay style={{ color: colors.primary }} />
            </div>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: colors.text }}>
                Current Session
              </h3>
              <p style={{ color: colors.textLight }}>
                Manage active training session
              </p>
            </div>
          </div>
        </Link>

        <Link to="/trainer-history">
          <div
            className="rounded-lg shadow-md p-5 hover:shadow-lg transition-all flex items-center"
            style={{ backgroundColor: colors.white }}
          >
            <div
              className="rounded-full p-3 mr-4"
              style={{ backgroundColor: colors.primaryLight }}
            >
              <FaHistory style={{ color: colors.primary }} />
            </div>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: colors.text }}>
                Session History
              </h3>
              <p style={{ color: colors.textLight }}>
                Review past training sessions
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Sessions Table */}
      <div
        className="rounded-lg shadow-md overflow-hidden"
        style={{ backgroundColor: colors.white }}
      >
        <div
          className="px-6 py-4 flex justify-between items-center"
          style={{ borderBottom: `1px solid ${colors.border}` }}
        >
          <h2 className="text-lg font-semibold" style={{ color: colors.text }}>
            All Sessions ({filteredSessions.length})
          </h2>
          <div className="text-sm" style={{ color: colors.textLight }}>
            {filter !== "all"
              ? `Filtered by: ${filter}`
              : "Showing all sessions"}
          </div>
        </div>

        {filteredSessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: colors.background }}>
                  <th
                    className="px-6 py-3 text-left"
                    style={{ color: colors.textLight }}
                  >
                    Title
                  </th>
                  <th
                    className="px-4 py-3 text-left"
                    style={{ color: colors.textLight }}
                  >
                    Date
                  </th>
                  <th
                    className="px-4 py-3 text-left"
                    style={{ color: colors.textLight }}
                  >
                    Time
                  </th>
                  <th
                    className="px-4 py-3 text-left"
                    style={{ color: colors.textLight }}
                  >
                    Type
                  </th>
                  <th
                    className="px-4 py-3 text-left"
                    style={{ color: colors.textLight }}
                  >
                    Location
                  </th>
                  <th
                    className="px-4 py-3 text-left"
                    style={{ color: colors.textLight }}
                  >
                    Status
                  </th>
                  <th
                    className="px-4 py-3 text-left"
                    style={{ color: colors.textLight }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => (
                  <tr
                    key={session._id}
                    style={{ borderBottom: `1px solid ${colors.border}` }}
                  >
                    <td className="px-6 py-4" style={{ color: colors.text }}>
                      {session.title}
                    </td>
                    <td
                      className="px-4 py-4"
                      style={{ color: colors.textLight }}
                    >
                      {new Date(session.startTime).toLocaleDateString()}
                    </td>
                    <td
                      className="px-4 py-4"
                      style={{ color: colors.textLight }}
                    >
                      {new Date(session.startTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -
                      {new Date(session.endTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td
                      className="px-4 py-4 capitalize"
                      style={{ color: colors.textLight }}
                    >
                      {session.type}
                    </td>
                    <td
                      className="px-4 py-4"
                      style={{ color: colors.textLight }}
                    >
                      {session.location}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className="px-2 py-1 rounded-full text-xs"
                        style={{
                          backgroundColor:
                            session.status === "scheduled"
                              ? "#DEEBFF"
                              : session.status === "in-progress"
                              ? colors.primaryLight
                              : session.status === "completed"
                              ? "#F4F5F7"
                              : "#FFEBE6",
                          color:
                            session.status === "scheduled"
                              ? "#0052CC"
                              : session.status === "in-progress"
                              ? colors.primary
                              : session.status === "completed"
                              ? colors.textLight
                              : colors.danger,
                        }}
                      >
                        {session.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex space-x-2">
                        <button
                          className="p-1 rounded hover:bg-gray-100 bg-transparent"
                          style={{ color: colors.primary }}
                        >
                          <FaEdit size={16} />
                        </button>
                        <button
                          className="p-1 rounded hover:bg-gray-100 bg-transparent"
                          style={{ color: colors.danger }}
                        >
                          <FaTimes size={16} />
                        </button>
                        <button
                          className="p-1 rounded hover:bg-gray-100 bg-transparent"
                          style={{ color: colors.textLight }}
                        >
                          <FaEllipsisH size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div
              className="rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: colors.primaryLight }}
            >
              <FaCalendarAlt size={24} style={{ color: colors.primary }} />
            </div>
            <h3
              className="text-lg font-medium mb-2"
              style={{ color: colors.text }}
            >
              No sessions found
            </h3>
            <p className="mb-4" style={{ color: colors.textLight }}>
              {searchTerm
                ? "Try adjusting your search or filters"
                : "You haven't scheduled any sessions yet"}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowSessionForm(true)}
                className="px-4 py-2 rounded-md"
                style={{ backgroundColor: colors.primary, color: colors.white }}
              >
                <FaCalendarPlus className="mr-2 inline-block" />
                Schedule Your First Session
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainerSessions;
