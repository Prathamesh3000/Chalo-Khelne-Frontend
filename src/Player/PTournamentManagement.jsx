import { FiEdit2, FiShare2, FiTrash2 } from "react-icons/fi";
import { useState, useEffect } from "react";
import { FaStar, FaCheck } from "react-icons/fa";
import { FiPlus } from "react-icons/fi";
import axios from "axios";
import GroupsTab from "../Manager/MGrouptabs";
import { getTournamentType } from "../utils/sportTrack";
const tournaments = [
  { id: 1, name: "Tournament 1", type: "Knockout" },
  { id: 2, name: "Tournament 2", type: "League" },
  { id: 3, name: "Tournament 3", type: "Friendly" },
  { id: 4, name: "Tournament 4", type: "Elimination" },
];

// Dummy player data
const players = [
  { id: 1, name: "Courtney Henry", image: "https://i.pravatar.cc/50?img=1" },
  { id: 2, name: "Jenny Wilson", image: "https://i.pravatar.cc/50?img=2" },
  { id: 3, name: "Jane Cooper", image: "https://i.pravatar.cc/50?img=3" },
  { id: 4, name: "Ralph Edwards", image: "https://i.pravatar.cc/50?img=4" },
  { id: 5, name: "Jacob Jones", image: "https://i.pravatar.cc/50?img=5" },
  {
    id: 6,
    name: "Cameron Williamson",
    image: "https://i.pravatar.cc/50?img=6",
  },
  { id: 7, name: "Cody Fisher", image: "https://i.pravatar.cc/50?img=7" },
  { id: 8, name: "Darlene Robertson", image: "https://i.pravatar.cc/50?img=8" },
];

