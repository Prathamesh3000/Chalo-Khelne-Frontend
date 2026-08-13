import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assetUrl } from "../shared/lib/assetUrl";

import { getAuthToken } from "../shared/api/authToken";
const TurfDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [turf, setTurf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Material Icons component
  const Icon = ({ name, className = "" }) => (
    <i className={`material-icons ${className}`}>{name}</i>
  );

  useEffect(() => {
    const fetchTurfDetails = async () => {
      try {
        const token = getAuthToken();
        const response = await fetch(
          `/api/turfs/${id}`,
          {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch turf details");
        }

        const data = await response.json();
        setTurf(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTurfDetails();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="text-center py-20">
          <div className="text-gray-600">Loading turf details...</div>
        </div>
      </div>
    );
  }

  if (error || !turf) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center">
            <Icon name="error" className="mr-2" />
            <span>Error: {error || "Turf not found"}</span>
          </div>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <Icon name="arrow_back" />
          Go Back
        </button>
      </div>
    );
  }

  const getFacilityIcon = (facilityKey) => {
    const facilityIcons = {
      artificialTurf: "grass",
      multipleFields: "stadium",
      floodLights: "lightbulb",
      ledLights: "highlight",
      lockerRooms: "storage",
      shower: "shower",
      restrooms: "wc",
      grandstands: "chair",
      coveredAreas: "umbrella",
      parking: "local_parking",
      foodCourt: "restaurant",
      coldDrinks: "local_drink",
      drinkingWater: "water_drop",
      wifi: "wifi",
      loungeArea: "chair",
      surveillanceCameras: "videocam",
      securityPersonnel: "security",
      firstAidKit: "local_hospital",
    };
    return facilityIcons[facilityKey] || "check_circle";
  };

  const getFacilityLabel = (facilityKey) => {
    const facilityLabels = {
      artificialTurf: "Artificial Turf",
      multipleFields: "Multiple Fields",
      floodLights: "Flood Lights",
      ledLights: "LED Lights",
      lockerRooms: "Locker Rooms",
      shower: "Shower",
      restrooms: "Restrooms",
      grandstands: "Grandstands",
      coveredAreas: "Covered Areas",
      parking: "Parking",
      foodCourt: "Food Court",
      coldDrinks: "Cold Drinks",
      drinkingWater: "Drinking Water",
      wifi: "WiFi",
      loungeArea: "Lounge Area",
      surveillanceCameras: "Security Cameras",
      securityPersonnel: "Security Personnel",
      firstAidKit: "First Aid Kit",
    };

    return (
      facilityLabels[facilityKey] ||
      facilityKey
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors flex items-center gap-2 w-auto"
        >
          <Icon name="arrow_back" />
          Back to Turfs
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{turf.name}</h1>
            <p className="text-gray-600 mt-1">
              <Icon name="location_on" className="mr-1" />
              {turf.address?.area}, {turf.address?.city}
            </p>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-sm ${
              turf.isActive
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            <Icon
              name={turf.isActive ? "check_circle" : "cancel"}
              className="mr-1"
            />
            {turf.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Images and Basic Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Images</h3>
            {turf.images?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {turf.images.map((image, index) => (
                  <img loading="lazy"
                    key={index}
                    src={assetUrl(image)}
                    alt={`${turf.name} - Image ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-100 rounded-lg">
                <Icon name="image" className="text-4xl text-gray-400 mb-2" />
                <p className="text-gray-500">No images available</p>
              </div>
            )}
          </div>

          {/* Description */}
          {turf.description && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Description
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {turf.description}
              </p>
            </div>
          )}

          {/* Sports and Pricing */}
          {turf.sports?.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                <Icon name="sports" className="mr-2" />
                Sports Available
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {turf.sports.map((sport, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <h4 className="font-semibold text-gray-900">
                      {sport.name}
                    </h4>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Facilities */}
          {turf.facilities && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                <Icon name="build" className="mr-2" />
                Facilities
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(turf.facilities)
                  .filter(([key, value]) => value === true)
                  .map(([facilityKey]) => (
                    <div
                      key={facilityKey}
                      className="flex items-center p-3 bg-green-50 rounded-lg"
                    >
                      <Icon
                        name={getFacilityIcon(facilityKey)}
                        className="text-green-600 mr-3"
                      />
                      <span className="text-green-800 text-sm font-medium">
                        {getFacilityLabel(facilityKey)}
                      </span>
                    </div>
                  ))}
              </div>
              {Object.entries(turf.facilities).filter(
                ([key, value]) => value === true
              ).length === 0 && (
                <p className="text-gray-500">
                  No facilities information available
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Contact and Additional Info */}
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              <Icon name="info" className="mr-2" />
              Information
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Full Address
                </label>
                <p className="text-gray-900">
                  {turf.address?.fullAddress || "Not provided"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Pincode
                </label>
                <p className="text-gray-900">
                  {turf.address?.pincode || "Not provided"}
                </p>
              </div>

              {turf.owner && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Managed By
                  </label>
                  <div className="flex items-center mt-1">
                    <Icon name="person" className="mr-2 text-gray-600" />
                    <div>
                      <p className="text-gray-900">
                        {turf.owner.name || "Not provided"}
                      </p>
                      <p className="text-gray-600 text-sm">
                        {turf.owner.email}
                      </p>
                      {turf.owner.mobile && (
                        <p className="text-gray-600 text-sm">
                          {turf.owner.mobile}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* View User Bookings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              <Icon name="admin_panel_settings" className="mr-2" />
              Management
            </h3>
            <button
              onClick={() => navigate(`/turf-bookings/${id}`)}
              className="w-full bg-orange-500 text-white px-4 py-3 rounded hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="calendar_today" />
              View User Bookings
            </button>
          </div>

          {/* Ratings and Reviews */}
          {turf.ratings && turf.ratings.count > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                <Icon name="star" className="mr-2" />
                Ratings
              </h3>

              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-gray-900">
                  {turf.ratings.average.toFixed(1)}
                </div>
                <div className="flex justify-center items-center mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Icon
                      key={i}
                      name="star"
                      className={`${
                        i < Math.round(turf.ratings.average)
                          ? "text-yellow-500"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-gray-600 text-sm mt-1">
                  Based on {turf.ratings.count} reviews
                </p>
              </div>
            </div>
          )}

          {/* Reviews */}
          {turf.reviews?.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Recent Reviews
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {turf.reviews.slice(0, 5).map((review, index) => (
                  <div
                    key={index}
                    className="border-b border-gray-200 pb-4 last:border-b-0"
                  >
                    <div className="flex items-center mb-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Icon
                            key={i}
                            name="star"
                            className={`text-sm ${
                              i < review.rating
                                ? "text-yellow-500"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600 ml-2">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-gray-700 text-sm">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Time Slots */}
          {turf.availableTimeSlots?.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                <Icon name="schedule" className="mr-2" />
                Available Time Slots
              </h3>
              <div className="space-y-2">
                {turf.availableTimeSlots.map((slot, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-2 bg-gray-50 rounded"
                  >
                    <span className="font-medium capitalize">{slot.day}</span>
                    <span className="text-gray-600">
                      {slot.startTime} - {slot.endTime}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TurfDetails;
