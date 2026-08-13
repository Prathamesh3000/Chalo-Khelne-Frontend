import { toast } from "react-toastify";
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getAuthToken } from "../shared/api/authToken";
const UserBookings = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [bookings, setBookings] = useState([]);
  const [turf, setTurf] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ booking: null, action: null });
  const [filters, setFilters] = useState({
    date: "",
    status: "",
  });

  // Material Icons component
  const Icon = ({ name, className = "" }) => (
    <i className={`material-icons ${className}`}>{name}</i>
  );

  // Modal Component
  const PaymentModal = ({ isOpen, onClose, onConfirm, booking, action }) => {
    if (!isOpen) return null;

    const getModalContent = () => {
      switch (action) {
        case "mark_paid":
          return {
            title: "Mark Payment as Paid",
            message: `Are you sure you want to mark the payment for ${booking?.userName} as paid?`,
            confirmText: "Mark as Paid",
            confirmClass: "bg-orange-500 hover:bg-orange-600",
          };
        case "mark_failed":
          return {
            title: "Mark Payment as Failed",
            message: `Are you sure you want to mark the payment for ${booking?.userName} as failed?`,
            confirmText: "Mark as Failed",
            confirmClass: "bg-red-600 hover:bg-red-700",
          };
        case "retry":
          return {
            title: "Retry Payment",
            message: `Reset the payment status for ${booking?.userName} back to pending?`,
            confirmText: "Reset to Pending",
            confirmClass: "bg-yellow-600 hover:bg-yellow-700",
          };
        default:
          return {};
      }
    };

    const content = getModalContent();

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {content.title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors w-auto bg-transparent hover:bg-transparent"
            >
              <Icon name="close" className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-700 mb-4">{content.message}</p>

            {/* Booking Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Amount:</span>
                  <span className="ml-2 font-medium">
                    ₹{booking?.amount || 0}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Date:</span>
                  <span className="ml-2 font-medium">
                    {booking?.date
                      ? new Date(booking.date).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Time:</span>
                  <span className="ml-2 font-medium">
                    {booking?.timeSlot || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Current Status:</span>
                  <span
                    className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getPaymentBadge(
                      booking?.paymentStatus
                    )}`}
                  >
                    {booking?.paymentStatus?.charAt(0).toUpperCase() +
                      booking?.paymentStatus?.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={updating === booking?._id}
              className={`px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${content.confirmClass}`}
            >
              {updating === booking?._id ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Updating...
                </div>
              ) : (
                content.confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Confirmation Modal for Mark as Paid
  const ConfirmationModal = ({ isOpen, onClose, onConfirm, booking }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
        <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Confirm Payment
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors w-auto bg-transparent hover:bg-transparent"
            >
              <Icon name="close" className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-orange-100">
                <Icon name="payment" className="text-orange-500" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Mark as Paid?
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                This will mark the payment for{" "}
                <strong>{booking?.userName}</strong> as completed.
              </p>
              <div className="bg-orange-50 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-gray-900">
                  Amount: ₹{booking?.amount || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-white bg-orange-500 rounded-md hover:bg-orange-600 transition-colors"
            >
              Yes, Mark as Paid
            </button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getAuthToken();
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
        // Fetch turf details
        const turfResponse = await fetch(
          `/api/turfs/${id}`,
          { headers: { ...authHeaders } }
        );
        if (turfResponse.ok) {
          const turfData = await turfResponse.json();
          setTurf(turfData);
        }

        // Fetch turf bookings
        const queryParams = new URLSearchParams();
        if (filters.date) queryParams.append("date", filters.date);
        if (filters.status) queryParams.append("status", filters.status);

        const bookingsResponse = await fetch(
          `/api/players/turf-bookings/turf/${id}?${queryParams}`,
          { headers: { ...authHeaders } }
        );

        if (!bookingsResponse.ok) {
          throw new Error("Failed to fetch bookings");
        }

        const bookingsData = await bookingsResponse.json();
        setBookings(bookingsData.bookings || []);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, filters]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
      pending: "bg-amber-100 text-amber-800 border-amber-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
    };
    return (
      statusConfig[status] || "bg-slate-100 text-slate-800 border-slate-200"
    );
  };

  const getPaymentBadge = (paymentStatus) => {
    const statusConfig = {
      paid: "bg-green-100 text-green-800 border-green-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      failed: "bg-rose-100 text-rose-800 border-rose-200",
    };
    return (
      statusConfig[paymentStatus] || "bg-gray-100 text-gray-800 border-gray-200"
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const updatePaymentStatus = async (
    bookingId,
    newStatus,
    paymentMethod = null
  ) => {
    setUpdating(bookingId);
    try {
      // Get manager ID properly (you might need to adjust this based on how you store it)
      const managerId =
        localStorage.getItem("managerId") ||
        sessionStorage.getItem("managerId");

      const token = getAuthToken();
      const response = await fetch(
        `/api/manager/turf-bookings/${bookingId}/payment-status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "manager-id": managerId || "", // Send empty string instead of null
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            paymentStatus: newStatus,
            paymentMethod: paymentMethod,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update payment status");
      }

      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking._id === bookingId
            ? {
                ...booking,
                paymentStatus: newStatus,
                ...(paymentMethod && { paymentMethod }),
              }
            : booking
        )
      );

      setShowModal(false);
      setShowConfirmModal(false);
      setModalData({ booking: null, action: null });
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error("Failed to update payment status. Please try again.");
    } finally {
      setUpdating(null);
    }
  };

  const handlePaymentStatusClick = (booking) => {
    if (booking.paymentStatus === "pending") {
      setModalData({ booking, action: "mark_paid" });
      setShowModal(true);
    } else if (booking.paymentStatus === "failed") {
      setModalData({ booking, action: "retry" });
      setShowModal(true);
    }
  };

  const handleModalConfirm = () => {
    const { booking, action } = modalData;
    if (action === "mark_paid") {
      // Show confirmation sub-modal
      setShowConfirmModal(true);
    } else if (action === "retry") {
      updatePaymentStatus(booking._id, "pending");
    }
  };

  const handleConfirmPayment = () => {
    const { booking } = modalData;
    updatePaymentStatus(booking._id, "paid", "cash");
    setShowConfirmModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">Loading bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <Icon name="error" className="text-red-500 mr-3" />
              <span className="text-red-700 font-medium">Error: {error}</span>
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Icon name="arrow_back" className="mr-2" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-4 py-2 mb-6 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium w-auto"
          >
            <Icon name="arrow_back" className="mr-2" />
            Back to Turf Details
          </button>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {turf?.name || "Turf"} - User Bookings
            </h1>
            <p className="text-slate-600 flex items-center">
              <Icon name="event" className="mr-2" />
              {bookings.length} bookings found
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <Icon name="filter_list" className="mr-2" />
            Filters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2" htmlFor="date">
                Date
              </label>
              <input id="date"
                type="date"
                value={filters.date}
                onChange={(e) =>
                  setFilters({ ...filters, date: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2" htmlFor="booking-status">
                Booking Status
              </label>
              <select id="booking-status"
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="w-full px-3 py-2.5 mt-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ date: "", status: "" })}
                className="px-4 py-2 m-9 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium flex items-center w-auto"
              >
                <Icon name="clear" className="mr-2" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Bookings Table */}
        {bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <Icon name="event_busy" className="text-6xl text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No bookings found
            </h3>
            <p className="text-slate-600">
              Try adjusting your filters or check back later.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      User Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Booking Info
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Sport
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Booking Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Payment Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Payment Method
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bookings.map((booking) => (
                    <tr
                      key={booking._id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {/* User Details */}
                      <td className="px-6 py-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                              <Icon name="person" className="text-orange-500" />
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-semibold text-slate-900">
                              {booking.userName}
                            </div>
                            {booking.userEmail && (
                              <div className="text-xs text-slate-600 mt-1">
                                {booking.userEmail}
                              </div>
                            )}
                            {booking.userPhone && (
                              <div className="text-xs text-slate-600">
                                {booking.userPhone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Booking Info */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900">
                          <div className="font-medium">
                            ID: {booking._id.slice(-6)}
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            Booked: {formatDate(booking.createdAt)}
                          </div>
                          {booking.cancellationReason && (
                            <div className="text-xs text-red-600 mt-1">
                              Cancelled: {booking.cancellationReason}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-slate-900">
                            {formatDate(booking.date)}
                          </div>
                          <div className="text-slate-600 text-xs mt-1">
                            {booking.timeSlot || "Not specified"}
                          </div>
                        </div>
                      </td>

                      {/* Sport */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">
                          {booking.sport?.name || "Not specified"}
                        </div>
                      </td>

                      {/* Booking Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(
                            booking.status
                          )}`}
                        >
                          {booking.status?.charAt(0).toUpperCase() +
                            booking.status?.slice(1)}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td className="px-6 py-4">
                        {updating === booking._id ? (
                          <div className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border bg-orange-50 text-orange-700 border-orange-200">
                            <div className="w-3 h-3 border border-orange-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                            Updating...
                          </div>
                        ) : (
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border cursor-pointer transition-all hover:scale-105 ${getPaymentBadge(
                              booking.paymentStatus
                            )} ${
                              booking.paymentStatus === "pending"
                                ? "hover:bg-green-50 hover:text-green-800 hover:border-green-300"
                                : booking.paymentStatus === "failed"
                                ? "hover:bg-yellow-50 hover:text-yellow-800 hover:border-yellow-300"
                                : "cursor-default"
                            }`}
                            onClick={() => handlePaymentStatusClick(booking)}
                            title={
                              booking.paymentStatus === "pending"
                                ? "Click to mark as paid"
                                : booking.paymentStatus === "failed"
                                ? "Click to retry"
                                : "Payment completed"
                            }
                          >
                            {booking.paymentStatus?.charAt(0).toUpperCase() +
                              booking.paymentStatus?.slice(1)}
                            {booking.paymentStatus === "pending" && (
                              <span className="ml-1">💳</span>
                            )}
                            {booking.paymentStatus === "failed" && (
                              <span className="ml-1">🔄</span>
                            )}
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-900">
                          ₹{booking.amount || 0}
                        </div>
                      </td>

                      {/* Payment Method */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">
                          {booking.paymentMethod || "Cash"}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Payment Update Modal */}
      <PaymentModal
        isOpen={showModal && !showConfirmModal}
        onClose={() => {
          setShowModal(false);
          setShowConfirmModal(false);
          setModalData({ booking: null, action: null });
        }}
        onConfirm={handleModalConfirm}
        booking={modalData.booking}
        action={modalData.action}
      />

      {/* Confirmation Sub-Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
        }}
        onConfirm={handleConfirmPayment}
        booking={modalData.booking}
      />
    </div>
  );
};

export default UserBookings;
