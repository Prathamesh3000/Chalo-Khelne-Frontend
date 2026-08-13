import React, { useState, useEffect } from "react";
import {
  Star,
  ChevronRight,
  ChevronLeft,
  X,
  LogIn,
  UserPlus,
  MapPin,
  ExternalLink,
  Share2,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Carousel from "./LCarousel.jsx";
import TurfCards from "./LTurfCards.jsx";

import { getAuthToken } from "../shared/api/authToken";
// Turf Detail Modal Component
const TurfDetailModal = ({ turf, onClose, onSignInPrompt }) => {
  // Hooks must run unconditionally — keep this above the early return below.
  const [activeTab, setActiveTab] = useState("info");

  if (!turf) return null;

  const getAddress = () => {
    if (!turf.address) return "Address unavailable";
    return turf.address.fullAddress || "Address unavailable";
  };

  const getAreaCity = () => {
    if (!turf.address) return "";

    const area = turf.address.area || "";
    const city = turf.address.city || "";
    const pincode = turf.address.pincode || "";

    let location = "";
    if (area) location += area;
    if (city) {
      if (location) location += ", ";
      location += city;
    }
    if (pincode) {
      if (location) location += " - ";
      location += pincode;
    }

    return location || "Location unavailable";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center overflow-y-auto p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 bg-white hover:bg-gray-100 p-2 rounded-full z-20 shadow-md w-auto"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image Gallery */}
        <div className="relative h-[250px]">
          <img loading="lazy"
            src={
              turf.images?.[0]
                ? `/uploads/${turf.images[0]}`
                : "/src/assets/turfcard.png"
            }
            alt={turf.name || "Sports Facility"}
            className="w-full h-full object-cover"
          />
          {turf.discount && (
            <div className="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-md font-medium">
              {turf.discount}% off
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
            <div className="p-6 text-white">
              <h1 className="text-2xl font-bold">
                {turf.name || "Turf Details"}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="w-4 h-4" />
                <p className="text-white/90">{getAreaCity()}</p>
                {turf.ratings && (
                  <div className="flex items-center gap-1 ml-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>
                      {turf.ratings.average
                        ? turf.ratings.average.toFixed(1)
                        : "0"}
                      /5
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-4 px-6">
            <button
              className={`py-3 px-1 border-b-2 ${
                activeTab === "info"
                  ? "border-[#F97316] text-[#F97316] bg-transparent hover:bg-transparent"
                  : "border-transparent text-gray-500 bg-transparent hover:bg-gray-200"
              } font-medium text-sm transition-colors`}
              onClick={() => setActiveTab("info")}
            >
              Information
            </button>
            <button
              className={`py-3 px-1 border-b-2 ${
                activeTab === "amenities"
                  ? "border-[#F97316] text-[#F97316] bg-transparent hover:bg-transparent"
                  : "border-transparent text-gray-500 bg-transparent hover:bg-gray-200"
              } font-medium text-sm transition-colors`}
              onClick={() => setActiveTab("amenities")}
            >
              Amenities
            </button>
            <button
              className={`py-3 px-1 border-b-2 ${
                activeTab === "reviews"
                  ? "border-[#F97316] text-[#F97316] bg-transparent hover:bg-transparent"
                  : "border-transparent text-gray-500 bg-transparent hover:bg-gray-200"
              } font-medium text-sm transition-colors`}
              onClick={() => setActiveTab("reviews")}
            >
              Reviews
            </button>
          </div>
        </div>

        {/* Content Section based on active tab */}
        <div className="p-6">
          {activeTab === "info" && (
            <>
              {/* Basic Info */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-[#333] mb-3">
                  Facility Information
                </h2>
                <p className="text-gray-700 mb-4">
                  {turf.description ||
                    `${
                      turf.name || "This facility"
                    } offers various sports venues for players of all levels. Book your slot today and enjoy the premium facilities.`}
                </p>

                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h3 className="font-medium mb-2">Address</h3>
                  <p className="text-gray-700">{getAddress()}</p>
                  <p className="text-gray-700">{getAreaCity()}</p>
                  <button className="text-[#F97316] text-sm font-medium mt-2 flex items-center gap-1 w-auto hover:bg-transparent bg-transparent hover:text-blue-900">
                    <ExternalLink
                      className="w-5 h-5"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(
                          `https://maps.google.com/?q=${getAddress()},${getAreaCity()}`,
                          "_blank"
                        );
                      }}
                    />
                  </button>
                </div>

                {/* Available Sports */}
                {turf.sports && turf.sports.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Available Sports</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {turf.sports.map((sport, index) => (
                        <span
                          key={sport.name || `sport-${index}`}
                          className="text-sm border border-gray-200 rounded-full px-3 py-1 flex items-center gap-2"
                        >
                          {sport.icon && (
                            <img loading="lazy"
                              src={sport.icon}
                              alt={sport.name || "Sport"}
                              className="w-4 h-4"
                            />
                          )}
                          {sport.name || "Sport"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Booking CTA */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-6">
                  <h3 className="font-medium text-[#F97316] mb-2">
                    Ready to Play?
                  </h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Book your slot now to enjoy this premium sports facility.
                    {turf.discount &&
                      ` Don't miss the ${turf.discount}% discount offer!`}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      className="bg-[#F97316] text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-500 transition-colors flex items-center justify-center gap-2"
                      onClick={onSignInPrompt}
                    >
                      Book Now <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "amenities" && (
            <div className="py-2">
              <h2 className="text-lg font-semibold text-[#333] mb-4">
                Amenities
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {/* Sample amenities - in a real app, these would come from the turf data */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#F97316]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Parking</h3>
                    <p className="text-sm text-gray-600">
                      Free parking available
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#F97316]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">First Aid</h3>
                    <p className="text-sm text-gray-600">
                      On-site emergency care
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#F97316]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Changing Rooms</h3>
                    <p className="text-sm text-gray-600">
                      Separate for men and women
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#F97316]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Restrooms</h3>
                    <p className="text-sm text-gray-600">Clean facilities</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#F97316]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                      <line x1="9" y1="9" x2="9.01" y2="9"></line>
                      <line x1="15" y1="9" x2="15.01" y2="9"></line>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Refreshments</h3>
                    <p className="text-sm text-gray-600">Cafeteria available</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#F97316]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="2"
                        y="7"
                        width="20"
                        height="15"
                        rx="2"
                        ry="2"
                      ></rect>
                      <polyline points="17 2 12 7 7 2"></polyline>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Equipment Rental</h3>
                    <p className="text-sm text-gray-600">
                      Sports gear available
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Facility Hours</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">
                      Monday - Friday
                    </span>
                    <span className="text-sm">6:00 AM - 10:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">
                      Saturday - Sunday
                    </span>
                    <span className="text-sm">7:00 AM - 11:00 PM</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="py-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-[#333]">
                  Customer Reviews
                </h2>
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">
                    {turf.ratings?.average
                      ? turf.ratings.average.toFixed(1)
                      : "0"}
                    /5
                  </span>
                  <span className="text-sm text-gray-500 ml-1">
                    ({turf.ratings?.count || 0} reviews)
                  </span>
                </div>
              </div>

              {/* Sample review previews */}
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                        <span className="text-sm font-medium">R</span>
                      </div>
                      <div>
                        <p className="font-medium">Rahul S.</p>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={`w-3 h-3 ${
                                n <= 4
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">2 weeks ago</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    Great facility with excellent courts. The staff was very
                    helpful and the equipment was in good condition...
                  </p>
                  <button
                    className="text-[#F97316] text-sm mt-1 font-medium w-auto bg-transparent hover:bg-transparent hover:text-blue-800"
                    onClick={onSignInPrompt}
                  >
                    Read more
                  </button>
                </div>

                <div className="border-b pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                        <span className="text-sm font-medium">A</span>
                      </div>
                      <div>
                        <p className="font-medium">Ananya P.</p>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={`w-3 h-3 ${
                                n <= 5
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">1 month ago</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    Perfect place for badminton enthusiasts. The court lighting
                    is excellent and the ambiance is great...
                  </p>
                  <button
                    className="text-[#F97316] text-sm mt-1 font-medium bg-transparent hover:bg-transparent hover:text-blue-800 w-auto"
                    onClick={onSignInPrompt}
                  >
                    Read more
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <button
                  className="w-full border border-gray-300 rounded-lg py-2 text-[#F97316] font-medium hover:bg-gray-50 transition-colors bg-transparent hover:bg-transparent hover:text-blue-800"
                  onClick={onSignInPrompt}
                >
                  See all reviews
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Sign In Modal Component
const SignInModal = ({ onClose, message }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-lg max-w-md w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 bg-transparent p-2 hover:bg-transparent bg-transparent w-auto"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-[#F97316] mx-auto mb-4">
            <UserPlus className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Sign in to continue
          </h2>
          <p className="text-gray-600">
            {message ||
              "Create an account or sign in to access exclusive features."}
          </p>
        </div>

        <div className="space-y-3">
          <button className="w-full bg-[#F97316] text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-500 transition-colors flex items-center justify-center gap-2">
            <LogIn className="w-5 h-5" />
            Sign in
          </button>

          <div className="text-center mt-4 ">
            <button
              className="text-[#F97316] text-sm font-medium hover:underline hover:bg-transparent bg-transparent w-auto"
              onClick={onClose}
            >
              Continue as guest
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const TurfContent = () => {
  const [turfs, setTurfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTurfs, setTotalTurfs] = useState(0);

  // New state for modals
  const [selectedTurf, setSelectedTurf] = useState(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signInMessage, setSignInMessage] = useState("");

  const fetchTurfs = async (page = 1) => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await fetch(`/api/turfs?page=${page}&limit=10`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch turfs");
      }
      const data = await response.json();

      const turfsData = data.turfs || data;
      setTurfs(turfsData);

      if (data.pagination) {
        setCurrentPage(data.pagination.page);
        setTotalPages(data.pagination.pages);
        setTotalTurfs(data.pagination.total);
      }
    } catch (err) {
      console.error("Error fetching turfs:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTurfs(currentPage);
  }, [currentPage]);

  useEffect(() => {
    // When any modal is open, disable browser scrolling
    if (selectedTurf || showSignInModal) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }

    // Cleanup function
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [selectedTurf, showSignInModal]);

  // If there are no actual turfs from API, create sample data
  const displayTurfs =
    turfs.length > 0
      ? turfs
      : [
          {
            id: "1",
            name: "T12 Sports Turf (Football Cricket)",
            discount: 20,
            ratings: { average: 4.5, count: 24 },
            address: {
              fullAddress: "Mirchandani Palms, Pimple Saudagar",
              area: "Pimple Saudagar",
              city: "Pune",
              pincode: "411017",
            },
            sports: [
              { name: "Box Cricket", icon: "/src/assets/sports_cricket.svg" },
              { name: "Football", icon: "/src/assets/sports_soccer.svg" },
              { name: "Badminton", icon: "/src/assets/shuttlecock.svg" },
              { name: "Table Tennis", icon: "/src/assets/ping-pong.svg" },
            ],
          },
          {
            id: "2",
            name: "SportZ Hub",
            discount: 15,
            ratings: { average: 4.7, count: 36 },
            address: {
              fullAddress: "Balewadi High Street, Balewadi",
              area: "Balewadi",
              city: "Pune",
              pincode: "411045",
            },
            sports: [
              { name: "Football", icon: "/src/assets/sports_soccer.svg" },
              { name: "Tennis", icon: "/src/assets/sports_tennis.svg" },
              { name: "Basketball", icon: "/src/assets/sports_basketball.svg" },
            ],
          },
          {
            id: "3",
            name: "Green Field Sports Complex",
            discount: null,
            ratings: { average: 4.2, count: 18 },
            address: {
              fullAddress: "Aundh IT Park, Aundh",
              area: "Aundh",
              city: "Pune",
              pincode: "411007",
            },
            sports: [
              { name: "Cricket", icon: "/src/assets/sports_cricket.svg" },
              { name: "Football", icon: "/src/assets/sports_soccer.svg" },
            ],
          },
          {
            id: "4",
            name: "Sportify Arena",
            discount: 10,
            ratings: { average: 4.8, count: 42 },
            address: {
              fullAddress: "Kharadi IT Park, Kharadi",
              area: "Kharadi",
              city: "Pune",
              pincode: "411014",
            },
            sports: [
              { name: "Cricket", icon: "/src/assets/sports_cricket.svg" },
              { name: "Basketball", icon: "/src/assets/sports_basketball.svg" },
              { name: "Volleyball", icon: "/src/assets/volleyball.svg" },
            ],
          },
          {
            id: "5",
            name: "Play Arena",
            discount: 25,
            ratings: { average: 4.6, count: 32 },
            address: {
              fullAddress: "Wakad Main Road, Wakad",
              area: "Wakad",
              city: "Pune",
              pincode: "411057",
            },
            sports: [
              { name: "Tennis", icon: "/src/assets/sports_tennis.svg" },
              { name: "Badminton", icon: "/src/assets/shuttlecock.svg" },
              { name: "Football", icon: "/src/assets/sports_soccer.svg" },
            ],
          },
          {
            id: "6",
            name: "Urban Sports Hub",
            discount: null,
            ratings: { average: 4.3, count: 27 },
            address: {
              fullAddress: "Hinjewadi Phase 2, Hinjewadi",
              area: "Hinjewadi",
              city: "Pune",
              pincode: "411057",
            },
            sports: [
              { name: "Box Cricket", icon: "/src/assets/sports_cricket.svg" },
              { name: "Table Tennis", icon: "/src/assets/ping-pong.svg" },
            ],
          },
          {
            id: "7",
            name: "Premier Sports Club",
            discount: 5,
            ratings: { average: 4.5, count: 38 },
            address: {
              fullAddress: "Magarpatta City, Hadapsar",
              area: "Hadapsar",
              city: "Pune",
              pincode: "411028",
            },
            sports: [
              { name: "Swimming", icon: "/src/assets/swimming.svg" },
              { name: "Tennis", icon: "/src/assets/sports_tennis.svg" },
              { name: "Squash", icon: "/src/assets/squash.svg" },
            ],
          },
          {
            id: "8",
            name: "Fitness Zone",
            discount: 15,
            ratings: { average: 4.4, count: 29 },
            address: {
              fullAddress: "Viman Nagar, Near Airport",
              area: "Viman Nagar",
              city: "Pune",
              pincode: "411014",
            },
            sports: [
              { name: "Football", icon: "/src/assets/sports_soccer.svg" },
              { name: "Basketball", icon: "/src/assets/sports_basketball.svg" },
            ],
          },
          {
            id: "9",
            name: "Champions Sports Club",
            discount: null,
            ratings: { average: 4.9, count: 52 },
            address: {
              fullAddress: "Model Colony, Shivajinagar",
              area: "Shivajinagar",
              city: "Pune",
              pincode: "411016",
            },
            sports: [
              { name: "Cricket", icon: "/src/assets/sports_cricket.svg" },
              { name: "Football", icon: "/src/assets/sports_soccer.svg" },
              { name: "Tennis", icon: "/src/assets/sports_tennis.svg" },
              { name: "Badminton", icon: "/src/assets/shuttlecock.svg" },
            ],
          },
        ];

  // Handle turf selection
  const handleTurfClick = (turf) => {
    setSelectedTurf(turf);
  };

  // Handle page change
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = 4;
      }
      if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  // Handle sign in prompt
  const handleSignInPrompt = (message) => {
    setSignInMessage(
      message || "Sign in to access all features and book facilities."
    );
    setShowSignInModal(true);
  };

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-32">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
    </div>
  );

  return (
    <div className="bg-[#F5F7FA]">
      <div className="div">
        <Carousel />
      </div>
      <div className="lg:px-[120px] mt-[60px] px-[10px]">
        <p className="text-[#333] font-roboto text-2xl font-normal leading-normal mt-[20px] mb-[20px]">
          Sports facilities nearby you
        </p>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Error loading sports facilities: {error}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-[24px] gap-y-[20px] mb-[20px]">
              {displayTurfs.map((turf) => (
                <motion.div
                  key={turf.id || turf._id}
                  whileHover={{
                    y: -5,
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <TurfCards turf={turf} onTurfClick={handleTurfClick}/>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 my-8">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg border w-auto ${
                    currentPage === 1
                      ? "border-gray-200 text-gray-300 cursor-not-allowed bg-transparent"
                      : "border-gray-300 text-gray-600 hover:bg-gray-100 bg-transparent"
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {getPageNumbers().map((page, index) =>
                  page === "..." ? (
                    <span key={`dots-${index}`} className="px-2 text-gray-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`min-w-[40px] h-10 rounded-lg font-medium text-sm w-auto ${
                        currentPage === page
                          ? "bg-[#F97316] text-white hover:bg-orange-500"
                          : "bg-transparent border border-gray-300 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-lg border w-auto ${
                    currentPage === totalPages
                      ? "border-gray-200 text-gray-300 cursor-not-allowed bg-transparent"
                      : "border-gray-300 text-gray-600 hover:bg-gray-100 bg-transparent"
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <span className="ml-4 text-sm text-gray-500">
                  Showing {(currentPage - 1) * 10 + 1}-{Math.min(currentPage * 10, totalTurfs)} of {totalTurfs}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Turf Detail Modal */}
      <AnimatePresence>
        {selectedTurf && (
          <TurfDetailModal
            turf={selectedTurf}
            onClose={() => setSelectedTurf(null)}
            onSignInPrompt={() =>
              handleSignInPrompt("Sign in to book this facility.")
            }
          />
        )}
      </AnimatePresence>

      {/* Sign In Modal */}
      <AnimatePresence>
        {showSignInModal && (
          <SignInModal
            onClose={() => setShowSignInModal(false)}
            message={signInMessage}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TurfContent;
