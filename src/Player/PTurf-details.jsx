import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

const PTurfdetails = () => {
  const { id } = useParams(); // Get turf ID from URL
  const [turf, setTurf] = useState(null);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    const fetchTurfDetails = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/turf/turfs/${id}`, {
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

  if (!turf) {
    return <p className="text-center text-red-500 text-lg">Turf not found</p>;
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-4xl font-extrabold text-gray-800 mb-2">{turf.name}</h2>
        <p className="text-gray-600 text-lg">{turf.about || "No description provided"}</p>

        
        {turf.photos?.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mt-6">
            {turf.photos.map((photo, index) => (
              <img
                key={index}
                src={`/uploads/${photo.replace(/\\/g, "/").split("/").pop()}`}
                alt={`Turf ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg shadow-md hover:scale-105 transition-transform duration-200"
              />
            ))}
          </div>
        )}

        {/* Turf Details */}
        <div className="mt-8 bg-gray-100 p-6 rounded-lg shadow-md">
          <div className="grid grid-cols-2 gap-4 text-gray-700">
            <p><strong>📍 Location:</strong> {turf.location || "Not provided"}</p>
            <p><strong>💰 Price:</strong> {turf.hourlyPrice > 0 ? `₹${turf.hourlyPrice}/hour` : "Not specified"}</p>
            <p><strong>🏆 Sports:</strong> {turf.sports || "Not specified"}</p>
            <p><strong>🎁 Offers:</strong> {turf.offers || "None"}</p>
            <p><strong>🛠 Amenities:</strong> {turf.amenities || "Not provided"}</p>
            <p><strong>⚖️ Rules:</strong> {turf.rules || "Not provided"}</p>
            <p><strong>🔄 Cancellation Policy:</strong> {turf.cancellationPolicy || "Not specified"}</p>
            <p><strong>📞 Contact:</strong> {turf.contacts || "Not available"}</p>
            <p><strong>🕘 Open Time:</strong> {turf.openTime || "Not specified"}</p>
            <p><strong>🕙 Close Time:</strong> {turf.closeTime || "Not specified"}</p>
            <p><strong>⭐ Reviews:</strong> {turf.reviews || "No reviews yet"}</p>
            <p><strong>📅 Booking System:</strong> {turf.bookingSystem || "Not specified"}</p>
            <p><strong>🎉 Special Events:</strong> {turf.specialEvents || "None"}</p>
            <p><strong>🎟 Membership Plans:</strong> {turf.membershipPlans || "None"}</p>
            <p><strong>🚗 Parking:</strong> {turf.parkingFacility || "Not provided"}</p>
          </div>
        </div>

        {/* Book Now Button */}
        <div className="mt-6 flex justify-center">
          <Link to={`/turfs/${id}/book`}>
            <button className="bg-green-500 text-white px-6 py-3 rounded-lg text-xl font-bold hover:bg-green-600 transition">
              Book Now
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PTurfdetails;
