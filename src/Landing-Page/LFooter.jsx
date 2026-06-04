import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Instagram, Facebook, Twitter, Youtube, Send, Globe, Shield, Zap, Smartphone, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import googlePlay from "../assets/google.png";

const Footer = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const footerLinks = [
    {
      title: "Quick Links",
      links: [
        { name: "Home", path: "/" },
        { name: "About Us", path: "/about-us" },
        { name: "FAQ", path: "/faq" },
      ]
    },
    {
      title: "Legal",
      links: [
        { name: "Privacy Policy", path: "/privacy-policy" },
        { name: "Terms of Service", path: "/terms-and-conditions" },
      ]
    }
  ];

  return (
    <footer className="relative bg-gray-50 pt-32 pb-20 overflow-hidden border-t border-gray-200">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-orange-100/40 blur-[120px] rounded-full -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-amber-100/30 blur-[120px] rounded-full translate-y-1/2" />

      <div className="max-w-[1440px] mx-auto px-8 md:px-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">

          {/* Brand Briefing */}
          <div className="lg:col-span-4 space-y-10">
            <div className="flex items-center gap-4 group">
              <div className="w-16 h-16 bg-orange-500 rounded-[2rem] flex items-center justify-center p-3 shadow-lg shadow-orange-500/15 group-hover:rotate-12 transition-transform duration-500">
                <img
                  src="/sportapp_logo.png"
                  alt="Logo"
                  className="w-full h-full invert brightness-0"
                />
              </div>
              <div>
                <h3 className="text-3xl font-bold tracking-tight text-gray-900">
                  Chalo <span className="text-orange-500">Khelne</span>
                </h3>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Connecting Sports Communities</p>
              </div>
            </div>

            <p className="text-gray-500 font-medium text-lg leading-relaxed max-w-sm">
              Connecting athletes and sports lovers with the best facilities and events. Book venues, join tournaments, and manage your matches with ease.
            </p>

            <div className="flex gap-4">
              {[Instagram, Facebook, Twitter, Youtube].map((Icon, idx) => (
                <motion.a
                  key={idx}
                  href="#"
                  whileHover={{ y: -5, scale: 1.1 }}
                  className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-white hover:bg-orange-500 hover:border-orange-500 transition-all shadow-sm hover:shadow-lg"
                >
                  <Icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Quick Access Grids */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-10">
            {footerLinks.map((section, idx) => (
              <div key={idx} className="space-y-8">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-orange-500 flex items-center gap-3">
                  <div className="w-6 h-[1px] bg-blue-400" />
                  {section.title}
                </h4>
                <ul className="space-y-4">
                  {section.links.map((link, lIdx) => (
                    <li key={lIdx}>
                      <Link
                        to={link.path}
                        className="text-gray-500 hover:text-gray-900 font-semibold tracking-tight text-sm flex items-center group transition-all"
                      >
                        <span className="w-0 group-hover:w-4 overflow-hidden transition-all duration-300">
                          <ArrowRight className="w-3 h-3 text-orange-500 mr-2" />
                        </span>
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="col-span-2 space-y-8">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-orange-500 flex items-center gap-3">
                <div className="w-6 h-[1px] bg-blue-400" />
                Contact Us
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="py-6 px-2 bg-white rounded-[2rem] border border-gray-200 space-y-2 group hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm">
                  <Globe className="w-5 h-5 text-gray-400 group-hover:text-orange-500" />
                  <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">sales@chalokhelne.com</p>
                </div>
                <div className="py-6 px-2 bg-white rounded-[2rem] border border-gray-200 space-y-2 group hover:bg-amber-50 hover:border-amber-200 transition-all shadow-sm">
                  <Zap className="w-5 h-5 text-gray-400 group-hover:text-amber-500" />
                  <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">+91 9272090926</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Access Point */}
          <div className="lg:col-span-4 lg:pl-10">
            <div className="relative p-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-[3rem] shadow-xl shadow-orange-500/15 overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
              <Smartphone className="absolute bottom-[-20%] right-[-10%] w-48 h-48 text-white/10 -rotate-12 group-hover:rotate-0 transition-transform duration-700" />

              <div className="relative z-10 space-y-6">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-3xl font-bold tracking-tight text-white mb-2">Download the App</h3>
                <p className="text-white/80 font-medium text-sm leading-relaxed mb-6">
                  Get the best experience on your mobile. Book turfs and join events on the go.
                </p>
                <a
                  href="https://play.google.com/store/apps/details?id=com.chalokhelnesport.client"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-4 px-8 py-4 bg-white text-gray-900 rounded-2xl font-bold tracking-wide text-xs hover:scale-105 active:scale-95 transition-all shadow-lg"
                >
                  Get it on Google Play <img src={googlePlay} alt="Google Play" className="h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-32 pt-10 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            © 2026 Chalo Khelne. All Rights Reserved.
          </p>
          <div className="flex gap-8">
            {['Status: Online', 'Secure Connection', 'Region: Global'].map((status, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll to Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-10 right-10 z-[110] group"
            aria-label="Scroll to top"
          >
            <div className="relative w-16 h-16 bg-orange-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-orange-500/25 group-hover:bg-orange-500 transition-colors">
              <div className="absolute inset-0 bg-blue-400/30 rounded-3xl animate-ping opacity-20 group-hover:opacity-40" />
              <ArrowUp className="w-6 h-6 relative z-10 group-hover:-translate-y-1 transition-transform" />
            </div>
            <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Scroll to Top</span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </footer>
  );
};

export default Footer;
