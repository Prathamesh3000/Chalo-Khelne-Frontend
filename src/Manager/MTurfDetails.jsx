import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapPin, IndianRupee, Trophy, Star, User, Clock, Phone, MessageSquare,
  Calendar, Check, X, ChevronLeft, Loader2, AlertCircle, ImageOff,
} from "lucide-react";
import { assetUrl } from "../shared/lib/assetUrl";
import { ManagerShell } from "../shared/layout";

import { getAuthToken } from "../shared/api/authToken";
const MTurfDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [turf, setTurf] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTurfDetails = async () => {
      try {
        const token = getAuthToken();
        const response = await fetch(`/api/turfs/${id}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const data = await response.json();
        setTurf(data);
      } catch (error) {
        console.error("Error fetching turf details:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchBookings = async () => {
      try {
        const token = getAuthToken();
        const response = await fetch(`/api/players/turf-bookings/turf/${id}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const data = await response.json();
        setBookings(data.bookings || []);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
    };

    fetchTurfDetails();
    fetchBookings();
  }, [id]);

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/players/turf-bookings/${bookingId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        setBookings(bookings.map((b) => (b._id === bookingId ? { ...b, status: newStatus } : b)));
      } else {
        console.error("Error updating status");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  if (loading) {
    return (
      <ManagerShell searchPlaceholder="Search turf details…">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      </ManagerShell>
    );
  }

  if (!turf) {
    return (
      <ManagerShell searchPlaceholder="Search turf details…">
        <div className="bg-[#181A22] border border-red-500/20 rounded-lg px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-md bg-red-500/15 inline-flex items-center justify-center mb-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-[14px] font-medium text-white">Turf not found</p>
          <button
            onClick={() => navigate("/mslot-Booking")}
            className="mt-4 inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white h-9 px-3.5 rounded-md text-[13px] font-semibold transition active:scale-[0.98] shadow-sm shadow-orange-500/30 w-auto"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to slot booking
          </button>
        </div>
      </ManagerShell>
    );
  }

  const priceLabel =
    turf.sports?.[0]?.pricePerHour > 0
      ? `₹${turf.sports[0].pricePerHour}/hour`
      : turf.hourlyPrice > 0
      ? `₹${turf.hourlyPrice}/hour`
      : "Not specified";

  const locationLabel = turf.address?.fullAddress
    ? `${turf.address.fullAddress}${turf.address.city ? `, ${turf.address.city}` : ""}${turf.address.pincode ? ` - ${turf.address.pincode}` : ""}`
    : "Not provided";

  return (
    <ManagerShell searchPlaceholder="Search turf details…">
      {/* Header */}
      <header className="flex items-start gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="h-9 w-9 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/[0.04] transition w-auto flex-shrink-0"
          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <MapPin className="w-3.5 h-3.5" />
            Tournaments · Slot booking · Turf
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            {turf.name}
          </h1>
          {turf.description && (
            <p className="mt-1 text-[13px] text-gray-400 max-w-2xl">{turf.description}</p>
          )}
        </div>
      </header>

      {/* Images */}
      {turf.photos?.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          {turf.photos.map((photo, index) => (
            <div key={index} className="aspect-[4/3] rounded-md overflow-hidden bg-white/[0.04]" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              <img loading="lazy"
                src={assetUrl(photo)}
                alt={`Turf ${index + 1}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-10 text-center mb-5">
          <ImageOff className="w-7 h-7 text-gray-600 mx-auto mb-2" />
          <p className="text-[12px] text-gray-500">No photos uploaded</p>
        </div>
      )}

      {/* Info grid */}
      <Section title="Turf information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow icon={MapPin}        label="Location"   value={locationLabel} />
          <InfoRow icon={IndianRupee}   label="Price"      value={priceLabel} />
          <InfoRow icon={Trophy}        label="Sports"     value={
            Array.isArray(turf.sports) && turf.sports.length > 0
              ? turf.sports.map((s) => s.name).join(", ")
              : "Not specified"
          } />
          <InfoRow icon={Star}          label="Ratings"    value={
            turf.ratings ? `${turf.ratings.average} / 5 (${turf.ratings.count} reviews)` : "No ratings yet"
          } />
          <InfoRow icon={User}          label="Owner"      value={
            turf.owner ? `${turf.owner.name} (${turf.owner.email})` : "Not available"
          } />
          <InfoRow icon={Clock}         label="Open time"  value={turf.openTime || "Not specified"} />
          <InfoRow icon={Clock}         label="Close time" value={turf.closeTime || "Not specified"} />
          <InfoRow icon={Phone}         label="Contact"    value={turf.owner?.mobile || "Not available"} mono />
          <InfoRow icon={MessageSquare} label="Reviews"    value={
            Array.isArray(turf.reviews) && turf.reviews.length > 0
              ? `${turf.reviews.length} review${turf.reviews.length === 1 ? "" : "s"}`
              : "No reviews yet"
          } />
        </div>
      </Section>

      {/* Bookings */}
      <div className="mt-4">
        <Section
          title="Bookings"
          icon={Calendar}
          rightSlot={
            <span className="text-[11px] font-semibold text-gray-500 font-mono tabular-nums">
              {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
            </span>
          }
        >
          {bookings.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-2.5">
                <Calendar className="w-4 h-4 text-gray-500" />
              </div>
              <p className="text-[13px] text-gray-400">No bookings yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-5 -mb-4">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <Th>Name</Th>
                    <Th>Sport</Th>
                    <Th>Date</Th>
                    <Th>Time</Th>
                    <Th align="center">Status</Th>
                    <Th align="center">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking._id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition">
                      <Td><span className="font-medium text-white">{booking.userName}</span></Td>
                      <Td><span className="text-gray-300">{booking.sport?.name || "N/A"}</span></Td>
                      <Td><span className="text-gray-300 font-mono tabular-nums">{new Date(booking.date).toLocaleDateString()}</span></Td>
                      <Td><span className="text-gray-300 font-mono tabular-nums">{booking.timeSlot}</span></Td>
                      <Td align="center"><BookingStatusPill status={booking.status} /></Td>
                      <Td align="center">
                        {booking.status === "pending" && (
                          <div className="flex gap-1.5 justify-center">
                            <ActionBtn tone="emerald" onClick={() => handleStatusUpdate(booking._id, "confirmed")}>
                              <Check className="w-3 h-3" /> Confirm
                            </ActionBtn>
                            <ActionBtn tone="red" onClick={() => handleStatusUpdate(booking._id, "cancelled")}>
                              <X className="w-3 h-3" /> Reject
                            </ActionBtn>
                          </div>
                        )}
                        {booking.status === "confirmed" && (
                          <div className="flex gap-1.5 justify-center">
                            <ActionBtn tone="orange" onClick={() => handleStatusUpdate(booking._id, "completed")}>
                              <Check className="w-3 h-3" /> Complete
                            </ActionBtn>
                            <ActionBtn tone="red" onClick={() => handleStatusUpdate(booking._id, "cancelled")}>
                              <X className="w-3 h-3" /> Cancel
                            </ActionBtn>
                          </div>
                        )}
                        {(booking.status === "cancelled" || booking.status === "completed") && (
                          <span className="text-[11px] text-gray-500">No actions</span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </ManagerShell>
  );
};

// ── Dark inline primitives ───────────────────────────────────────────────────

function Section({ title, icon: Icon, rightSlot, children }) {
  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <span className="w-7 h-7 rounded-md bg-orange-500/15 grid place-items-center flex-shrink-0">
              <Icon className="w-3.5 h-3.5 text-orange-400" />
            </span>
          )}
          <h3 className="text-[13px] font-medium text-white truncate">{title}</h3>
        </div>
        {rightSlot}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
        <p className={`text-[13px] text-gray-200 mt-0.5 ${mono ? "font-mono tabular-nums" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

function Th({ children, align }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <th className={`py-3 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500 ${a}`}>{children}</th>;
}

function Td({ children, align }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <td className={`py-3 px-3 ${a}`}>{children}</td>;
}

function BookingStatusPill({ status }) {
  const s = (status || "").toLowerCase();
  let cls = "bg-white/[0.06] text-gray-400";
  let label = status?.charAt(0).toUpperCase() + status?.slice(1) || "—";
  if (s === "confirmed") cls = "bg-emerald-500/15 text-emerald-300";
  else if (s === "pending")   cls = "bg-amber-500/15 text-amber-300";
  else if (s === "cancelled") cls = "bg-red-500/15 text-red-300";
  else if (s === "completed") cls = "bg-orange-500/15 text-orange-300";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

function ActionBtn({ tone, onClick, children }) {
  const tones = {
    emerald: "bg-emerald-500 hover:bg-emerald-600 text-white",
    orange:  "bg-orange-500 hover:bg-orange-600 text-white",
    red:     "text-red-400 hover:text-red-300 hover:bg-red-500/10",
  };
  const style = tone === "red" ? { border: "1px solid rgba(248,113,113,0.25)" } : undefined;
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-semibold transition active:scale-[0.98] w-auto ${tones[tone]}`}
      style={style}
    >
      {children}
    </button>
  );
}

export default MTurfDetails;