const TournamentList = () => {
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [data, setData] = useState([]);
  const [selectedTab, setSelectedTab] = useState("Registered Players"); // Main tab
  const [selectedSubTab, setSelectedSubTab] = useState("Registered Player"); // Sub-tab
  const [activeTab, setActiveTab] = useState("Live"); // Live, Upcoming, Recent
  const [selectedPlayers, setSelectedPlayers] = useState([]); // Selected players
  const [topPlayers, setTopPlayers] = useState([]); // Players with gold stars
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSecondModalOpen, setIsSecondModalOpen] = useState(false);
  const [isThirdModalOpen, setIsThirdModalOpen] = useState(false);
  const [isFourthModalOpen, setIsFourthModalOpen] = useState(false);
  const [isLastModalOpen, setIsLastModalOpen] = useState(false);
  const [numGroups, setNumGroups] = useState(0);
  const [groupNames, setGroupNames] = useState([]);
  const [groupPlayers, setGroupPlayers] = useState({});
  const [tournaments, setTournaments] = useState([]);
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [activeSubGroupTab, setactiveSubGroupTab] = useState("");
  useEffect(() => {
    axios
      .get(`/api/tournaments/tournaments`)
      .then((response) => {
        setTournaments(response.data);
      })
      .catch((error) => {
        console.error("Error fetching tournaments:", error);
      });
  }, []);
  useEffect(() => {
    if (tournaments.length > 0) {
      setSelectedTournament(tournaments[0]._id); // First tournament ko select karna
    }
  }, [tournaments]);
  useEffect(() => {
    if (selectedTournament) {

      axios
        .get(
          `/api/tournaments/bookings/tournament/${selectedTournament}`
        )
        .then((response) => {

          if (response.data.success && response.data.bookings.length > 0) {

            const players = response.data.bookings.map((booking) => ({
              id: booking._id,
              name: booking.userName,
              team: booking.team || "No Team",
              bookingDate: booking.bookingDate,
              image: `https://i.pravatar.cc/50?img=${Math.floor(
                Math.random() * 70
              )}`,
            }));

            setRegisteredPlayers(players);
          } else {
            setRegisteredPlayers([]); // Reset if no bookings
          }
        })
        .catch((error) => {
          console.error("Error fetching registered players:", error);
        });
    }
  }, [selectedTournament]);

  const [selectedtournamentTab, setSelectedtournamentTab] =
    useState("Registered");
  const [selectedSubtournamentTab, setSelectedSubtournamentTab] =
    useState("Registered Player");
  const [activeGroup, setActiveGroup] = useState("Group A");

  const handleCreateGroupClick = () => {
    setIsModalOpen(true);
  };
  const handleTournamentClick = () => {
    setSelectedtournamentTab("Registered"); // Set Registered tab active
    setSelectedSubtournamentTab("Registered Player"); // Set Registered Player sub-tab active
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsSecondModalOpen(false);
    setIsThirdModalOpen(false);
    setIsFourthModalOpen(false);
    setIsLastModalOpen(false);
    setNumGroups(0);
    setGroupNames([]);
    setGroupPlayers({});
  };

  const handleNextToSecondModal = () => {
    setGroupNames(Array.from({ length: numGroups }, () => ""));
    setIsModalOpen(false);
    setIsSecondModalOpen(true);
  };

  const handleNextToThirdModal = () => {
    setIsSecondModalOpen(false);
    setIsThirdModalOpen(true);
  };

  const handleNextToFourthModal = () => {
    setIsThirdModalOpen(false);
    setIsFourthModalOpen(true);
  };

  const handleCreateAndShowLastModal = () => {
    setIsFourthModalOpen(false);
    setIsLastModalOpen(true);
  };

  const handleBackToFirstModal = () => {
    setIsSecondModalOpen(false);
    setIsModalOpen(true);
  };

  const handleBackToSecondModal = () => {
    setIsThirdModalOpen(false);
    setIsSecondModalOpen(true);
  };

  const handleBackToThirdModal = () => {
    setIsFourthModalOpen(false);
    setIsThirdModalOpen(true);
  };

  const handleBackToFourthModal = () => {
    setIsLastModalOpen(false);
    setIsFourthModalOpen(true);
  };
  const handleSquareClick = (playerId) => {
    if (selectedPlayers.includes(playerId)) {
      // Remove the player from selected list if already selected
      setSelectedPlayers(selectedPlayers.filter((id) => id !== playerId));
    } else {
      // Add player to selected list
      setSelectedPlayers([...selectedPlayers, playerId]);
    }
  };
  const handleViewGroups = () => {
    // Logic to show the groups somewhere, could be a redirect or UI update
    // For example, you could store the groups in another state to display them elsewhere
    setIsLastModalOpen(false); // Close last modal
    // Optionally, you could show a list or navigate to a different page
  };

  const handleStarClick = (id) => {
    setTopPlayers((prev) => {
      // Toggle player selection in the topPlayers list
      if (prev.includes(id)) {
        return prev.filter((pid) => pid !== id); // Remove player from topPlayers
      } else {
        return [...prev, id]; // Add player to topPlayers
      }
    });
  };

  const handleDelete = (id) => {
    setData(data.filter((tournament) => tournament.id !== id));
  };

  const handlePlayerSelect = (id) => {
    setSelectedPlayers((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-5 flex gap-8">
      {/* Left Section: Tournament List */}
      <div className="">
        {/* Live, Upcoming, Recent Tabs */}
        <div className="flex space-x-3 mb-4 bg-gray-200 p-2 rounded-full w-fit">
          {["Live", "Upcoming", "Recent"].map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition flex items-center mt-0 gap-2 ${
                activeTab === tab
                  ? "bg-orange-500 shadow text-white" // Active tab
                  : "bg-transparent text-gray-600 hover:bg-orange-500 hover:text-white" 
              }`}
            >
              {tab}
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  activeTab === tab
                    ? "bg-orange-500 text-white"
                    : "bg-[#EBF3FF] text-gray hover:text-black"
                }`}
              >
                {index === 0 ? 12 : index === 1 ? 8 : 6}
              </span>
            </button>
          ))}
        </div>

        {/* Tournament List */}
        <div className="space-y-4">
          {tournaments.map((tournament) => (
            <div
              key={tournament._id}
              className={`flex items-center justify-between p-4 rounded-lg shadow-md cursor-pointer transition ${
                tournament.id === selectedTournament
                  ? "bg-orange-500 text-white"
                  : "bg-white"
              }`}
              onClick={() => {
                setSelectedTournament(tournament._id);
                setSelectedTab("Registered Players"); // Set main tab to "Registered Players"
                setSelectedSubTab("Registered Player"); // Set sub-tab to "Registered Player"
              }}
            >
              {/* Left Section */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 flex items-center justify-center bg-blue-500 rounded-full flex-shrink-0">
                  🏆
                </div>
                <div className="max-w-[calc(100%-3rem)]">
                  <h2
                    className={`text-lg font-semibold mt-0 mb-0 ${
                      tournament.id === selectedTournament
                        ? "text-white"
                        : "text-black"
                    } max-w-full break-words`} // Add break-words to allow wrapping
                  >
                    {tournament.title}
                  </h2>
                  <p
                    className={`text-sm ${
                      tournament.id === selectedTournament
                        ? "opacity-80"
                        : "text-gray-500"
                    }`}
                  >
                    {getTournamentType(tournament)}
                  </p>
                </div>
              </div>

              {/* Right Section */}
              
            </div>
          ))}
        </div>
      </div>

      {/* Right Section */}
      {selectedTournament !== null && (
        <div className="w-5/6">
          {/* Main Tabs */}
          <div className="flex space-x-3 mb-4">
            {["Registered Players", "Groups"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setSelectedTab(tab);
                  setSelectedSubTab(""); // Reset sub-tabs
                }}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  selectedTab === tab
                    ? "bg-orange-500 text-white"
                    : "bg-gray-200 text-gray-600 hover:bg-orange-500 hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          {selectedTab === "Registered Players" && (
            <>
              <div className="flex space-x-3 mb-4">
                {["Registered Player", "Top Player", "Super Player"].map(
                  (subTab) => (
                    // <button
                    //   key={subTab}
                    //   onClick={() => setSelectedSubTab(subTab)}
                    //   className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                    //     selectedSubTab === subTab
                    //       ? "bg-white text-black border border-gray-300"
                    //       : "bg-gray-200 text-gray-600"
                    //   }`}
                    // >
                    //   {subTab}
                    // </button>
                    <button
                      key={subTab}
                      onClick={() => setSelectedSubTab(subTab)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                        selectedSubTab === subTab
                          ? "bg-white text-black border border-gray-300 hover:bg-orange-500 hover:text-white"
                          : "bg-gray-200 text-gray-600 hover:bg-orange-500 hover:text-white"
                      } outline-none`}
                    >
                      {subTab}
                    </button>
                  )
                )}
              </div>

              
              {selectedSubTab === "Registered Player" && (
  <div>
    {/* Registered Players UI */}
    <div className="bg-white shadow-md p-4 rounded-lg">
      <h2 className="text-lg font-semibold mb-3">Registered Players</h2>
      <div className="grid grid-cols-2 gap-2 bg-gray-100">
        {registeredPlayers.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between p-3 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <img loading="lazy"
                src={player.image}
                alt={player.name}
                className="w-10 h-10 rounded-full"
              />
              <span>{player.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}


              {selectedSubTab === "Top Player" && (
                <div>
                  <div className="bg-white shadow-md p-4 rounded-lg mt-4">
                    <h2 className="text-lg font-semibold mb-3">
                      Seeded Players
                    </h2>
                    {topPlayers.length === 0 ? (
                      <p className="text-gray-500">No top players selected.</p>
                    ) : (
                      <ul>
                        {players
                          .filter((player) => topPlayers.includes(player.id)) // Filter the players who are marked as top players
                          .map((player) => (
                            <li
                              key={player.id}
                              className="p-2 bg-gray-100 rounded-lg flex items-center gap-3 mb-2"
                            >
                              {player.name}
                            </li>
                          ))}
                      </ul>
                    )}
                    {/* Buttons Section */}
                    <div className="mt-4 flex gap-4">
                      {/* Create Match Button */}
                      <button className="px-6 py-2 bg-[#FF6600] text-white rounded-full hover:bg-[#e65c00] focus:outline-none">
                        Create Match
                      </button>
                      {/* Create Groups Button */}
                      <button className="px-6 py-2 border-2 border-[#FF6600] text-[#FF6600] rounded-full">
                        Create Groups
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          {selectedTab === "Groups" && (
            <GroupsTab
              activeSubGroupTab={activeSubGroupTab}
              setactiveSubGroupTab={setactiveSubGroupTab}
              activeGroup={activeGroup}
              setActiveGroup={setActiveGroup}
            />
          )}

          {/* Show sub-tabs only when "Registered Players" is clicked */}
         
        </div>
      )}
    </div>
  );
};

export default TournamentList;
