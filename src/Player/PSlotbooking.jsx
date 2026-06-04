import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const PSlotbooking = () => {
  const navigate = useNavigate();
  const [turfs, setTurfs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const { auth } = useContext(AuthContext); 
  const userId = auth?._id;

  useEffect(() => {
    const fetchTurfs = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/turf/turfs/`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await response.json();
        setTurfs(data);
      } catch (error) {
        console.error("Error fetching turfs:", error);
      }
    };

    const fetchUserBookings = async () => {
      try {
        if (!userId) return;
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/turf/turfs/bookings/user/${userId}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await response.json();
        setBookings(data);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
    };

    fetchTurfs();
    fetchUserBookings();
  }, [userId]);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Title Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Turf Booking</h1>
        <p className="text-gray-600">Find and manage your turf bookings with ease</p>
      </div>

{/* My Bookings Section */}
<h2 className="text-2xl font-bold mb-4 text-gray-800">My Bookings</h2>
{bookings.length === 0 ? (
  <p className="text-gray-500">No bookings found</p>
) : (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
    {bookings.map((booking) => {
      // Find the corresponding turf for the booking
      const turf = turfs.find(t => t.bookings.some(b => b._id === booking._id));
      
      return (
        <div key={booking._id} className="bg-white shadow-lg rounded-lg p-6 border-l-4 border-green-500">
          <h3 className="text-lg font-semibold text-gray-900">{booking.sport}</h3>
          <p className="text-gray-600"><strong>Turf:</strong> {turf ? turf.name : "Unknown Turf"}</p>
          <p className="text-gray-600"><strong>Date:</strong> {booking.date}</p>
          <p className="text-gray-600"><strong>Time:</strong> {booking.startTime} - {booking.endTime}</p>
          <p className="text-gray-600"><strong>Status:</strong> 
            <span className={`ml-2 px-3 py-1 rounded-full text-white ${booking.status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'}`}>
              {booking.status}
            </span>
          </p>
          <p className="text-gray-600"><strong>Requests:</strong> {booking.requests || "None"}</p>
        </div>
      );
    })}
  </div>
)}


      {/* Available Turfs Section */}
      <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">Available Turfs</h2>
      {turfs.length === 0 ? (
        <p className="text-gray-500">No turfs available</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {turfs.map((turf) => (
            <div key={turf._id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              {turf.photos?.length > 0 && (
                <img
                  src={`/uploads/${turf.photos[0].replace(/\\/g, "/").split("/").pop()}`}
                  alt="Turf"
                  className="w-full h-48 object-cover"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              )}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900">{turf.name}</h3>
                <p className="text-gray-600"><strong>Location:</strong> {turf.location}</p>
                <p className="text-gray-700 font-semibold mt-2"><strong>Price:</strong> ₹{turf.hourlyPrice} / Hour</p>
                <button
                  onClick={() => navigate(`/pturf-details/${turf._id}`)}
                  className="mt-4 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-300 w-full"
                >
                  View More
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PSlotbooking;
