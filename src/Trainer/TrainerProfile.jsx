import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const TrainerProfile = () => {
  const { auth } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("personal");

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    gender: "",
    sport: "",
    experience: "",
    address: "",
    emergencyContact: "",
    emergencyContactName: "",
    about: "",
  });

  // Certificate state
  const [newCertificate, setNewCertificate] = useState({
    name: "",
    issuedBy: "",
    issueDate: "",
    expiryDate: "",
    certificateId: "",
  });

  // Fetch trainer profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/trainer/profile/${auth._id}`
        );
        setProfile(response.data);

        // Initialize form with profile data
        if (response.data) {
          setFormData({
            firstName: response.data.firstName || "",
            lastName: response.data.lastName || "",
            dob: response.data.dob
              ? new Date(response.data.dob).toISOString().split("T")[0]
              : "",
            gender: response.data.gender || "",
            sport: response.data.sport || "",
            experience: response.data.experience || "",
            address: response.data.address || "",
            emergencyContact: response.data.emergencyContact || "",
            emergencyContactName: response.data.emergencyContactName || "",
            about: response.data.about || "",
          });
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load profile data");
        setLoading(false);
      }
    };

    if (auth && auth._id) {
      fetchProfile();
    }
  }, [auth]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleCertificateChange = (e) => {
    const { name, value } = e.target;
    setNewCertificate({
      ...newCertificate,
      [name]: value,
    });
  };

  const handleProfileUpdate = async () => {
    try {
      const response = await axios.put(
        `/api/trainer/profile/${auth._id}`,
        formData
      );
      setProfile(response.data);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const handleAddCertificate = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `/api/trainer/certificate/${auth._id}`,
        newCertificate
      );
      setProfile({
        ...profile,
        certificates: response.data,
      });
      setNewCertificate({
        name: "",
        issuedBy: "",
        issueDate: "",
        expiryDate: "",
        certificateId: "",
      });
      toast.success("Certificate added successfully");
    } catch (error) {
      console.error("Error adding certificate:", error);
      toast.error("Failed to add certificate");
    }
  };

  const handleRemoveCertificate = async (certId) => {
    try {
      const response = await axios.delete(
        `/api/trainer/certificate/${auth._id}/${certId}`
      );
      setProfile({
        ...profile,
        certificates: response.data,
      });
      toast.success("Certificate removed successfully");
    } catch (error) {
      console.error("Error removing certificate:", error);
      toast.error("Failed to remove certificate");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="flex items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold mr-6">
            {profile?.firstName?.[0] || ""}
            {profile?.lastName?.[0] || ""}
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {profile?.firstName || ""} {profile?.lastName || ""}
            </h1>
            <p className="text-gray-600">
              {profile?.sport ? `${profile.sport} Trainer` : "Trainer"}
            </p>
            <p className="text-gray-600">{auth.email}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b mb-6">
          <div className="flex space-x-8">
            <button
              className={`py-2 px-1 ${
                activeTab === "personal"
                  ? "text-blue-600 border-b-2 border-blue-600 font-medium bg-transparent hover:bg-transparent"
                  : "text-gray-500 bg-transparent hover:bg-gray-200"
              }`}
              onClick={() => setActiveTab("personal")}
            >
              Personal Information
            </button>
            <button
              className={`py-2 px-1 ${
                activeTab === "certificates"
                  ? "text-blue-600 border-b-2 border-blue-600 font-medium bg-transparent hover:bg-transparent"
                  : "text-gray-500 bg-transparent hover:bg-gray-200"
              }`}
              onClick={() => setActiveTab("certificates")}
            >
              Certificates
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "personal" && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Sport</label>
                <input
                  type="text"
                  name="sport"
                  value={formData.sport}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">
                  Experience (Years)
                </label>
                <input
                  type="number"
                  name="experience"
                  value={formData.experience}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-700 mb-1">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="2"
                  className="w-full p-2 border rounded"
                ></textarea>
              </div>
              <div>
                <label className="block text-gray-700 mb-1">
                  Emergency Contact
                </label>
                <input
                  type="tel"
                  name="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-700 mb-1">About Me</label>
                <textarea
                  name="about"
                  value={formData.about}
                  onChange={handleInputChange}
                  rows="4"
                  className="w-full p-2 border rounded"
                  placeholder="Tell clients about your training philosophy and experience..."
                ></textarea>
              </div>
            </div>
            <button
              onClick={handleProfileUpdate}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-auto"
            >
              Save Changes
            </button>
          </div>
        )}

        {activeTab === "certificates" && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Certificates</h2>

            {/* Display existing certificates */}
            {profile?.certificates && profile.certificates.length > 0 ? (
              <div className="mb-6 space-y-3">
                {profile.certificates.map((cert) => (
                  <div
                    key={cert._id}
                    className="border p-3 rounded flex justify-between"
                  >
                    <div>
                      <h3 className="font-medium">{cert.name}</h3>
                      <p className="text-sm text-gray-600">
                        Issued by: {cert.issuedBy}
                      </p>
                      <p className="text-sm text-gray-600">
                        Date: {new Date(cert.issueDate).toLocaleDateString()}
                        {cert.expiryDate &&
                          ` - Expires: ${new Date(
                            cert.expiryDate
                          ).toLocaleDateString()}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveCertificate(cert._id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 mb-6">No certificates added yet.</p>
            )}

            {/* Add new certificate form */}
            <div className="bg-gray-50 p-4 rounded border">
              <h3 className="font-medium mb-3">Add New Certificate</h3>
              <form
                onSubmit={handleAddCertificate}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div>
                  <label className="block text-gray-700 mb-1">
                    Certificate Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={newCertificate.name}
                    onChange={handleCertificateChange}
                    required
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">
                    Issuing Organization
                  </label>
                  <input
                    type="text"
                    name="issuedBy"
                    value={newCertificate.issuedBy}
                    onChange={handleCertificateChange}
                    required
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    name="issueDate"
                    value={newCertificate.issueDate}
                    onChange={handleCertificateChange}
                    required
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">
                    Expiry Date (if applicable)
                  </label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={newCertificate.expiryDate}
                    onChange={handleCertificateChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">
                    Certificate ID (optional)
                  </label>
                  <input
                    type="text"
                    name="certificateId"
                    value={newCertificate.certificateId}
                    onChange={handleCertificateChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Add Certificate
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
};

export default TrainerProfile;
