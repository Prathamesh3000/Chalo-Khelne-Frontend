import React, { useState, useEffect } from "react";
import {
  Star, Calendar, MapPin, Award, ChevronRight, X, MessageSquare,
  UserCheck, Medal, Shield, LogIn, User, Users, Clock, ArrowRight, Dumbbell,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Sign In Modal ───────────────────────────────────────────
const SignInModal = ({ onClose, message }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
    <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
      className="bg-white rounded-2xl max-w-sm w-full p-8 relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="h-1.5 bg-gradient-to-r from-orange-500 to-amber-400 absolute top-0 left-0 right-0 rounded-t-2xl" />
      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-gray-100 transition w-auto">
        <X className="w-4 h-4 text-gray-400" />
      </button>
      <div className="text-center mt-4">
        <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <LogIn className="w-6 h-6 text-orange-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Sign in to continue</h2>
        <p className="text-sm text-gray-500 mt-2">{message || "Sign in to access all trainer features."}</p>
      </div>
      <div className="mt-6 space-y-3">
        <a href="/login" className="block w-full bg-orange-500 hover:bg-orange-600 text-white py-3.5 rounded-xl font-bold text-sm transition-all text-center shadow-sm shadow-orange-200">
          Sign In
        </a>
        <button onClick={onClose} className="w-full bg-gray-50 hover:bg-gray-100 text-gray-500 py-3 rounded-xl font-semibold text-sm transition-all">
          Continue as Guest
        </button>
      </div>
    </motion.div>
  </motion.div>
);

// ─── Trainer Card ────────────────────────────────────────────
const TrainerCard = ({ trainer, onClick }) => {
  const getExpColor = (y) => y >= 10 ? "bg-emerald-50 text-emerald-700" : y >= 5 ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700";

  return (
    <motion.div
      className="rounded-2xl overflow-hidden border border-gray-200 bg-white cursor-pointer hover:border-orange-300 hover:shadow-lg transition-all group"
      onClick={() => onClick(trainer)}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.2 }}
    >
      {/* Avatar header */}
      <div className="h-40 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-md overflow-hidden">
          <img
            src={`https://ui-avatars.com/api/?name=${trainer.firstName}+${trainer.lastName}&background=FB923C&color=fff&bold=true`}
            alt={`${trainer.firstName} ${trainer.lastName}`}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="p-5 text-center">
        <h3 className="text-base font-bold text-gray-900 group-hover:text-orange-600 transition-colors mb-1">
          {trainer.firstName} {trainer.lastName}
        </h3>
        <p className="text-xs text-gray-500 mb-3">{trainer.sport || "Multi-Sport"} Trainer</p>

        <div className="flex justify-center mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getExpColor(trainer.experience)}`}>
            {trainer.experience} years exp
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4].map((n) => <Star key={n} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}
            <Star className="w-3.5 h-3.5 text-gray-200" />
          </div>
          <span className="text-xs font-semibold text-orange-500 flex items-center gap-1 group-hover:gap-2 transition-all">
            View <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Trainer Detail Modal ────────────────────────────────────
