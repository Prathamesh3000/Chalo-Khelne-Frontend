import React from 'react'
import { useNavigate } from "react-router-dom";
const PrivacyImage = '/images/PrivacyPolicy.jpg'; // §4.1 — out of the bundle

const LFAQs = () => {
  const navigate = useNavigate();

  const handleBackToHome = () => {
    navigate("/");
  };
  return (
    <>
      <div className="w-full bg-white shadow-md rounded-md overflow-hidden">
        <div className="relative w-full h-[300px]">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-80"
            style={{ backgroundImage: `url(${PrivacyImage})` }}
          ></div>

          <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col justify-center items-center text-white text-center px-4">
            <h1 className="text-3xl font-semibold">       Frequently Asked Questions</h1>
            <button
              onClick={handleBackToHome}
              className="mt-4 px-5 py-2 bg-orange-500 hover:bg-orange-500 transition text-white rounded-md w-auto"
            >
              Back to Home Page
            </button>
          </div>
        </div>
      </div>
      <div className='max-w-5xl mx-auto my-8 p-6 bg-gray-100 rounded-md shadow-md text-base leading-relaxed font-[`Roboto`]'>
        <div className="bg-white rounded-lg p-6">

          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-[#333] mb-2">
                "What is Chalo Khelne?",

              </h3>
              <p className="text-[#666]">
                Chalo Khelne is a platform designed to simplify the organization and management of sports tournaments for teams, clubs, and individuals.,
              </p>
            </div>
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-[#333] mb-2">
                Who can use Chalo Khelne?

              </h3>
              <p className="text-[#666]">
                Anyone who wants to organize or participate in sports tournaments, including sports enthusiasts, clubs, schools, and organizations.              </p>
            </div>
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-[#333] mb-2">
                Who can use Chalo Khelne?

              </h3>
              <p className="text-[#666]">
                Anyone who wants to organize or participate in sports tournaments, including sports enthusiasts, clubs, schools, and organizations.              </p>
            </div>
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-[#333] mb-2">
                Can I customize the tournament format?

              </h3>
              <p className="text-[#666]">
                Yes, you can choose from various formats such as knockout, round-robin, or league-based tournaments.",
              </p>        </div>
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-[#333] mb-2">
                Who can use Chalo Khelne?

              </h3>
              <p className="text-[#666]">
                Anyone who wants to organize or participate in sports tournaments, including sports enthusiasts, clubs, schools, and organizations.              </p>
            </div>
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-[#333] mb-2">
                Is there a fee to use Chalo Khelne?
              </h3>
              <p className="text-[#666]">
                No, Chalo Khelne is completely free to use. You can access all the essential features without any charges.           </p>
            </div>
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-[#333] mb-2">
                Can I manage team registrations through the app?

              </h3>
              <p className="text-[#666]">
                Yes, you can invite teams and players to register directly through Chalo Khelne.</p>
            </div>
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-[#333] mb-2">
                What if I face issues while using the platform?
              </h3>
              <p className="text-[#666]">
                Reach out to our support team via the app or email us at sales@chalokhelne.com. </p>
            </div>
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-[#333] mb-2">
                Can I track live scores during the tournament?              </h3>
              <p className="text-[#666]">
                Yes, live score tracking is available to keep participants and spectators updated.</p>
            </div>
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-[#333] mb-2">
                Does Chalo Khelne support offline tournaments?              </h3>
              <p className="text-[#666]">
                Yes, you can manage offline tournaments and update scores manually.</p>            </div>
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-[#333] mb-2">
                Is my data secure with Chalo Khelne?
              </h3>
              <p className="text-[#666]">
                Yes, we prioritize your privacy and ensure all data is stored securely following industry standards.  </p>
            </div>
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-[#333] mb-2">
                How do I book a training session?
              </h3>
              <p className="text-[#666]">
                To book a session with any of our trainers, you'll need to
                create an account or sign in. Once logged in, you can browse
                trainer profiles and book available time slots directly.
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-[#333] mb-2">
                What qualifications do your trainers have?
              </h3>
              <p className="text-[#666]">
                All trainers on our platform have verified certifications in
                their respective sports. Many are former professional athletes
                or have extensive coaching experience.
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-[#333] mb-2">
                Can I cancel or reschedule a session?
              </h3>
              <p className="text-[#666]">
                Yes, you can reschedule or cancel a session up to 24 hours
                before the scheduled time without any penalty. Changes made with
                less notice may incur a fee.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#333] mb-2">
                Where do training sessions take place?
              </h3>
              <p className="text-[#666]">
                Training locations vary by trainer. Some trainers work at
                specific facilities, while others can travel to your preferred
                location. Each trainer's profile indicates their available
                training locations.
              </p>
            </div>
          </div>
        </div>
      </div >
    </>

  )
}

export default LFAQs