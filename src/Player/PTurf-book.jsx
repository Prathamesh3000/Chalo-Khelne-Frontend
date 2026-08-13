import { toast } from "react-toastify";
import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext"; 
import axios from "axios";
import { useParams } from "react-router-dom";

const PTurfbook = () => {
  const { auth } = useContext(AuthContext);
  const { turfId } = useParams();

  const [booking, setBooking] = useState({
    name: auth?.name || "",
    email: auth?.email || "",
    mobile: auth?.mobile || "",
    sport: "",
    date: "",
    startTime: "",
    duration: "",
    endTime: "",
    equipment: false,
    requests: "",
  });

  useEffect(() => {
    if (auth?.name && auth?.email) {
      setBooking((prev) => ({
        ...prev,
        name: auth.name,
        email: auth.email,
        mobile: auth.mobile || "",  
      }));
    }
  }, [auth]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let updatedBooking = { ...booking, [name]: type === "checkbox" ? checked : value };

    if (name === "startTime" || name === "duration") {
      updatedBooking.endTime = calculateEndTime(updatedBooking.startTime, updatedBooking.duration);
    }

    setBooking(updatedBooking);
  };

  const calculateEndTime = (startTime, duration) => {
    if (!startTime || !duration) return "";
    
    const [hours, minutes] = startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + parseInt(duration) * 60;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!turfId) {
      toast.info("Turf ID is missing!");
      return;
    }
  
    if (!auth?._id) {
      toast.info("User ID is missing! Please log in.");
      return;
    }
  
    const bookingData = {
      ...booking,
      userId: auth._id, 
      turfId: turfId,
      status: "pending"
    };
  
  
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/turf/turfs/${turfId}/bookings`,
        bookingData
      );
  
      if (response.status === 201) {
        toast.info("Booking Confirmed!");
        setBooking({
          name: auth?.name || "",
          email: auth?.email || "",
          mobile: auth?.mobile || "",
          sport: "",
          date: "",
          startTime: "",
          duration: "",
          endTime: "",
          equipment: false,
          requests: "",
        });
      }
    } catch (error) {
      console.error("Booking Error:", error.response?.data || error.message);
      toast.error("Failed to book turf. Please try again.");
    }
  };
  
  
  

  return (
    <div className="p-6 bg-gray-50 min-h-screen flex justify-center items-center">
      <form onSubmit={handleSubmit} className="bg-white p-6 shadow-lg rounded-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Book Turf</h2>

        <label className="block mb-2" htmlFor="full-name">Full Name</label>
        <input id="full-name" type="text" name="name" value={booking.name} onChange={handleChange} required className="w-full p-2 mb-4 border rounded" />

        <label className="block mb-2" htmlFor="email">Email</label>
        <input id="email" type="email" name="email" value={booking.email} onChange={handleChange} required className="w-full p-2 mb-4 border rounded" />

        <label className="block mb-2" htmlFor="mobile-number">Mobile Number</label>
        <input id="mobile-number" type="tel" name="mobile" value={booking.mobile} onChange={handleChange} required className="w-full p-2 mb-4 border rounded" />

        <label className="block mb-2" htmlFor="sport">Sport</label>
        <select id="sport" name="sport" value={booking.sport} onChange={handleChange} required className="w-full p-2 mb-4 border rounded">
          <option value="">Select Sport</option>
          <option value="Table Tennis">Table Tennis</option>
          <option value="Football">Football</option>
          <option value="Cricket">Cricket</option>
          <option value="Tennis">Tennis</option>
          <option value="Badminton">Badminton</option>
        </select>

        <label className="block mb-2" htmlFor="date-of-booking">Date of Booking</label>
        <input id="date-of-booking" type="date" name="date" value={booking.date} onChange={handleChange} required className="w-full p-2 mb-4 border rounded" />

        <label className="block mb-2" htmlFor="start-time">Start Time</label>
        <input id="start-time" type="time" name="startTime" value={booking.startTime} onChange={handleChange} required className="w-full p-2 mb-4 border rounded" />

        <label className="block mb-2" htmlFor="duration-in-hours">Duration (in hours)</label>
        <input id="duration-in-hours" type="number" name="duration" value={booking.duration} onChange={handleChange} min="1" required className="w-full p-2 mb-4 border rounded" />

        <label className="block mb-2" htmlFor="end-time">End Time</label>
        <input id="end-time" type="time" name="endTime" value={booking.endTime} readOnly className="w-full p-2 mb-4 border rounded bg-gray-100" />

        <div className="flex items-center mb-4">
          <input type="checkbox" name="equipment" checked={booking.equipment} onChange={handleChange} className="mr-2" />
          <label>Require Equipment?</label>
        </div>

        <label className="block mb-2" htmlFor="special-requests">Special Requests</label>
        <textarea id="special-requests" name="requests" value={booking.requests} onChange={handleChange} className="w-full p-2 mb-4 border rounded"></textarea>

        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">
          Confirm Booking
        </button>
      </form>
    </div>
  );
};

export default PTurfbook;
