import React from 'react';
// §4.1 — served from public/ instead of imported, so this 1.2 MB PNG is no
// longer compiled into the LandingApp chunk. The browser fetches and caches
// it independently of the JS.
const Player1 = '/images/Player1.png';
import { useNavigate } from "react-router-dom";

const LAboutUs = () => {
  const navigate = useNavigate();

  const handleBackToHome = () => {
    navigate("/");
  };

  return (
    <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-16 my-6 px-4">
      {/* Left Image */}
      <div className="w-full md:w-1/2">
        <img loading="lazy"
          className="w-full rounded-[20px]"
          src={Player1}
          alt="Chalo Khelne"
        />
      </div>

      {/* Right Content */}
      <div className="w-full md:w-1/2 text-left font-roboto space-y-4">
        <h2 className="text-3xl font-semibold mb-5">
          Chalo Khelne: Seamlessly Manage Your Sports Tournaments!
        </h2>
        <p className="text-base font-normal">
          Chalo Khelne is a Sports tournament organizer application that helps you
          organize the sports events, player registrations, scheduling matches effortlessly.
        </p>
        <p className="text-base font-normal">
          At Chalo Khelne, we are passionate about bringing people together through the love
          of sports. Our app is designed to make organizing and participating in sports
          tournaments effortless, fun, and accessible for everyone—from weekend warriors to
          aspiring athletes.
        </p>
        <p className="text-base font-normal">
          We believe sports have the power to build communities, foster teamwork, and ignite
          competitive spirits. That’s why we created a platform that connects players, teams,
          and organizers on one seamless interface. Whether you're an individual looking for
          your next match or a team captain planning a tournament, Chalo Khelne simplifies the
          process with innovative features and user-friendly tools.
        </p>
        <p className="text-base font-normal">
          Let’s play, compete, and win together – Chalo Khelne!
        </p>

        {/* Back Button placed here */}
        <button
          onClick={handleBackToHome}
          className="mt-6 px-5 py-2 bg-orange-500 hover:bg-orange-500 transition text-white rounded-md"
        >
          Back to Home Page
        </button>
      </div>
    </div>
  );
};

export default LAboutUs;
