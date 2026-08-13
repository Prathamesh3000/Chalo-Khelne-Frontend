import { toast } from "react-toastify";
import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

import { getAuthToken } from "../shared/api/authToken";
const MTrainerApplications = () => {
  const { auth } = useContext(AuthContext);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    if (auth?._id) {
      fetchApplications();
    }
  }, [filter, auth]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const managerId = auth?._id;

      if (!managerId) {
        console.error("No manager ID found in auth context");
        return;
      }

      const token = getAuthToken();
      const response = await fetch(
        `/api/manager/trainer-applications?managerId=${managerId}&status=${filter}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setApplications(data);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationAction = async (
    applicationId,
    action,
    rejectionReason = ""
  ) => {
    try {
      const token = getAuthToken();
      const response = await fetch(
        `/api/manager/trainer-applications/${applicationId}/${action}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "manager-id": auth?._id,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ rejectionReason }),
        }
      );

      if (response.ok) {
        fetchApplications(); // Refresh the list
      } else {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        toast.info(errorData.message || "Failed to process application");
      }
    } catch (error) {
      console.error(`Error ${action} application:`, error);
      toast.info("Network error occurred");
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };

    const safeStatus = status || "pending";

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          statusStyles[safeStatus] || statusStyles.pending
        }`}
      >
        {safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1)}
      </span>
    );
  };

  // Add auth check
  if (!auth?._id) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-500">
          Please log in as a manager to view applications.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Trainer Applications
        </h1>

        {/* Filter Buttons */}
        <div className="flex space-x-2">
          {["pending", "approved", "rejected"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === status
                  ? "bg-orange-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {applications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No {filter} applications found.</p>
          </div>
        ) : (
          applications.map((application) => (
            <div
              key={application._id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              {/* Card Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <svg
                        className="w-5 h-5 text-orange-500 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      Trainer Application
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        {application.clubName || "Unknown Club"} -{" "}
                        {application.turfName || "Unknown Turf"}
                      </div>
                      <div className="flex items-center">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        {new Date(application.appliedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(
                    application.managerStatus ||
                      application.overallStatus ||
                      "pending"
                  )}
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6 space-y-4">
                {/* Trainer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Trainer Information
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Trainer:</span>{" "}
                        {application.trainerId?.name || "Unknown Trainer"}
                      </p>
                      <p>
                        <span className="font-medium">Trainer ID:</span>{" "}
                        {application.trainerId?._id ||
                          application.trainerId ||
                          "Unknown"}
                      </p>
                      {application.trainerSports && (
                        <p>
                          <span className="font-medium">Sports:</span>{" "}
                          {Array.isArray(application.trainerSports)
                            ? application.trainerSports.join(", ")
                            : application.trainerSports}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Certificates */}
                  {application.certificates &&
                    application.certificates.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                            />
                          </svg>
                          Certificates ({application.certificates.length})
                        </h4>
                        <div className="space-y-2 text-sm">
                          {application.certificates
                            .slice(0, 3)
                            .map((cert, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between bg-gray-50 p-2 rounded"
                              >
                                <div>
                                  <p className="text-gray-600 font-medium">
                                    {cert.name}
                                  </p>
                                  <p className="text-gray-500 text-xs">
                                    Issued by: {cert.issuedBy}
                                  </p>
                                </div>
                                {cert.certificateUrl && (
                                  <a
                                    href={`/api${cert.certificateUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-orange-500 hover:text-orange-700 text-xs underline"
                                  >
                                    View Certificate
                                  </a>
                                )}
                              </div>
                            ))}
                          {application.certificates.length > 3 && (
                            <p className="text-orange-500 text-xs">
                              +{application.certificates.length - 3} more
                              certificates
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                </div>

                {/* Application Message */}
                {application.applicationMessage && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      Application Message
                    </h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                      {application.applicationMessage}
                    </p>
                  </div>
                )}

                {/* Experience */}
                {application.trainerExperience && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Experience
                    </h4>
                    <p className="text-sm text-gray-600">
                      {application.trainerExperience}
                    </p>
                  </div>
                )}

                {/* Action Buttons for Pending Applications */}
                {(application.managerStatus ||
                  application.overallStatus ||
                  "pending") === "pending" && (
                  <div className="flex space-x-3 pt-4 border-t">
                    <button
                      onClick={() =>
                        handleApplicationAction(application._id, "approve")
                      }
                      className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors w-auto"
                    >
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt(
                          "Enter rejection reason (optional):"
                        );
                        handleApplicationAction(
                          application._id,
                          "reject",
                          reason
                        );
                      }}
                      className="flex items-center px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-md text-sm font-medium transition-colors w-auto bg-transparent"
                    >
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Reject
                    </button>
                  </div>
                )}

                {/* Rejection Reason */}
                {(application.managerStatus === "rejected" ||
                  application.overallStatus === "rejected") &&
                  application.managerRejectionReason && (
                    <div className="bg-red-50 p-3 rounded border border-red-200">
                      <h4 className="font-semibold text-red-800 mb-1">
                        Rejection Reason:
                      </h4>
                      <p className="text-sm text-red-700">
                        {application.managerRejectionReason}
                      </p>
                    </div>
                  )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MTrainerApplications;
