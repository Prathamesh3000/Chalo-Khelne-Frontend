export const SPORTS = [
  { name: "Cricket",      emoji: "🏏", scoring: "Innings", accent: "#F97316" },
  { name: "Football",     emoji: "⚽", scoring: "Time",    accent: "#10B981" },
  { name: "Badminton",    emoji: "🏸", scoring: "Set",     accent: "#3B82F6" },
  { name: "Tennis",       emoji: "🎾", scoring: "Set",     accent: "#EAB308" },
  { name: "Basketball",   emoji: "🏀", scoring: "Time",    accent: "#EF4444" },
  { name: "Volleyball",   emoji: "🏐", scoring: "Set",     accent: "#EC4899" },
  { name: "Kabaddi",      emoji: "🤼", scoring: "Time",    accent: "#8B5CF6" },
  { name: "Hockey",       emoji: "🏑", scoring: "Time",    accent: "#06B6D4" },
  { name: "Table Tennis", emoji: "🏓", scoring: "Set",     accent: "#84CC16" },
  { name: "Pickleball",   emoji: "🎯", scoring: "Set",     accent: "#22C55E" },
  { name: "Squash",       emoji: "🥎", scoring: "Set",     accent: "#F59E0B" },
  { name: "Carrom",       emoji: "🎱", scoring: "Single",  accent: "#A855F7" },
];

export const HERO_SPORTS = SPORTS.slice(0, 6);

export const STATS = [
  { value: 500,   suffix: "+", label: "Tournaments" },
  { value: 12000, suffix: "+", label: "Players" },
  { value: 14,    suffix: "",  label: "Sports" },
  { value: 98,    suffix: "%", label: "Match accuracy" },
];

export const HOW_STEPS = [
  {
    n: 1,
    title: "Your club joins",
    body: "Submit an inquiry below. Our team onboards your club and provisions your Club Admin account within one business day.",
  },
  {
    n: 2,
    title: "Set up tournaments",
    body: "Managers create brackets, assign courts, and invite referees. Players register and pay through the mobile app.",
  },
  {
    n: 3,
    title: "Go live",
    body: "Real-time scoring, live leaderboards, and instant push notifications to every player and ref in the tournament.",
  },
];

export const ROLE_CARDS = [
  {
    title: "Club Admin",
    tagline: "Your club, your rules",
    bullets: [
      "Set up your club profile and turfs",
      "Create + manage managers",
      "View full finance + payouts",
    ],
    accent: "#F97316",
  },
  {
    title: "Manager",
    tagline: "Run tournaments like a pro",
    bullets: [
      "Generate brackets in one click",
      "Auto-schedule courts + windows",
      "Score matches live, from any device",
    ],
    accent: "#3B82F6",
  },
  {
    title: "Referee",
    tagline: "Be part of every match",
    bullets: [
      "Apply to tournaments from mobile",
      "Get matched to your sport",
      "Score live with sport-aware controls",
    ],
    accent: "#10B981",
  },
];
