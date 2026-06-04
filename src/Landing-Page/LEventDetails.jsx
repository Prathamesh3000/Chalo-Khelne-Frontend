import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, MapPin, Calendar, Award, IndianRupee, ArrowLeft, Clock } from "lucide-react";
import cardImg from "../assets/card-img.png";

const EventDetails = () => {
  const navigate = useNavigate();

  const crumbs = [
    { label: "Events", path: "/l/event" },
    { label: "Live" },
    { label: "Event Details", active: true },
  ];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 md:px-12 py-6">
        <div className="max-w-[1200px] mx-auto">
          {/* Back + Breadcrumbs */}
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition w-auto">
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
            <nav className="flex items-center gap-1 text-sm">
              {crumbs.map((crumb, i) => (
                <div key={i} className="flex items-center">
                  {crumb.path ? (
                    <button onClick={() => navigate(crumb.path)} className="text-gray-400 hover:text-orange-500 transition-colors text-xs font-medium w-auto">
                      {crumb.label}
                    </button>
                  ) : (
                    <span className={`text-xs font-medium ${crumb.active ? "text-orange-500" : "text-gray-400"}`}>
                      {crumb.label}
                    </span>
                  )}
                  {i < crumbs.length - 1 && <ChevronRight className="w-3.5 h-3.5 mx-1 text-gray-300" />}
                </div>
              ))}
            </nav>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">Event Details</h1>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-8 space-y-5">
        {/* Hero Image */}
        <div className="rounded-2xl overflow-hidden h-[320px] md:h-[420px] bg-gray-200">
          <img src={cardImg} alt="Event" className="w-full h-full object-cover" />
        </div>

        {/* Info Cards */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Tournament Name</h2>
          <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-2.5 py-0.5 rounded-full">Knockout</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Venue</p>
                <p className="text-sm font-bold text-gray-900">Rajdhani Sports Club</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">1st Floor, Victory Complex, Opposite City Park, Sector 12, Nigadi, Pune - 411017</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Schedule</p>
                <p className="text-sm font-bold text-gray-900">Oct 19 – Oct 20</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Booking closes on: Oct 18, 2024</p>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3">About the Event</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Join us for an exciting tournament that brings together the finest athletes for a showcase of skill and sportsmanship. Whether you're a seasoned competitor or a newcomer, this event offers competitive matches across multiple categories.
          </p>
        </div>

        {/* Organizer */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <Award className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Organized by</p>
              <p className="text-sm font-bold text-gray-900">Organizer Name</p>
            </div>
          </div>
        </div>

        {/* Amenities */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Amenities</h3>
          <div className="flex flex-wrap gap-2">
            {["Changing Room", "Parking", "Drinking Water", "First Aid"].map((a) => (
              <span key={a} className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-600">
                {a}
              </span>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Categories</h3>
          <div className="flex flex-wrap gap-2">
            {["Open Category", "Under 15 (U15)", "Veterans (39+)", "Veterans (59+)"].map((cat, i) => (
              <button
                key={cat}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition w-auto ${
                  i === 0 ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Cancellation */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-2">Cancellation Policy</h3>
          <p className="text-xs text-gray-500">Full refund if cancelled 48 hours before the event. 50% refund for cancellations within 24-48 hours. No refund for cancellations within 24 hours.</p>
        </div>

        {/* CTA */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-sm font-bold text-gray-900">Match in progress</p>
              <p className="text-xs text-gray-500">Started 20 minutes ago</p>
            </div>
          </div>
          <button className="w-full sm:w-auto px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-orange-200 active:scale-[0.97]">
            View Match Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
