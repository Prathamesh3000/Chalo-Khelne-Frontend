import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { X, Check, RefreshCcw, Edit, Trophy } from "lucide-react";
import { Switch } from "@mui/material";
import BulkScoreUploadModal from "./BulkScoreUploadModal";

const MGroupStageMatchesPage = () => {
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [currentGame, setCurrentGame] = useState(0);
    const [teamAPoints, setTeamAPoints] = useState(0);
    const [teamBPoints, setTeamBPoints] = useState(0);
    const [winner, setWinner] = useState(null);
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);
    const [message, setMessage] = useState("");
    const [matchFormat, setMatchFormat] = useState(null);
    const [matchesData, setMatchesData] = useState({});
    const [currentPlayers, setCurrentPlayers] = useState({ home: "", away: "" });
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [matchStatus, setMatchStatus] = useState(null);
    const [isEnabled, setIsEnabled] = useState(false);
    const [showEditView, setShowEditView] = useState(false);
    const [selectedGame, setSelectedGame] = useState(null);
    const [isMatchSubmitted, setIsMatchSubmitted] = useState(false);
    const [teamASetWins, setTeamASetWins] = useState(0);
    const [teamBSetWins, setTeamBSetWins] = useState(0);
    const [tapCooldown, setTapCooldown] = useState(false);
    const [currentGameInMatch, setCurrentGameInMatch] = useState(1);
    const [expandedSets, setExpandedSets] = useState([]);

    const [showSubModal, setShowSubModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalMessage, setModalMessage] = useState("");

    const [sets, setSets] = useState([]);

    // Bulk Score Upload state
    const [showBulkUpload, setShowBulkUpload] = useState(false);

    // NEW: Backend integration state
    const [liveState, setLiveState] = useState(null);
    const [currentSetNumber, setCurrentSetNumber] = useState(1);
    const [setsData, setSetsData] = useState([]);

    const location = useLocation();
    const { id } = useParams();

    const route = {
        params: location.state || {},
    };

    const {
        matchId,
        tournamentId,     // ✅ Tournament ID
        activeGroupId,    // ✅ Active Group ID
        teamAName,
        teamBName,
        matchType,
        setCount,
        team1Captain,
        team1Players,
        team2Captain,
        team2Players,
    } = location.state || {};

    const playerAName = teamAName || "Player A";
    const playerBName = teamBName || "Player B";
    const playerAPoints = teamAPoints;
    const playerBPoints = teamBPoints;
    const playerASetWins = teamASetWins;
    const playerBSetWins = teamBSetWins;

    const playerAId = team1Players?.[0]?._id; // or the captain if needed
    const playerBId = team2Players?.[0]?._id;

    const fetchMatches = async () => {
        if (!tournamentId || !activeGroupId) return;

        try {
            setLoading(true);
            const response = await axios.get(
                `/api/tournaments/matches/${tournamentId}/${activeGroupId}`
            );


            if (response.data.success) {
                setMatchesData(prev => ({
                    ...prev,
                    [activeGroupId]: response.data.matches,
                }));
            } else {
                setMatchesData(prev => ({ ...prev, [activeGroupId]: [] }));
            }
        } catch (err) {
            console.error("Error fetching matches:", err);
            setError(err.message);
            setMatchesData(prev => ({ ...prev, [activeGroupId]: [] }));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (matchId) {
            initializeMatch();
        }
    }, [matchId]);

    useEffect(() => {
        // Update current players when live state changes
        if (liveState && matchFormat) {
            const currentSetIndex = (liveState.currentSetNumber || 1) - 1;
            if (matchFormat.sequence[currentSetIndex]) {
                setCurrentPlayers(matchFormat.sequence[currentSetIndex]);
                setCurrentGame(currentSetIndex);
            }
        }
    }, [liveState, matchFormat]);

    const initializeMatch = async () => {
        try {
            setLoading(true);

            const token = localStorage.getItem("token");
            const response = await fetch(
                `/api/tournaments/scores/${matchId}`,
                {
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to fetch match score");
            }

            const data = await response.json();

            if (data.score) {
                const scoreData = data.score;

                // Store live state if your schema has it
                setLiveState(scoreData.liveState || {});
                setSetsData(scoreData.sets || []);

                // If you track points / sets like before:
                setTeamASetWins(scoreData.setsWon?.home || 0);
                setTeamBSetWins(scoreData.setsWon?.away || 0);
                setCurrentSetNumber(scoreData.liveState?.currentSetNumber || 1);
                setCurrentGameInMatch(scoreData.liveState?.currentGameNumber || 1);
                setTeamAPoints(scoreData.liveState?.currentPoints?.home || 0);
                setTeamBPoints(scoreData.liveState?.currentPoints?.away || 0);

                // Status
                setMatchStatus(scoreData.status);

                // Winner Handling
                if (scoreData.status === "COMPLETED" && scoreData.winner) {
                    setWinner(scoreData.winner.userId?.name || "Unknown");
                    setIsMatchSubmitted(true);
                }

                // Historical sets formatting
                if (scoreData.sets && scoreData.sets.length > 0) {
                    const processedMatches = scoreData.sets.map((set, index) => ({
                        setNumber: set.setNumber,
                        score: `${set.gamesWon?.home || 0}-${set.gamesWon?.away || 0}`,
                        games: set.games || [],
                        roundNumber: index + 1,
                        status: set.status,
                    }));
                    setMatches(processedMatches);
                }
            }
        } catch (error) {
            console.error("Error initializing match:", error);
            showModal("Error", "Failed to load match score");
        } finally {
            setLoading(false);
        }
    };

    const getCorrectWinnerName = (
        winnerId,
        team1Data,
        team2Data,
        team1PropName,
        team2PropName
    ) => {
        if (!winnerId) return null;

        if (winnerId.toString() === team1Data?._id?.toString()) {
            return team1Data?.teamName || team1PropName;
        } else if (winnerId.toString() === team2Data?._id?.toString()) {
            return team2Data?.teamName || team2PropName;
        }

        return null;
    };

    const updateLiveScore = async ({ playerA, playerB, setOne, setTwo, setThree, winner }) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `/api/tournaments/scores/${matchId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                        playerA,    // playerA _id
                        playerB,    // playerB _id
                        setOne,     // e.g. "11-7"
                        setTwo,     // e.g. "8-11"
                        setThree,   // optional, e.g. "11-9"
                        winner,     // winner player _id
                    }),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to update live score");
            }

            const data = await response.json();

            return data.updatedScore;
        } catch (error) {
            console.error("Error updating score:", error);
            throw error;
        }
    };

    const submitRound = async () => {
        if (winner || isButtonDisabled) {
            showModal("Match Complete", "Winner has already been declared!");
            return;
        }

        const isGameWon =
            (teamAPoints >= 11 && teamAPoints - teamBPoints >= 2) ||
            (teamBPoints >= 11 && teamBPoints - teamAPoints >= 2);

        if (!isGameWon) {
            showModal("Invalid Score", "A player must win a set with 11 points and 2-point lead.");
            return;
        }

        // Save current set
        const currentSet = `${teamAPoints}-${teamBPoints}`;
        const updatedSets = [...sets, currentSet];
        setSets(updatedSets);

        // Decide winner if match finished (best of 3)
        const playerAId = team1Players?.[0]?._id;
        const playerBId = team2Players?.[0]?._id;

        const aSetWins = updatedSets.filter(s => parseInt(s.split("-")[0]) > parseInt(s.split("-")[1])).length;
        const bSetWins = updatedSets.filter(s => parseInt(s.split("-")[1]) > parseInt(s.split("-")[0])).length;

        let winnerId = null;
        if (aSetWins === 2) winnerId = playerAId;
        if (bSetWins === 2) winnerId = playerBId;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `/api/tournaments/scores/${matchId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                        playerA: playerAId,
                        playerB: playerBId,
                        setOne: updatedSets[0] || null,
                        setTwo: updatedSets[1] || null,
                        setThree: updatedSets[2] || null,
                        winner: winnerId,
                    }),
                }
            );

            if (!response.ok) throw new Error("Failed to save score");

            const data = await response.json();

            showModal("Set Complete", "Score has been saved successfully!");
            setTeamAPoints(0);
            setTeamBPoints(0);

            if (winnerId) {
                setWinner(winnerId === playerAId ? teamAName : teamBName);
                setMatchStatus("COMPLETED");
                showModal("Match Complete", `${winnerId === playerAId ? teamAName : teamBName} wins the match!`);
            }
        } catch (error) {
            console.error("Error saving score:", error);
            showModal("Error", "Failed to save score. Please try again.");
        } finally {
            setIsButtonDisabled(false);
            setMessage("");
        }
    };


    const resetPoints = async () => {
        if (route?.params?.viewOnly || winner || isButtonDisabled) return;

        setIsButtonDisabled(true);
        setMessage("Resetting scores...");

        try {
            setTeamAPoints(0);
            setTeamBPoints(0);
            await updateLiveScore(0, 0);
        } catch (error) {
            console.error("Error resetting scores:", error);
            showModal("Error", "Failed to reset scores");
        } finally {
            setIsButtonDisabled(false);
            setMessage("");
        }
    };


    const saveEditedScores = () => {
        // Basic validation
        if (teamAPoints < 11 && teamBPoints < 11) {
            showModal("Invalid Score", "A player needs at least 11 points to win a set");
            return;
        }

        const pointDiff = Math.abs(teamAPoints - teamBPoints);
        if (pointDiff < 2) {
            showModal("Invalid Score", "There must be at least a 2-point lead to win");
            return;
        }

        // Ensure valid winner
        if (teamAPoints === teamBPoints) {
            showModal("Invalid Score", "Scores cannot be equal");
            return;
        }

        // Save this round/set locally
        const newSet = `${teamAPoints}-${teamBPoints}`;
        setSets((prev) => [...prev, newSet]);

        // Reset points for next set
        setTeamAPoints(0);
        setTeamBPoints(0);

        showModal("Set Saved", `Set ${sets.length + 1} recorded: ${newSet}`);
    };

    const showModal = (title, message) => {
        setModalTitle(title);
        setModalMessage(message);
        setIsModalOpen(true);
    };

    // Helper function to close modal
    const closeModal = () => {
        setIsModalOpen(false);
    };

    const handleOpenSubModal = (teamType) => {
        setSelectedTeam(teamType);
        setShowSubModal(true);
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Left side: Matches List */}
            <div className="w-1/3 border-r bg-white overflow-y-auto">
                <div className="flex justify-between items-center p-4">
                    <h2 className="text-xl font-bold">Matches</h2>
                    {(matchesData[activeGroupId] || []).some(m => m.status !== 'COMPLETED') && (
                        <button
                            className="px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 w-auto"
                            onClick={() => setShowBulkUpload(true)}
                        >
                            Bulk Upload
                        </button>
                    )}
                </div>

                {loading ? (
                    <p className="p-4 text-gray-500">Loading matches...</p>
                ) : (
                    (matchesData[activeGroupId] || []).map((match) => (
                        <div
                            key={match._id}
                            className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${selectedMatch?._id === match._id ? "bg-gray-200" : ""
                                }`}
                            onClick={() => setSelectedMatch(match)}
                        >
                            <h3 className="font-semibold">
                                {match.player1?.userName}{match.matchType === "doubles" && match.player1?.partner?.userName ? ` & ${match.player1.partner.userName}` : ""} vs {match.player2?.userName}{match.matchType === "doubles" && match.player2?.partner?.userName ? ` & ${match.player2.partner.userName}` : ""}
                            </h3>
                            <p className="text-sm text-gray-600">Status: {match.status}</p>
                            {match.scores?.length > 0 && (
                                <p className="text-sm text-gray-800">
                                    Scores: {match.scores.map(s => `${s.setOne}${s.setTwo ? ', ' + s.setTwo : ''}${s.setThree ? ', ' + s.setThree : ''}`).join(" | ")}
                                </p>
                            )}
                        </div>
                    ))
                )}

                {(!loading && (!matchesData[activeGroupId] || matchesData[activeGroupId].length === 0)) && (
                    <p className="p-4 text-gray-500">No matches available for this group.</p>
                )}
            </div>

            {/* Right side: Match Details */}
            <div className="flex-1 p-6 overflow-y-auto">
                {selectedMatch ? (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">
                            {selectedMatch.playerA} vs {selectedMatch.playerB}
                        </h2>
                        <p className="text-gray-700 mb-4">Status: {selectedMatch.status}</p>

                        {/* Live Score */}
                        {selectedMatch.liveScore && (
                            <div className="mb-4 bg-gray-200 p-4 rounded">
                                <h3 className="font-semibold mb-2">Live Score</h3>
                                <p>{selectedMatch.liveScore}</p>
                            </div>
                        )}

                        {/* Buttons to open popups */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowManualPopup(true)}
                                className="bg-orange-500 text-white px-4 py-2 rounded"
                            >
                                Manual Scoreboard
                            </button>
                            <button
                                onClick={() => setShowAutomaticPopup(true)}
                                className="bg-green-600 text-white px-4 py-2 rounded"
                            >
                                Automatic Scoreboard
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-500">Select a match to view details</p>
                )}
            </div>
            <div className="min-h-screen bg-black relative flex flex-col justify-center items-center">
                {/* Toggle Switch for Automated or Manual Mode */}
                {!showEditView && (
                    <div className="absolute right-0 top-16 transform rotate-60 bg-gray-900 p-2 rounded-2xl z-10 flex items-center gap-2 mr-40">
                        <Switch
                            checked={isEnabled}
                            onChange={(event) => setIsEnabled(event.target.checked)}
                        />
                        <span className="text-white text-sm font-medium">
                            {isEnabled ? "Auto" : "Manual"}
                        </span>
                    </div>
                )}

                {/* Main Content Container */}
                {showEditView ? (
                    // Edit View
                    <div>
                        {/* Edit Header */}
                        <div className="border-b border-gray-700">
                            <h2 className="text-xl font-semibold text-white text-center p-4">
                                Edit Match Scores
                            </h2>
                        </div>

                        {/* Games List with Scroll */}
                        <div className="overflow-y-auto h-[calc(100vh-200px)] p-4">
                            {matches?.map((matchInfo, setIndex) => {
                                const teamAWins = matchInfo?.score
                                    ? parseInt(matchInfo.score.split("-")[0])
                                    : 0;
                                const teamBWins = matchInfo?.score
                                    ? parseInt(matchInfo.score.split("-")[1])
                                    : 0;

                                return (
                                    <div key={setIndex} className="mb-4">
                                        {/* Set Header */}
                                        <button
                                            className={`
                      w-full flex justify-between items-center p-4 rounded-lg mb-2
                      ${selectedGame === setIndex
                                                    ? "bg-gray-700 border border-orange-500"
                                                    : "bg-gray-800"
                                                }
                    `}
                                            onClick={() => {
                                                setExpandedSets((prev) =>
                                                    prev.includes(setIndex)
                                                        ? prev.filter((id) => id !== setIndex)
                                                        : [...prev, setIndex]
                                                );
                                            }}
                                        >
                                            <div className="space-y-1">
                                                <h3 className="text-white font-medium">
                                                    Set {setIndex + 1}
                                                </h3>
                                                <span className="text-gray-400 text-sm">
                                                    {teamAWins > teamBWins
                                                        ? "Team A Won"
                                                        : teamBWins > teamAWins
                                                            ? "Team B Won"
                                                            : ""}
                                                </span>
                                                {teamAWins + teamBWins > 0 && (
                                                    <p className="text-gray-400 text-sm">
                                                        Score:{" "}
                                                        <span
                                                            className={
                                                                teamAWins > teamBWins
                                                                    ? "text-green-500"
                                                                    : "text-gray-400"
                                                            }
                                                        >
                                                            {teamAWins}
                                                        </span>
                                                        -
                                                        <span
                                                            className={
                                                                teamBWins > teamAWins
                                                                    ? "text-green-500"
                                                                    : "text-gray-400"
                                                            }
                                                        >
                                                            {teamBWins}
                                                        </span>
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {teamAWins + teamBWins > 0 && (
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`text-xl ${teamAWins > teamBWins
                                                                ? "text-green-500"
                                                                : "text-white"
                                                                }`}
                                                        >
                                                            {teamAWins}
                                                        </span>
                                                        <span className="text-white text-xl">-</span>
                                                        <span
                                                            className={`text-xl ${teamBWins > teamAWins
                                                                ? "text-green-500"
                                                                : "text-white"
                                                                }`}
                                                        >
                                                            {teamBWins}
                                                        </span>
                                                    </div>
                                                )}
                                                <span className="text-white text-xl">
                                                    {expandedSets.includes(setIndex) ? "▼" : "▶"}
                                                </span>
                                            </div>
                                        </button>

                                        {/* Games within Set */}
                                        {expandedSets.includes(setIndex) &&
                                            matchInfo?.games?.length > 0 && (
                                                <div className="ml-4 space-y-2">
                                                    {matchInfo.games.map((game, gameIndex) => {
                                                        const scores = game.score?.split("-").map(Number) || [
                                                            0, 0,
                                                        ];
                                                        const isTeamAWinner = scores[0] > scores[1];
                                                        const isSelected =
                                                            selectedGame === `${setIndex}-${gameIndex}`;

                                                        return (
                                                            <button
                                                                key={`${setIndex}-${gameIndex}`}
                                                                className={`
                              w-full flex justify-between items-center p-3 rounded-lg
                              ${isSelected
                                                                        ? "bg-gray-700 border border-orange-500"
                                                                        : "bg-gray-800"
                                                                    }
                            `}
                                                                onClick={() => {
                                                                    setSelectedGame(`${setIndex}-${gameIndex}`);
                                                                    setTeamAPoints(scores[0]);
                                                                    setTeamBPoints(scores[1]);
                                                                }}
                                                            >
                                                                <div>
                                                                    <p className="text-white">
                                                                        Game {gameIndex + 1}
                                                                    </p>
                                                                    <p className="text-gray-400 text-sm">
                                                                        {isTeamAWinner ? teamAName : teamBName} Won
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span
                                                                        className={`text-lg ${isTeamAWinner
                                                                            ? "text-green-500"
                                                                            : "text-white"
                                                                            }`}
                                                                    >
                                                                        {scores[0]}
                                                                    </span>
                                                                    <span className="text-white">-</span>
                                                                    <span
                                                                        className={`text-lg ${!isTeamAWinner
                                                                            ? "text-green-500"
                                                                            : "text-white"
                                                                            }`}
                                                                    >
                                                                        {scores[1]}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Score Editor */}
                        {selectedGame !== null && (
                            <div className="fixed bottom-0 left-0 right-0 bg-gray-800 p-4 border-t border-gray-700">
                                <h3 className="text-white font-semibold text-center mb-4">
                                    Edit Game Scores
                                </h3>
                                {(() => {
                                    if (!selectedGame) return null;
                                    const [setIndex, gameIndex] = selectedGame
                                        .split("-")
                                        .map(Number);
                                    const selectedGameScore =
                                        matches[setIndex]?.games[gameIndex]?.score || "0-0";

                                    return (
                                        <>
                                            <div className="flex justify-center gap-8 mb-4">
                                                <div className="text-center">
                                                    <label className="text-white mb-2 block">
                                                        {teamAName}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        className="w-20 h-10 text-center rounded bg-gray-700 text-white border border-gray-600"
                                                        defaultValue={selectedGameScore.split("-")[0]}
                                                        onChange={(e) =>
                                                            setTeamAPoints(parseInt(e.target.value) || 0)
                                                        }
                                                    />
                                                </div>

                                                <div className="text-center">
                                                    <label className="text-white mb-2 block">
                                                        {teamBName}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        className="w-20 h-10 text-center rounded bg-gray-700 text-white border border-gray-600"
                                                        defaultValue={selectedGameScore.split("-")[1]}
                                                        onChange={(e) =>
                                                            setTeamBPoints(parseInt(e.target.value) || 0)
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-center gap-4">
                                                <button
                                                    className="px-6 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                                                    onClick={() => setSelectedGame(null)}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    className="px-6 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                                                    onClick={saveEditedScores}
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Back to Scoreboard Button */}
                        <button
                            className="fixed top-4 right-4 bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
                            onClick={() => {
                                setShowEditView(false);
                                setSelectedGame(null);
                            }}
                        >
                            Back to Scoreboard
                        </button>
                    </div>
                ) : (
                    <>
                        {isEnabled ? (
                            // Automated Scoreboard
                            <div className="fixed inset-0 bg-black">
                                <div className="flex flex-col md:flex-row h-screen">
                                    {/* Player A Side */}
                                    <div
                                        className={`w-full md:w-1/2 bg-orange-500 relative flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-black py-6 md:py-0 transition-colors ${tapCooldown ? "opacity-50 cursor-not-allowed" : "active:bg-orange-500"
                                            }`}
                                        onClick={() =>
                                            !route?.params?.viewOnly && !tapCooldown && incrementPlayerA()
                                        }
                                    >
                                        {/* Trophy */}
                                        {(winner === playerAName ||
                                            (route?.params?.viewOnly &&
                                                matchStatus === "COMPLETED" &&
                                                (winner === playerAName || playerASetWins > playerBSetWins))) && (
                                                <div className="absolute top-4 md:top-12 right-4 md:right-12">
                                                    <Trophy className="text-yellow-400 w-8 h-8 md:w-16 md:h-16" />
                                                </div>
                                            )}

                                        {/* Set Wins */}
                                        <div className="absolute top-4 md:top-12 left-4 md:left-12">
                                            <span className="text-4xl md:text-8xl font-bold text-white">
                                                {playerASetWins}
                                            </span>
                                        </div>

                                        {/* Main Score */}
                                        <div className="text-6xl md:text-[12rem] font-bold text-white mb-12">
                                            {playerAPoints < 10 ? `0${playerAPoints}` : playerAPoints}
                                        </div>

                                        {/* Player Name */}
                                        <span className="text-2xl md:text-4xl font-bold text-white mb-12 px-2 text-center">
                                            {playerAName}
                                        </span>

                                        {/* Game Scores */}
                                        <div className="absolute bottom-16 md:bottom-32 right-4 md:right-12">
                                            <div className="space-y-2 md:space-y-4">
                                                {Array.from({ length: 3 }).map((_, index) => {
                                                    const currentSet = setsData[currentSetNumber - 1];
                                                    const game = currentSet?.games?.[index];
                                                    return (
                                                        <span
                                                            key={`gameA${index}`}
                                                            className="text-xl md:text-4xl text-white block text-right font-semibold"
                                                        >
                                                            {game?.status === "COMPLETED"
                                                                ? game.playerAPoints
                                                                : index === currentGameInMatch - 1
                                                                    ? playerAPoints
                                                                    : "0"}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Decrement Button */}
                                        {!route?.params?.viewOnly && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!tapCooldown) decrementPlayerA();
                                                }}
                                                className="absolute bottom-4 md:bottom-12 left-4 md:left-12 bg-black/20 p-3 md:p-5 rounded-full hover:bg-black/30"
                                                disabled={tapCooldown}
                                            >
                                                <X className="text-white w-6 h-6 md:w-10 md:h-10" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Player B Side */}
                                    <div
                                        className={`w-full md:w-1/2 bg-red-500 relative flex flex-col items-center justify-center py-6 md:py-0 transition-colors ${tapCooldown ? "opacity-50 cursor-not-allowed" : "active:bg-red-600"
                                            }`}
                                        onClick={() =>
                                            !route?.params?.viewOnly && !tapCooldown && incrementPlayerB()
                                        }
                                    >
                                        {/* Trophy */}
                                        {(winner === playerBName ||
                                            (route?.params?.viewOnly &&
                                                matchStatus === "COMPLETED" &&
                                                (winner === playerBName || playerBSetWins > playerASetWins))) && (
                                                <div className="absolute top-4 md:top-12 left-4 md:left-12">
                                                    <Trophy className="text-yellow-400 w-8 h-8 md:w-16 md:h-16" />
                                                </div>
                                            )}

                                        {/* Set Wins */}
                                        <div className="absolute top-4 md:top-12 right-4 md:right-12">
                                            <span className="text-4xl md:text-8xl font-bold text-white">
                                                {playerBSetWins}
                                            </span>
                                        </div>

                                        {/* Main Score */}
                                        <div className="text-6xl md:text-[12rem] font-bold text-white mb-12">
                                            {playerBPoints < 10 ? `0${playerBPoints}` : playerBPoints}
                                        </div>

                                        {/* Player Name */}
                                        <span className="text-2xl md:text-4xl font-bold text-white mb-12 px-2 text-center">
                                            {playerBName}
                                        </span>

                                        {/* Game Scores */}
                                        <div className="absolute bottom-16 md:bottom-32 left-4 md:left-12">
                                            <div className="space-y-2 md:space-y-4">
                                                {Array.from({ length: 3 }).map((_, index) => {
                                                    const currentSet = setsData[currentSetNumber - 1];
                                                    const game = currentSet?.games?.[index];
                                                    return (
                                                        <span
                                                            key={`gameB${index}`}
                                                            className="text-xl md:text-4xl text-white block font-semibold"
                                                        >
                                                            {game?.status === "COMPLETED"
                                                                ? game.playerBPoints
                                                                : index === currentGameInMatch - 1
                                                                    ? playerBPoints
                                                                    : "0"}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Decrement Button */}
                                        {!route?.params?.viewOnly && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!tapCooldown) decrementPlayerB();
                                                }}
                                                className="absolute bottom-4 md:bottom-12 right-4 md:right-12 bg-black/20 p-3 md:p-5 rounded-full hover:bg-black/30"
                                                disabled={tapCooldown}
                                            >
                                                <X className="text-white w-6 h-6 md:w-10 md:h-10" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Control Buttons */}
                                {!route?.params?.viewOnly && (
                                    <div className="absolute bottom-4 md:bottom-12 left-1/2 transform -translate-x-1/2 flex gap-8 z-10">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                submitRound();
                                            }}
                                            className="bg-orange-600 text-white px-6 py-3 rounded-full flex items-center gap-2 hover:bg-orange-700 text-xl"
                                            disabled={isButtonDisabled}
                                        >
                                            <Check className="w-6 h-6" />
                                            <span>End Game</span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                resetPoints();
                                            }}
                                            className="bg-gray-600 text-white px-6 py-3 rounded-full flex items-center gap-2 hover:bg-gray-700 text-xl"
                                            disabled={isButtonDisabled}
                                        >
                                            <RefreshCcw className="w-6 h-6" />
                                            <span>Reset</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                        ) : (
                            // Manual Scoreboard
                            <div className="max-w-2xl mx-auto p-6 bg-gray-900 rounded-lg">
                                <h2 className="text-2xl font-bold text-white text-center mb-8">
                                    Manual Scoreboard
                                </h2>

                                {/* Player A Row */}
                                <div className="flex items-center gap-4 mb-6">
                                    <span className="text-white text-lg font-medium w-32">{playerAName}</span>
                                    <div className="flex-1">
                                        <label className="text-gray-400 text-sm block mb-1">Points</label>
                                        <input
                                            type="number"
                                            value={teamAPoints}
                                            onChange={(e) => setTeamAPoints(parseInt(e.target.value) || 0)}
                                            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700"
                                            disabled={route?.params?.viewOnly || winner}
                                        />
                                    </div>
                                </div>

                                {/* Player B Row */}
                                <div className="flex items-center gap-4 mb-6">
                                    <span className="text-white text-lg font-medium w-32">{playerBName}</span>
                                    <div className="flex-1">
                                        <label className="text-gray-400 text-sm block mb-1">Points</label>
                                        <input
                                            type="number"
                                            value={teamBPoints}
                                            onChange={(e) => setTeamBPoints(parseInt(e.target.value) || 0)}
                                            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700"
                                            disabled={route?.params?.viewOnly || winner}
                                        />
                                    </div>
                                </div>

                                {/* Current Game Info */}
                                <div className="bg-gray-800 p-4 rounded-lg mb-6">
                                    <h3 className="text-white font-medium mb-2">Current Game</h3>
                                    <div className="text-gray-300 text-sm space-y-1">
                                        <p>Set: {sets.length + 1} of {parseInt(setCount)}</p>
                                        <p>Players: {playerAName} vs {playerBName}</p>
                                        <p>Status: {matchStatus || "IN_PROGRESS"}</p>
                                    </div>
                                </div>

                                {/* Saved Sets */}
                                {sets.length > 0 && (
                                    <div className="bg-gray-800 p-4 rounded-lg mb-6">
                                        <h3 className="text-white font-medium mb-2">Saved Sets</h3>
                                        <ul className="text-gray-300 text-sm space-y-1">
                                            {sets.map((set, index) => (
                                                <li key={index}>
                                                    Set {index + 1}: {set}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Control Buttons */}
                                <div className="flex justify-center gap-4 mt-8">
                                    <button
                                        onClick={saveEditedScores} // <-- will save this set
                                        disabled={route?.params?.viewOnly || winner}
                                        className="bg-green-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                                    >
                                        <Check className="w-5 h-5" />
                                        <span>Complete Set</span>
                                    </button>
                                    <button
                                        onClick={resetPoints}
                                        disabled={route?.params?.viewOnly || winner}
                                        className="bg-gray-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-gray-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                                    >
                                        <RefreshCcw className="w-5 h-5" />
                                        <span>Reset</span>
                                    </button>
                                </div>

                                {/* Final Submit Button */}
                                {sets.length === parseInt(setCount) && (
                                    <button
                                        onClick={submitMatch} // <-- will send all sets to backend
                                        className="mt-6 w-full bg-orange-500 text-white py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors"
                                    >
                                        <Check className="w-5 h-5" />
                                        <span>Submit Match</span>
                                    </button>
                                )}
                            </div>

                        )}
                    </>
                )}
            </div>
            {liveState && (
                <div className="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-lg z-10">
                    <div className="text-sm space-y-1">
                        <p>
                            Set {currentSetNumber} - Game {currentGameInMatch}
                        </p>
                        <p className="text-xs text-gray-300">
                            Overall: {teamASetWins}-{teamBSetWins}
                        </p>
                        {winner && (
                            <p className="text-yellow-400 font-bold">Winner: {winner}</p>
                        )}
                    </div>
                </div>
            )}
            {/* Bulk Score Upload Modal */}
            <BulkScoreUploadModal
                isOpen={showBulkUpload}
                onClose={() => setShowBulkUpload(false)}
                onSuccess={() => fetchMatches()}
                matches={(matchesData[activeGroupId] || []).filter(m => m.status !== 'COMPLETED')}
                tournamentId={tournamentId}
                groupId={activeGroupId}
                matchType="player"
                maxSets={setCount || 5}
                setsToWin={Math.ceil((setCount || 5) / 2)}
                title="Bulk Score Upload — Group Stage"
            />
        </div>
    );
};

export default MGroupStageMatchesPage;
