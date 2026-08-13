import React from "react";
import { useNavigate } from "react-router-dom";
const PrivacyImage = '/images/PrivacyPolicy.jpg'; // §4.1 — out of the bundle

const LPrivacyPolicy = () => {
    const navigate = useNavigate();

    const handleBackToHome = () => {
        navigate("/");
    };

    return (
        <>
            {/* Header Image Section */}
            <div className="w-full bg-white shadow-md rounded-md overflow-hidden">
                <div className="relative w-full h-[300px]">
                    <div
                        className="absolute inset-0 bg-cover bg-center opacity-80"
                        style={{ backgroundImage: `url(${PrivacyImage})` }}
                    ></div>

                    <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col justify-center items-center text-white text-center px-4">
                        <h1 className="text-3xl font-semibold">Privacy Policy for Chalo Khelne</h1>
                        <button
                            onClick={handleBackToHome}
                            className="mt-4 px-5 py-2 bg-orange-500 hover:bg-orange-600 transition text-white rounded-md w-auto"
                        >
                            Back to Home Page
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Privacy Policy Content */}
            <div className="max-w-5xl mx-auto my-8 p-6 bg-gray-100 rounded-md shadow-md text-base leading-relaxed font-['Roboto']">
                <p className="mb-4 text-gray-500">Effective Date: 17-04-2025</p>
                <p className="mb-4">
                    At Chalo Khelne, your privacy is our top priority. This Privacy Policy outlines how we collect, use, disclose, and safeguard your information when you use our sports management application. Chalo Khelne is available to users of all ages, including children. Please read this policy carefully to understand our views and practices regarding your personal data.
                </p>

                {/* 1. Information We Collect */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Information We Collect</h2>
                    <ul className="space-y-2">
                        <li><strong>a) Personal Information</strong></li>
                        <ul className="ml-5 list-disc text-sm text-gray-700">
                            <li>Name</li>
                            <li>Email address</li>
                            <li>Phone number</li>
                            <li>Date of birth (required for age verification and child safety)</li>
                            <li>Profile picture (optional)</li>
                            <li>Gender (optional)</li>
                        </ul>
                        <li className="mt-2"><strong>b) Communications Data</strong></li>
                        <ul className="ml-5 list-disc text-sm text-gray-700">
                            <li>Chat messages exchanged between users</li>
                            <li>Group chat messages and member information</li>
                            <li>Social feed posts, comments, and interactions</li>
                        </ul>
                        <li className="mt-2"><strong>c) Media and Files</strong></li>
                        <ul className="ml-5 list-disc text-sm text-gray-700">
                            <li>Photos and images shared in chats or social feed</li>
                            <li>Profile pictures uploaded by users</li>
                            <li>Documents and certificates (for trainer/referee profiles)</li>
                        </ul>
                        <li className="mt-2"><strong>d) Device and Usage Information</strong></li>
                        <ul className="ml-5 list-disc text-sm text-gray-700">
                            <li>Device type, operating system, and app version</li>
                            <li>Push notification tokens (for delivering notifications)</li>
                            <li>Usage patterns and session data</li>
                            <li>Location data (if enabled, for finding nearby venues)</li>
                        </ul>
                        <li className="mt-2"><strong>e) Payment Information</strong></li>
                        <ul className="ml-5 list-disc text-sm text-gray-700">
                            <li>Payment transactions are processed securely through Razorpay. We do not store your credit card, debit card, or bank account details on our servers. Razorpay handles all payment data in accordance with PCI-DSS standards. We only store transaction IDs and booking confirmations.</li>
                        </ul>
                    </ul>
                </section>

                {/* 2. How We Use Your Information */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">2. How We Use Your Information</h2>
                    <ul className="list-disc ml-5 text-gray-700 space-y-2">
                        <li>To provide sports management services (venue booking, tournaments, player profiles).</li>
                        <li>To enable social features including chat, messaging, and social feed between users.</li>
                        <li>To verify user age and enforce appropriate safety measures.</li>
                        <li>To enforce parental controls for minor users.</li>
                        <li>To send push notifications about bookings, matches, and updates.</li>
                        <li>To process payments for venue bookings and services.</li>
                        <li>To display user profiles within the app community.</li>
                        <li>To improve app performance and user experience.</li>
                        <li>To ensure a safe and secure environment for all users.</li>
                    </ul>
                </section>

                {/* 3. Camera and Media Permissions */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">3. Camera and Media Permissions</h2>
                    <p className="mb-2">Our app requests access to your device camera and photo library for the following purposes only:</p>
                    <ul className="list-disc ml-5 text-gray-700 space-y-2">
                        <li>Uploading a profile picture.</li>
                        <li>Sharing photos in chat conversations.</li>
                        <li>Posting images to the social feed.</li>
                        <li>Uploading certificates or documents for trainer/referee verification.</li>
                    </ul>
                    <p className="mt-2">
                        Camera and media access is entirely optional. You can use the app without granting these permissions, though some features (like photo sharing) will be unavailable. We never access your camera or photo library in the background.
                    </p>
                </section>

                {/* 4. Push Notifications */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">4. Push Notifications</h2>
                    <p className="mb-2">We use push notifications to inform you about:</p>
                    <ul className="list-disc ml-5 text-gray-700 space-y-2">
                        <li>Match schedules and tournament updates.</li>
                        <li>Booking confirmations and reminders.</li>
                        <li>New chat messages.</li>
                        <li>Important announcements.</li>
                    </ul>
                    <p className="mt-2">
                        You can disable push notifications at any time through your device settings. Disabling notifications does not affect your ability to use the app.
                    </p>
                </section>

                {/* 5. Child Safety */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">5. Child Safety</h2>
                    <p className="mb-4">
                        Chalo Khelne is available to users of all ages, including children. We take the safety of young users very seriously and have implemented the following measures:
                    </p>

                    <h3 className="text-base font-semibold text-gray-800 mb-2">Age Verification</h3>
                    <ul className="list-disc ml-5 text-gray-700 space-y-2 mb-4">
                        <li>Date of birth is collected during registration to determine the user's age group.</li>
                        <li>Users under 13 years of age require parental consent to create an account.</li>
                        <li>Users aged 13–17 are automatically classified as minors with default safety restrictions enabled.</li>
                        <li>Users aged 18 and above have full access to all features.</li>
                    </ul>

                    <h3 className="text-base font-semibold text-gray-800 mb-2">Automatic Restrictions for Minors</h3>
                    <ul className="list-disc ml-5 text-gray-700 space-y-2 mb-4">
                        <li>Users under 18 have parental controls enabled by default.</li>
                        <li>Social features (chat, social feed, media sharing) can be restricted or disabled by a parent or guardian.</li>
                        <li>A safety reminder is shown before any social interaction.</li>
                        <li>We do not allow unsupervised contact between unknown adults and child users when parental controls are active.</li>
                    </ul>

                    <h3 className="text-base font-semibold text-gray-800 mb-2">Parental Controls</h3>
                    <ul className="list-disc ml-5 text-gray-700 space-y-2 mb-4">
                        <li>Parents or guardians can set a 4-digit PIN to control access to social features.</li>
                        <li>Parental controls allow toggling on/off:
                            <ul className="list-disc ml-5 mt-1">
                                <li>Chat and messaging</li>
                                <li>Social feed access</li>
                                <li>Media and photo sharing</li>
                            </ul>
                        </li>
                        <li>Parents can modify or disable these controls at any time.</li>
                        <li>Parental control settings are synced across devices.</li>
                    </ul>

                    <h3 className="text-base font-semibold text-gray-800 mb-2">Safety Reminders</h3>
                    <ul className="list-disc ml-5 text-gray-700 space-y-2">
                        <li>A safety reminder is displayed before users access chat or social features for the first time each session.</li>
                        <li>Users are reminded not to share personal information online.</li>
                        <li>Users are informed about the real-world risks of online interactions.</li>
                    </ul>
                </section>

                {/* 6. Social Features Safety */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">6. Social Features Safety</h2>
                    <p className="mb-2">Our app includes social features such as chat messaging, group chats, and a social feed. We have implemented the following safeguards:</p>
                    <ul className="list-disc ml-5 text-gray-700 space-y-2">
                        <li>In-app safety reminders are shown before users interact with social features.</li>
                        <li>Parental PIN protection is available to restrict social feature access.</li>
                        <li>No personal information (phone number, address) is required or displayed in chat.</li>
                        <li>Group chat management allows owners to control membership.</li>
                        <li>Users can report inappropriate content or behavior.</li>
                        <li>Parents can fully disable all social features for their child's account.</li>
                    </ul>
                </section>

                {/* 7. Data Sharing and Disclosure */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">7. Data Sharing and Disclosure</h2>
                    <p className="mb-2">We do <strong>NOT</strong> sell, trade, or rent your personal information to third parties. We do <strong>NOT</strong> share child user data with any third parties for marketing or advertising purposes.</p>
                    <p className="mb-2">Information may be shared only in the following circumstances:</p>
                    <ul className="list-disc ml-5 text-gray-700 space-y-2">
                        <li>With Razorpay for processing payments securely.</li>
                        <li>With push notification services (Expo) to deliver app notifications.</li>
                        <li>When required by law or to comply with legal processes.</li>
                        <li>To protect the safety of our users, including children.</li>
                        <li>With your explicit consent.</li>
                    </ul>
                </section>

                {/* 8. Data Security */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">8. Data Security</h2>
                    <p className="mb-2">
                        We take reasonable and appropriate security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. These measures include:
                    </p>
                    <ul className="list-disc ml-5 text-gray-700 space-y-2">
                        <li>Encrypted password storage using bcrypt hashing.</li>
                        <li>Encrypted parental control PINs.</li>
                        <li>Secure HTTPS connections for all data transfers.</li>
                        <li>Token-based authentication (JWT).</li>
                    </ul>
                    <p className="mt-2">
                        However, no method of electronic transmission or storage is 100% secure. We cannot guarantee absolute security but are committed to protecting your data.
                    </p>
                </section>

                {/* 9. Data Retention */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">9. Data Retention</h2>
                    <ul className="list-disc ml-5 text-gray-700 space-y-2">
                        <li>Account information is retained as long as your account is active.</li>
                        <li>Chat messages are retained while the conversation or group exists.</li>
                        <li>Usage and analytics data is retained for up to 90 days.</li>
                        <li>If you request account deletion, your personal data will be deleted or anonymized within 30 days, unless retention is required by law.</li>
                    </ul>
                </section>

                {/* 10. Parental Rights */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">10. Parental Rights</h2>
                    <p className="mb-2">Parents and guardians of minor users have the following rights:</p>
                    <ul className="list-disc ml-5 text-gray-700 space-y-2">
                        <li>Request access to their child's personal data.</li>
                        <li>Request deletion of their child's account and all associated data.</li>
                        <li>Disable all social features (chat, social feed, media sharing) at any time using parental controls.</li>
                        <li>Set and modify a parental PIN to control feature access.</li>
                        <li>Withdraw consent for data processing.</li>
                    </ul>
                    <p className="mt-2">
                        To exercise any of these rights, please contact us at <a href="mailto:support@chalokhelne.com" className="text-orange-500 hover:underline">support@chalokhelne.com</a>. We will respond within 48 hours.
                    </p>
                </section>

                {/* 11. Your Rights */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">11. Your Rights</h2>
                    <p className="mb-2">All users have the right to:</p>
                    <ul className="list-disc ml-5 text-gray-700 space-y-2">
                        <li>Access and review personal information we hold.</li>
                        <li>Update or correct your personal data.</li>
                        <li>Request deletion of your account and data.</li>
                        <li>Withdraw consent for data processing.</li>
                        <li>Opt-out of push notifications.</li>
                        <li>Opt-out of marketing communications.</li>
                    </ul>
                    <p className="mt-2">
                        To exercise these rights, contact us at <a href="mailto:support@chalokhelne.com" className="text-orange-500 hover:underline">support@chalokhelne.com</a>.
                    </p>
                </section>

                {/* 12. Third-Party Links */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">12. Third-Party Links</h2>
                    <p>
                        Chalo Khelne may contain links to third-party websites or services (including payment processors). We are not responsible for their privacy practices and encourage you to review their privacy policies.
                    </p>
                </section>

                {/* 13. Changes to This Privacy Policy */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">13. Changes to This Privacy Policy</h2>
                    <p>
                        We may update this Privacy Policy from time to time. Changes will be reflected by updating the "Effective Date" at the top of this page. We encourage you to review this policy periodically. Continued use of the app after updates constitutes acceptance of the revised terms.
                    </p>
                </section>

                {/* 14. Contact Us */}
                <section className="mb-4">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">14. Contact Us</h2>
                    <p className="mb-2">If you have any questions, concerns, or requests regarding this Privacy Policy or the safety of your child's account, please contact us:</p>
                    <ul className="list-disc ml-5 text-gray-700 space-y-2">
                        <li>Email: <a href="mailto:sales@chalokhelne.com" className="text-orange-500 hover:underline">sales@chalokhelne.com</a></li>
                        <li>Support: <a href="mailto:support@chalokhelne.com" className="text-orange-500 hover:underline">support@chalokhelne.com</a></li>
                        <li>Phone: 9272090926</li>
                        <li>Response time: Within 48 hours</li>
                    </ul>
                </section>
            </div>
        </>
    );
};

export default LPrivacyPolicy;
