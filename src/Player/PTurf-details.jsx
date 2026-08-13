import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { assetUrl } from "../shared/lib/assetUrl";

import { getAuthToken } from "../shared/api/authToken";
const PTurfdetails = () => {
  const { id } = useParams(); // Get turf ID from URL
  const [turf, setTurf] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTurfDetails = async () => {
      try {
        const token = getAuthToken();
        // Real turf endpoint (getTurfById) — returns the full turf doc incl.
        // sports[], address, contact, ownerPayment and the SuperAdmin
        // `bookingDisabled` flag that drives the Book / Contact button below.
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/turfs/${id}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await response.json();
        setTurf(data);
      } catch (error) {
        console.error("Error fetching turf details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTurfDetails();
  }, [id]);

  if (loading) {
    return <p className="text-center text-gray-500 text-lg">Loading...</p>;
  }

  if (!turf || !turf._id) {
    return <p className="text-center text-red-500 text-lg">Turf not found</p>;
  }

  const bookingDisabled = !!turf.bookingDisabled;

  const cityLine = [turf.address?.area, turf.address?.city].filter(Boolean).join(", ");
  const sportsLine = Array.isArray(turf.sports) && turf.sports.length
    ? turf.sports.map((s) => s.name).join(", ")
    : "Not specified";
  const priceFrom = Array.isArray(turf.sports) && turf.sports.length
    ? Math.min(...turf.sports.map((s) => s.pricePerHour || 0).filter((n) => n > 0))
    : 0;
  const facilityNames = turf.facilities
    ? Object.entries(turf.facilities).filter(([, v]) => v).map(([k]) =>
        k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()))
    : [];

  // Owner contact fallback shown when SuperAdmin has switched this turf to
  // contact-only. Prefer the turf's explicit contact block, fall back to owner.
  const contactName = turf.contact?.name || turf.owner?.name || turf.name;
  const contactPhone = turf.contact?.phone || turf.contact?.whatsapp || turf.owner?.mobile || "";
  const contactWhatsapp = turf.contact?.whatsapp || "";

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-4xl font-extrabold text-gray-800 mb-2">{turf.name}</h2>
        <p className="text-gray-600 text-lg">{turf.description || "No description provided"}</p>

        {Array.isArray(turf.images) && turf.images.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mt-6">
            {turf.images.map((img, index) => (
              <img loading="lazy"
                key={index}
                src={assetUrl(img)}
                alt={`Turf ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg shadow-md hover:scale-105 transition-transform duration-200"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            ))}
          </div>
        )}

        {/* Turf Details */}
        <div className="mt-8 bg-gray-100 p-6 rounded-lg shadow-md">
          <div className="grid grid-cols-2 gap-4 text-gray-700">
            <p><strong>📍 Location:</strong> {turf.address?.fullAddress || cityLine || "Not provided"}</p>
            <p><strong>💰 Price:</strong> {priceFrom > 0 ? `From ₹${priceFrom}/hour` : "Not specified"}</p>
            <p><strong>🏆 Sports:</strong> {sportsLine}</p>
            <p><strong>🛠 Amenities:</strong> {facilityNames.length ? facilityNames.slice(0, 6).join(", ") : "Not provided"}</p>
            <p><strong>⭐ Rating:</strong> {turf.ratings?.count ? `${turf.ratings.average?.toFixed(1)} (${turf.ratings.count})` : "No reviews yet"}</p>
            <p><strong>📞 Contact:</strong> {contactPhone || "Not available"}</p>
          </div>
        </div>

        {/* Book / Contact action — driven by the SuperAdmin bookingDisabled flag */}
        <div className="mt-6">
          {bookingDisabled ? (
            <div className="max-w-md mx-auto bg-amber-50 border border-amber-200 rounded-lg p-5 text-center">
              <p className="text-amber-800 font-semibold">
                This turf isn’t accepting online bookings right now.
              </p>
              <p className="text-amber-700 text-sm mt-1">
                Please reach out to the turf directly to book your slot.
              </p>
              <div className="mt-4 text-gray-700 text-sm space-y-0.5">
                <p className="font-semibold text-gray-900">{contactName}</p>
                {contactPhone && <p>📞 {contactPhone}</p>}
                {contactWhatsapp && contactWhatsapp !== contactPhone && <p>💬 WhatsApp: {contactWhatsapp}</p>}
              </div>
              {contactPhone ? (
                <a
                  href={`tel:${contactPhone}`}
                  className="inline-block mt-4 bg-amber-500 text-white px-6 py-3 rounded-lg text-lg font-bold hover:bg-amber-600 transition"
                >
                  Contact Turf
                </a>
              ) : (
                <button
                  disabled
                  className="mt-4 bg-gray-300 text-white px-6 py-3 rounded-lg text-lg font-bold cursor-not-allowed"
                >
                  Contact Turf
                </button>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <Link to={`/turfs/${id}/book`}>
                <button className="bg-green-500 text-white px-6 py-3 rounded-lg text-xl font-bold hover:bg-green-600 transition">
                  Book Now
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PTurfdetails;
