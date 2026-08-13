import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext"; // Ensure correct path

const ProfilePage = () => {
  const { auth } = useContext(AuthContext); // Get user details from context

  if (!auth) {
    return <p className="text-center text-gray-600 mt-10">No user logged in.</p>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Profile Card */}
      <div className="bg-white text-black p-4 rounded-xl flex items-center gap-4 shadow-lg border h-auto">
        {/* Profile Image */}
        <img loading="lazy"
          src={auth.image || "https://via.placeholder.com/120"} // Default if no image
          alt="Profile"
          className="w-32 h-32 rounded-lg object-cover border-4 border-gray-300"
        />

        {/* Profile Info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold">{auth.name || "Unknown User"}</h2>
          <p className="text-sm mt-1">
            📅 <strong>DOB:</strong> {auth.dob || "N/A"}
          </p>
          <p className="text-sm">
            ⚤ <strong>Sex:</strong> {auth.gender || "N/A"}
          </p>
          <p className="text-sm">
            🏅 <strong>Sports:</strong> {auth.sports || "No Sports Info"}
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-sm">WIN</p>
            <p className="text-2xl font-bold">{auth.win || 0}</p>
          </div>
          <div>
            <p className="text-sm">Lose</p>
            <p className="text-2xl font-bold">{auth.lose || 0}</p>
          </div>
          <div>
            <p className="text-sm">Draw</p>
            <p className="text-2xl font-bold">{auth.draw || 0}</p>
          </div>
          <div>
            <p className="text-sm">Total</p>
            <p className="text-2xl font-bold">
              {(auth.win || 0) + (auth.lose || 0) + (auth.draw || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs - Only Posts & Tagged */}
      <div className="mt-6 flex justify-around border-b pb-2">
        {["Posts", "Tagged"].map((tab, index) => (
          <button key={index} className="text-gray-600 font-medium">
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProfilePage;
