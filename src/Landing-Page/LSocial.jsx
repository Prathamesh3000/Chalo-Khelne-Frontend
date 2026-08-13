import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Heart,
  MessageCircle,
  Share2,
  Image as ImageIcon,
  Video,
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  Lock,
  X,
  Zap,
  Plus,
  Target,
  TrendingUp,
  Shield,
  Search,
  LogIn,
  UserPlus
} from "lucide-react";
const PostImg = '/images/post1.jpg'; // §4.1 — out of the bundle

const LSocial = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTab, setActiveTab] = useState("trending");
  const [showRestricted, setShowRestricted] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showMediaModal, setShowMediaModal] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 800));

        const mockPosts = [
          {
            id: 1,
            user: { name: "Karan Mehta", image: "https://ui-avatars.com/api/?name=KM&background=004E93&color=fff", role: "Pro Athlete" },
            tournament: "National Ping Pong Masters",
            date: "12 Oct 2024",
            content: "Clinched the finals today! A rollercoaster of a match with five sets, but those side spins sealed the deal. Grateful for the crowd's energy!",
            images: [PostImg],
            likes: 1242,
            comments: 145,
            tags: ["tabletennis", "finals", "elite"],
          },
          {
            id: 2,
            user: { name: "Sneha Reddy", image: "https://ui-avatars.com/api/?name=SR&background=FF6A00&color=fff", role: "Tactical Coach" },
            tournament: "Hyderabad Open 2024",
            date: "09 Oct 2024",
            content: "Analyzing footwork patterns from the latest session. Precision is everything in this game. Multi-ball drills are paying off.",
            videoThumbnail: "https://images.unsplash.com/photo-1534158914592-062992fbe900?w=800&q=80",
            likes: 897,
            comments: 201,
            tags: ["training", "strategy", "intel"],
          },
          {
            id: 3,
            user: { name: "Arjun Sethi", image: "https://ui-avatars.com/api/?name=AS&background=1B89FF&color=fff", role: "Gear Enthusiast" },
            tournament: "Delhi Invitational League",
            date: "05 Oct 2024",
            content: "Field testing the new customized carbon blade. The response time is incredible—serves are significantly more aggressive.",
            images: [PostImg],
            likes: 510,
            comments: 28,
            tags: ["gear", "tech", "performance"],
          }
        ];

        setPosts(mockPosts);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const handleAction = () => setShowLoginModal(true);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Intel Matrix */}
      <div className="bg-black py-32 px-8 md:px-24 relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent" />
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.2),transparent_70%)]" />
        </div>

        <div className="max-w-[1400px] mx-auto space-y-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <span className="w-12 h-[1px] bg-orange-500" />
            <span className="text-orange-500 text-xs font-black uppercase tracking-[0.4em] italic">Network Grid</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-7xl md:text-9xl font-black italic uppercase tracking-tighter text-white leading-[0.85]"
          >
            Tactical <br /> <span className="text-transparent stroke-white stroke-1">Community</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 font-medium italic text-xl max-w-xl leading-relaxed"
          >
            Access the sports intel hub. Connect with elite players, share combat techniques, and monitor the global leaderboard.
          </motion.p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 md:px-24 py-20">
        <div className="flex flex-col lg:flex-row gap-20">
          {/* Main Feed */}
          <div className="flex-1 space-y-12">
            <div className="flex flex-wrap items-center justify-between gap-8">
              <div className="flex bg-gray-50 p-2 rounded-[2rem] border border-black/5">
                {["trending", "latest"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic transition-all ${activeTab === tab ? 'bg-gray-900 text-white shadow-xl' : 'text-gray-400 hover:text-gray-500'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <button
                onClick={handleAction}
                className="px-10 py-5 bg-orange-500 text-white font-black italic uppercase tracking-widest text-sm rounded-2xl shadow-xl shadow-orange-500/20 flex items-center gap-3 hover:bg-orange-600 transition-all"
              >
                Draft Intel <Plus className="w-5 h-5" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-12">
                {[1, 2].map(i => <div key={i} className="h-96 rounded-[3rem] bg-gray-50 animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-12">
                {posts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="group bg-white rounded-[3rem] overflow-hidden border border-black/5 shadow-2xl shadow-black/5 hover:border-orange-500/20 transition-all"
                  >
                    <div className="p-8 pb-0 flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden border-2 border-gray-100 shadow-inner">
                          <img loading="lazy" src={post.user.image} alt={post.user.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black italic uppercase tracking-tight text-gray-900 leading-none mb-1">{post.user.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{post.user.role}</span>
                            <span className="text-gray-300">•</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">{post.date}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={handleAction} className="p-4 rounded-2xl bg-gray-50 text-gray-400 hover:text-gray-900 transition-all"><ChevronRight className="w-6 h-6" /></button>
                    </div>

                    <div className="p-8 space-y-6">
                      <p className="text-gray-600 font-medium italic text-lg leading-relaxed">{post.content}</p>

                      <div className="flex flex-wrap gap-3">
                        {post.tags.map(tag => (
                          <span key={tag} className="px-4 py-2 bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest italic rounded-full border border-black/5">#{tag}</span>
                        ))}
                      </div>

                      <div
                        className="relative rounded-[2rem] overflow-hidden cursor-zoom-in aspect-video shadow-2xl"
                        onClick={() => { setSelectedPost(post); setShowMediaModal(true); }}
                      >
                        <img loading="lazy"
                          src={post.images?.[0] || post.videoThumbnail}
                          alt="Intel Media"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        {post.videoThumbnail && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white group-hover:scale-110 transition-all">
                              <Video className="w-8 h-8 fill-current" />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-8 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-8">
                          <button onClick={handleAction} className="flex items-center gap-3 text-gray-400 hover:text-red-500 transition-all">
                            <Heart className="w-6 h-6" />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none italic">{post.likes}</span>
                          </button>
                          <button onClick={handleAction} className="flex items-center gap-3 text-gray-400 hover:text-orange-500 transition-all">
                            <MessageCircle className="w-6 h-6" />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none italic">{post.comments}</span>
                          </button>
                        </div>
                        <button onClick={handleAction} className="text-gray-400 hover:text-black transition-all"><Share2 className="w-6 h-6" /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar Stats & Features */}
          <aside className="w-full lg:w-96 space-y-12">
            <div className="p-8 rounded-[3rem] bg-gray-900 text-white space-y-8 relative overflow-hidden shadow-2xl shadow-orange-500/10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="space-y-4 relative z-10">
                <div className="p-3 bg-orange-500/20 rounded-2xl w-fit border border-orange-500/30">
                  <Target className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-2xl font-black italic uppercase tracking-tight">Operation Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-gray-400 text-xs font-black uppercase tracking-widest italic">Active Ops</span>
                    <span className="text-xl font-black italic">42</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-gray-400 text-xs font-black uppercase tracking-widest italic">Grid Score</span>
                    <span className="text-xl font-black italic text-blue-400">9.8k</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] italic">Trending Ops</h4>
              {[
                { title: "National Ping Pong Masters", location: "Mumbai Hub", color: "blue" },
                { title: "Elite Badminton Circuit", location: "Bangalore Node", color: "orange" },
                { title: "Premier Football League", location: "Hyderabad Unit", color: "purple" }
              ].map((event, i) => (
                <motion.div
                  key={i}
                  whileHover={{ x: 10 }}
                  className="flex items-center gap-5 cursor-pointer group"
                  onClick={() => setShowRestricted(true)}
                >
                  <div className={`p-4 rounded-2xl bg-gray-50 border border-black/5 text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-all shadow-sm`}>
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-black italic text-gray-900 uppercase tracking-tight group-hover:text-orange-500 transition-colors">{event.title}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{event.location}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showMediaModal && selectedPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-8 md:p-20"
            onClick={() => setShowMediaModal(false)}
          >
            <button className="absolute top-10 right-10 text-white/50 hover:text-white transition-all"><X className="w-10 h-10" /></button>
            <motion.img
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              src={selectedPost.images?.[0] || selectedPost.videoThumbnail}
              className="w-full h-auto max-h-full object-contain rounded-[3rem] shadow-2xl"
            />
          </motion.div>
        )}

        {showLoginModal && (
          <SignInModal onClose={() => setShowLoginModal(false)} />
        )}

        {showRestricted && (
          <RestrictedModal onClose={() => setShowRestricted(false)} onSignIn={() => { setShowRestricted(false); setShowLoginModal(true); }} />
        )}
      </AnimatePresence>
    </div>
  );
};

const SignInModal = ({ onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[300] flex items-center justify-center p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.9, y: 40 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, y: 40, opacity: 0 }}
      className="bg-white rounded-[3rem] max-w-md w-full p-12 relative shadow-2xl overflow-hidden text-center"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 via-indigo-600 to-purple-600" />
      <button onClick={onClose} className="absolute top-8 right-8 text-gray-400 hover:text-black transition-colors"><X className="w-6 h-6" /></button>

      <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center text-orange-500 mx-auto mb-8 shadow-inner">
        <LogIn className="w-10 h-10" />
      </div>

      <h2 className="text-4xl font-black text-gray-900 italic uppercase tracking-tighter mb-4">Awaiting Orders</h2>
      <p className="text-gray-500 font-medium italic mb-10">Authentication required to enlist in the tactical network grid.</p>

      <div className="space-y-4">
        <button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-5 rounded-2xl font-black italic uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-3">
          Sign In
        </button>
        <button className="w-full bg-gray-50 hover:bg-gray-100 text-gray-500 py-5 rounded-2xl font-black italic uppercase tracking-widest text-[10px] transition-all">
          Deploy New Identity
        </button>
      </div>
    </motion.div>
  </motion.div>
);

const RestrictedModal = ({ onClose, onSignIn }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[300] flex items-center justify-center p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.9, y: 40 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, y: 40, opacity: 0 }}
      className="bg-white rounded-[3rem] max-w-md w-full p-12 relative shadow-2xl overflow-hidden text-center"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute top-0 left-0 w-full h-2 bg-orange-600" />
      <button onClick={onClose} className="absolute top-8 right-8 text-gray-400 hover:text-black transition-colors"><X className="w-6 h-6" /></button>

      <div className="w-24 h-24 bg-orange-50 rounded-[2rem] flex items-center justify-center text-orange-600 mx-auto mb-8 shadow-inner">
        <Shield className="w-10 h-10" />
      </div>

      <h2 className="text-4xl font-black text-gray-900 italic uppercase tracking-tighter mb-4">Intel Restricted</h2>
      <p className="text-gray-500 font-medium italic mb-10">Your current clearance level is insufficient for this operation unit. Enlist to continue.</p>

      <div className="space-y-4">
        <button
          onClick={onSignIn}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white py-5 rounded-2xl font-black italic uppercase tracking-widest text-xs transition-all shadow-xl shadow-orange-200 flex items-center justify-center gap-3"
        >
          Sign In
        </button>
        <button
          onClick={onClose}
          className="w-full bg-gray-50 hover:bg-gray-100 text-gray-500 py-5 rounded-2xl font-black italic uppercase tracking-widest text-[10px] transition-all"
        >
          Dismiss Mission
        </button>
      </div>
    </motion.div>
  </motion.div>
);

export default LSocial;
