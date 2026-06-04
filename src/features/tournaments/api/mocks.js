const SPORTS = ["Cricket", "Football", "Badminton", "Tennis", "Basketball", "Volleyball"];
const CITIES = ["Pune", "Mumbai", "Bangalore", "Delhi", "Hyderabad", "Chennai"];
const NAMES = [
  "Monsoon Cup", "City League", "Champions Trophy", "Premier Knockout",
  "Weekend Bash", "Corporate Showdown", "Summer Smash", "Festival of Sports",
  "Inter-Club Trophy", "Royal Cup",
];

const STATUSES = ["live", "upcoming", "completed"];

function makeOne(i) {
  const sport = SPORTS[i % SPORTS.length];
  const status = STATUSES[i % STATUSES.length];
  const total = 16 + (i % 3) * 8;
  const registered = status === "completed" ? total : Math.floor(total * (0.4 + (i % 6) * 0.1));
  const fee = 200 + (i % 5) * 100;
  const startInDays = status === "upcoming" ? 3 + i * 2 : status === "live" ? -1 : -20 - i;
  const start = new Date(Date.now() + startInDays * 86400000);
  const end = new Date(start.getTime() + 4 * 86400000);

  return {
    _id: `mock-tourney-${i}`,
    name: `${NAMES[i % NAMES.length]} ${2026 + (i % 2)}`,
    sport,
    city: CITIES[i % CITIES.length],
    venue: `${CITIES[i % CITIES.length]} Sports Arena`,
    status,
    bookingType: ["Cricket", "Football", "Volleyball", "Basketball"].includes(sport) ? "team" : "individual",
    capacity: total,
    registered,
    fee,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    bannerColor: ["#F97316", "#0EA572", "#F5C31C", "#3B82F6", "#8B5CF6"][i % 5],
  };
}

const TOURNAMENTS = Array.from({ length: 12 }, (_, i) => makeOne(i));

export async function mockListTournaments(filters = {}) {
  await new Promise((r) => setTimeout(r, 250));
  let list = [...TOURNAMENTS];
  if (filters.status) list = list.filter((t) => t.status === filters.status);
  if (filters.sport) list = list.filter((t) => t.sport === filters.sport);
  if (filters.q) {
    const q = filters.q.toLowerCase();
    list = list.filter((t) => t.name.toLowerCase().includes(q) || t.sport.toLowerCase().includes(q));
  }
  return list;
}

export async function mockGetTournament(id) {
  await new Promise((r) => setTimeout(r, 200));
  return TOURNAMENTS.find((t) => t._id === id) || TOURNAMENTS[0];
}