const TrainerDetailModal = ({ trainer, onClose, onSignInPrompt }) => {
  const [activeTab, setActiveTab] = useState("about");
  if (!trainer) return null;

  const getExpLevel = (y) => y >= 10 ? "Expert" : y >= 5 ? "Advanced" : y >= 2 ? "Intermediate" : "Beginner";
  const tabs = ["about", "services", "reviews"];
  const tabLabels = { about: "About", services: "Services", reviews: "Reviews" };

  const services = [
    { icon: User, title: "Private Sessions", desc: "One-on-one personalized training", price: "₹1,500/session" },
    { icon: Users, title: "Group Training", desc: "Small groups (2-5 people)", price: "₹900/person" },
    { icon: Calendar, title: "Monthly Package", desc: "8 sessions per month", price: "₹10,000 (save 15%)" },
    { icon: Clock, title: "Trial Session", desc: "30-minute consultation", price: "₹500" },
  ];

  const reviews = [
    { name: "Sanjay K.", initial: "S", rating: 5, time: "2 weeks ago", text: "Great trainer who really knows how to motivate. I've been training with them for 3 months and have seen significant improvement..." },
    { name: "Priya T.", initial: "P", rating: 4, time: "1 month ago", text: "Excellent coaching style that balances pushing you to improve while keeping sessions enjoyable. Very knowledgeable about proper technique..." },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl overflow-hidden w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="relative bg-gradient-to-r from-orange-500 to-orange-600 p-6 md:p-8 text-white">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl bg-white/20 hover:bg-white/30 transition w-auto">
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex flex-col md:flex-row gap-5 items-center md:items-start">
            <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/30 overflow-hidden flex-shrink-0">
              <img
                src={`https://ui-avatars.com/api/?name=${trainer.firstName}+${trainer.lastName}&background=FB923C&color=fff&bold=true`}
                alt={`${trainer.firstName}`}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">{trainer.firstName} {trainer.lastName}</h2>
              <p className="text-white/80 mb-2">{trainer.sport || "Multi-Sport"} Trainer</p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                <span className="flex items-center gap-1.5"><Award className="w-4 h-4" /> {trainer.experience} yrs • {getExpLevel(trainer.experience)}</span>
                {trainer.address && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {trainer.address}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-100 px-6">
          <div className="flex gap-6">
            {tabs.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-semibold border-b-2 transition-all w-auto ${
                  activeTab === tab ? "border-orange-500 text-orange-500" : "border-transparent text-gray-400 hover:text-gray-600"
                }`}>
                {tabLabels[tab]}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* About Tab */}
          {activeTab === "about" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">About</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {trainer.about || `${trainer.firstName} is a dedicated ${trainer.sport || "sports"} trainer with ${trainer.experience} years of experience. They are passionate about helping athletes improve through personalized training programs.`}
                </p>
              </div>
              {trainer.certificates?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Certifications</h3>
                  <div className="space-y-2">
                    {trainer.certificates.map((cert, i) => (
                      <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                        <h4 className="text-sm font-bold text-gray-900">{cert.name}</h4>
                        <p className="text-xs text-gray-500">Issued by {cert.issuedBy}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(cert.issueDate).toLocaleDateString("en-IN")}
                          {cert.expiryDate && ` • Expires: ${new Date(cert.expiryDate).toLocaleDateString("en-IN")}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Services Tab */}
          {activeTab === "services" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((s, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 flex-shrink-0">
                        <s.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-0.5">{s.title}</h4>
                        <p className="text-xs text-gray-500 mb-1.5">{s.desc}</p>
                        <span className="text-xs font-bold text-orange-600">{s.price}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                <h4 className="text-sm font-bold text-gray-900 mb-1">Ready to start training?</h4>
                <p className="text-xs text-gray-500 mb-3">Book a session with {trainer.firstName} to begin your journey.</p>
                <button onClick={() => onSignInPrompt("Sign in to book training sessions.")}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 w-auto shadow-sm shadow-orange-200">
                  View Available Slots <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === "reviews" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Reviews</h3>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-bold text-gray-900">4.8</span>
                  <span className="text-xs text-gray-400">(24 reviews)</span>
                </div>
              </div>

              <div className="space-y-4">
                {reviews.map((r, i) => (
                  <div key={i} className="border-b border-gray-100 pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">
                          {r.initial}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star key={n} className={`w-3 h-3 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400">{r.time}</span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{r.text}</p>
                    <button onClick={() => onSignInPrompt("Sign in to read full reviews.")}
                      className="text-xs font-semibold text-orange-500 hover:text-orange-600 mt-1 w-auto">
                      Read more
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 text-center">
                <p className="text-sm font-semibold text-gray-700 mb-1">Want to see all reviews?</p>
                <p className="text-xs text-gray-400 mb-3">Sign in to view detailed ratings and write your own review</p>
                <button onClick={() => onSignInPrompt("Sign in to view all reviews.")}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 mx-auto w-auto">
                  <LogIn className="w-4 h-4" /> Sign In
                </button>
              </div>
            </div>
          )}

          {/* Contact CTA */}
          <div className="mt-6 bg-gray-50 border border-gray-100 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Get in touch</h3>
            <p className="text-xs text-gray-500 mb-4">Interested in training with {trainer.firstName}? Sign in to book or message.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => onSignInPrompt("Sign in to book training sessions.")}
                className="flex-1 px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
                <Calendar className="w-4 h-4" /> Book Session
              </button>
              <button onClick={() => onSignInPrompt("Sign in to message trainers.")}
                className="flex-1 px-5 py-3 border border-orange-300 text-orange-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-50 transition-all">
                <MessageSquare className="w-4 h-4" /> Message
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── All Trainers Modal ──────────────────────────────────────
const AllTrainersModal = ({ trainers, loading, error, onClose, onSelectTrainer }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto" onClick={onClose}>
    <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto mx-auto my-8 relative shadow-2xl"
      onClick={(e) => e.stopPropagation()}>
      <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10">
        <h2 className="text-lg font-bold text-gray-900">All Trainers</h2>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition w-auto">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-500 text-center py-8">{error}</p>
        ) : trainers.length === 0 ? (
          <div className="text-center py-12">
            <Dumbbell className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No trainers available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trainers.map((t) => (
              <TrainerCard key={t._id} trainer={t} onClick={(tr) => { onSelectTrainer(tr); onClose(); }} />
            ))}
          </div>
        )}
      </div>
    </div>
  </motion.div>
);

// ─── Main Page ───────────────────────────────────────────────
function LTrainer() {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [showAllTrainers, setShowAllTrainers] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signInMessage, setSignInMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await fetch("/api/trainer/trainers", {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error("Failed to fetch trainers");
        setTrainers(await res.json());
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const openDetail = (t) => { setSelectedTrainer(t); document.body.style.overflow = "hidden"; };
  const closeDetail = () => { setSelectedTrainer(null); document.body.style.overflow = "auto"; };
  const handleSignIn = (msg) => { setSignInMessage(msg || "Sign in to access all features."); setShowSignInModal(true); };

  if (loading && trainers.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Hero */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 pt-28">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Expert Sports Trainers</h1>
            <p className="text-white/80 text-sm leading-relaxed mb-6">
              Connect with certified professionals who can help you achieve your goals, improve your technique, and take your performance to the next level.
            </p>
            <div className="flex flex-wrap gap-4 mb-6 text-sm text-white/70">
              <span className="flex items-center gap-2"><UserCheck className="w-4 h-4" /> Certified</span>
              <span className="flex items-center gap-2"><Medal className="w-4 h-4" /> Experienced</span>
              <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> Verified</span>
            </div>
            <button onClick={() => handleSignIn("Sign in to book training sessions.")}
              className="px-6 py-3 bg-white text-orange-600 font-bold text-sm rounded-xl hover:bg-orange-50 transition-all shadow-sm w-auto">
              Sign In to Book
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* Trainer Grid */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Available Trainers</h2>
            {trainers.length > 3 && (
              <button onClick={() => setShowAllTrainers(true)}
                className="text-sm font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1 w-auto">
                View All <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

          {trainers.length === 0 && !loading ? (
            <div className="text-center py-12">
              <Dumbbell className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No trainers available at the moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {trainers.slice(0, 3).map((t) => (
                <TrainerCard key={t._id} trainer={t} onClick={openDetail} />
              ))}
            </div>
          )}
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: "1", title: "Choose a Trainer", desc: "Browse qualified trainers and find the perfect match for your sport and skill level." },
              { num: "2", title: "Book a Session", desc: "Select a date and time that works for you and book in just a few clicks." },
              { num: "3", title: "Start Training", desc: "Meet your trainer and begin your journey to improved performance." },
            ].map((step) => (
              <div key={step.num} className="text-center">
                <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {step.num}
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{step.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "How do I book a training session?", a: "Create an account or sign in, then browse trainer profiles and book available time slots directly." },
              { q: "What qualifications do your trainers have?", a: "All trainers have verified certifications. Many are former professional athletes or have extensive coaching experience." },
              { q: "Can I cancel or reschedule?", a: "Yes, up to 24 hours before the session without penalty. Changes with less notice may incur a fee." },
              { q: "Where do sessions take place?", a: "Locations vary by trainer — some work at specific facilities, others can travel to your preferred location." },
            ].map((faq, i) => (
              <div key={i} className="border-b border-gray-100 pb-4 last:border-0">
                <h3 className="text-sm font-bold text-gray-900 mb-1">{faq.q}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAllTrainers && (
          <AllTrainersModal trainers={trainers} loading={loading} error={error}
            onClose={() => setShowAllTrainers(false)} onSelectTrainer={openDetail} />
        )}
        {selectedTrainer && (
          <TrainerDetailModal trainer={selectedTrainer} onClose={closeDetail} onSignInPrompt={handleSignIn} />
        )}
        {showSignInModal && (
          <SignInModal onClose={() => setShowSignInModal(false)} message={signInMessage} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default LTrainer;
