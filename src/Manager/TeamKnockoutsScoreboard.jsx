import React, { useState, useEffect } from "react";
import { X, Check, RefreshCcw, Edit, Trophy } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Switch } from "@mui/material";

const TeamKnockoutsScoreboard = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentGame, setCurrentGame] = useState(0);
  const [teamAPoints, setTeamAPoints] = useState(0);
  const [teamBPoints, setTeamBPoints] = useState(0);
  const [winner, setWinner] = useState(null);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [message, setMessage] = useState("");
  const [matchFormat, setMatchFormat] = useState(null);
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

  const location = useLocation();
  const route = {
    params: location.state || {},
  };

  const {
    matchId,
    teamAName,
    teamBName,
    matchType,
    setCount,
    team1Captain,
    team1Players,
    team2Captain,
    team2Players,
  } = route.params;


  const [showSubModal, setShowSubModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  // NEW: Backend integration state
  const [liveState, setLiveState] = useState(null);
  const [currentSetNumber, setCurrentSetNumber] = useState(1);
  const [setsData, setSetsData] = useState([]);

  // Scoring rules from tournament (via match.gameRules)
  const [gameRules, setGameRules] = useState({
    pointsToWinGame: 11,
    marginToWin: 2,
    deuceRule: true,
    maxPointsCap: null,
  });

  // Manual scoreboard state for multiple games (Dynamic based on format)
  const [manualGames, setManualGames] = useState([]);

  // Initialize manual games inputs based on setCount from route params
  useEffect(() => {
    const totalSets = parseInt(setCount) || 5;
    setManualGames(Array(totalSets).fill().map(() => ({ a: "", b: "" })));
  }, [setCount]);

  const handleManualGameChange = (index, player, value) => {
    const newManualGames = [...manualGames];
    newManualGames[index][player] = value;
    setManualGames(newManualGames);
  };

  const submitBulkManualScores = async () => {
    if (winner || isButtonDisabled) return;

    // Validate and prepare games to submit
    const gamesPayload = [];

    for (let i = 0; i < manualGames.length; i++) {
      const game = manualGames[i];
      // Skip empty inputs
      if (game.a === "" || game.b === "") continue;

      const scoreA = parseInt(game.a);
      const scoreB = parseInt(game.b);

      if (isNaN(scoreA) || isNaN(scoreB)) continue;

      // Skip unplayed games (0-0)
      if (scoreA === 0 && scoreB === 0) continue;

      // Basic validation
      if (scoreA === scoreB) {
        showModal("Validation Error", `Game ${i + 1} cannot end in a draw.`);
        return;
      }

      gamesPayload.push({
        gameNumber: i + 1, // Explicitly use index + 1 as game number
        scoreA,
        scoreB
      });
    }

    if (gamesPayload.length === 0) {
      showModal("Validation Error", "Please enter at least one game score.");
      return;
    }

    setIsButtonDisabled(true);
    setMessage("Submitting all game scores...");

    try {
      for (let i = 0; i < gamesPayload.length; i++) {
        const gameData = gamesPayload[i];

        setMessage(`Submitting game ${gameData.gameNumber}...`);

        const token = localStorage.getItem("token");
        const response = await fetch(
          `/api/tournaments/team-knockout/matches/${matchId}/complete-game`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              setNumber: currentSetNumber,
              gameNumber: gameData.gameNumber,
              finalHomePoints: gameData.scoreA,
              finalAwayPoints: gameData.scoreB,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to submit game ${gameData.gameNumber}`);
        }

        const data = await response.json();

        // Update local state briefly
        if (data.success) {
          // We don't rely on currentGameInMatch for the loop anymore, 
          // but we update it for the UI state
          if (data.match.liveState) {
            setCurrentSetNumber(data.match.liveState.currentSetNumber);
            setCurrentGameInMatch(data.match.liveState.currentGameNumber);
          }
        }

        // Small delay to ensure backend processes consistent state
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Final refresh
      await initializeMatch();

      // Clear inputs but keep correct format count
      const totalSets = parseInt(setCount) || 5;
      setManualGames(Array(totalSets).fill().map(() => ({ a: "", b: "" })));

      showModal("Success", "All game scores submitted successfully!");

    } catch (error) {
      console.error("Bulk submission error:", error);
      showModal("Error", error.message || "Failed to submit some scores.");
      await initializeMatch();
    } finally {
      setIsButtonDisabled(false);
      setMessage("");
    }
  };


  useEffect(() => {
    // Ensure team names are consistent
  }, [teamAName, teamBName]);

  useEffect(() => {
    setupMatchFormat();
  }, []);

  // Config-driven team formats (e.g. Rapid Rallies — 5 rubbers, dynamic doubles)
  // aren't in the legacy A/B/C switch, so setupMatchFormat() leaves matchFormat
  // null. Build the rubber sequence from the real server sets, which carry the
  // authoritative singles + doubles player names. Only fires when matchFormat is
  // null → never touches legacy formats (they get a non-null format on mount).
  useEffect(() => {
    if (matchFormat || !Array.isArray(setsData) || setsData.length === 0) return;
    const sequence = setsData.map((s) => {
      const awayPartner = s.awayPlayerB || s.awayPlayerZ || null;
      const isDoubles =
        String(s.type || "").toLowerCase().includes("doubles") ||
        !!s.homePlayerB ||
        !!awayPartner;
      if (isDoubles) {
        return {
          type: s.type || "Doubles",
          home: [s.homePlayer, s.homePlayerB].filter(Boolean).join(" & ") || "Home",
          away: [s.awayPlayer, awayPartner].filter(Boolean).join(" & ") || "Away",
          players: {
            home: s.homePlayer,
            away: s.awayPlayer,
            home1: s.homePlayer,
            home2: s.homePlayerB,
            away1: s.awayPlayer,
            away2: awayPartner,
          },
        };
      }
      return {
        type: s.type || "Singles",
        home: s.homePlayer || "Home",
        away: s.awayPlayer || "Away",
        players: { home: s.homePlayer, away: s.awayPlayer },
      };
    });
    setMatchFormat({ type: matchType || "Team", sequence });
  }, [matchFormat, setsData, matchType]);

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

  // NEW: Initialize match with proper backend integration
  const initializeMatch = async () => {
    try {
      setLoading(true);

      // Get current live state from backend
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/tournaments/team-knockout/matches/${matchId}/live-state`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch match state");
      }

      const data = await response.json();

      if (data.success) {
        const matchData = data.match;

        // Load game rules from match (derived from tournament sportRules)
        if (matchData.gameRules) {
          setGameRules({
            pointsToWinGame: matchData.gameRules.pointsToWinGame || null,
            marginToWin: matchData.gameRules.marginToWin ?? null,
            deuceRule: matchData.gameRules.deuceRule !== undefined ? matchData.gameRules.deuceRule : false,
            maxPointsCap: matchData.gameRules.maxPointsCap || null,
          });
        }

        setLiveState(matchData.liveState);
        setSetsData(matchData.sets || []);
        setTeamASetWins(matchData.setsWon?.home || 0);
        setTeamBSetWins(matchData.setsWon?.away || 0);
        setCurrentSetNumber(matchData.liveState?.currentSetNumber || 1);
        setCurrentGameInMatch(matchData.liveState?.currentGameNumber || 1);
        setTeamAPoints(matchData.liveState?.currentPoints?.home || 0);
        setTeamBPoints(matchData.liveState?.currentPoints?.away || 0);
        setMatchStatus(matchData.status);

        if (matchData.status === "COMPLETED" && matchData.winnerId) {
          let winnerTeamName;

          // Handle winnerId as object (full team data)
          if (
            typeof matchData.winnerId === "object" &&
            matchData.winnerId.teamName
          ) {
            winnerTeamName = matchData.winnerId.teamName;
          }
          // Handle winnerId as string ID
          else if (typeof matchData.winnerId === "string") {
            if (matchData.winnerId === matchData.team1Id._id.toString()) {
              winnerTeamName = matchData.team1Id.teamName;
            } else if (
              matchData.winnerId === matchData.team2Id._id.toString()
            ) {
              winnerTeamName = matchData.team2Id.teamName;
            }
          }
          // Fallback: use matchWinner field
          else {
            if (matchData.matchWinner === "home") {
              winnerTeamName = matchData.team1Id.teamName;
            } else if (matchData.matchWinner === "away") {
              winnerTeamName = matchData.team2Id.teamName;
            } else {
              // Ultimate fallback: use sets won
              winnerTeamName =
                (matchData.setsWon?.home || 0) > (matchData.setsWon?.away || 0)
                  ? matchData.team1Id.teamName
                  : matchData.team2Id.teamName;
            }
          }

          setWinner(winnerTeamName);
          setIsMatchSubmitted(true);
        }

        // Process historical match data for display
        if (matchData.sets && matchData.sets.length > 0) {
          const processedMatches = matchData.sets.map((set, index) => ({
            setNumber: set.setNumber,
            score: `${set.gamesWon.home}-${set.gamesWon.away}`,
            games: set.games || [],
            roundNumber: index + 1,
            status: set.status,
          }));
          setMatches(processedMatches);
        }
      }
    } catch (error) {
      console.error("Error initializing match:", error);
      showModal("Error", "Failed to load match data");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get correct team name
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

  const setupMatchFormat = () => {
    // Extract tournament type and set count from route parameters
    const type = matchType.includes("Single") ? "Single" : "Double";
    const sets = parseInt(setCount);

    // Use player names from route params
    const teamAPlayers = {
      captain:
        team1Captain ||
        (team1Players && team1Players.length > 0
          ? team1Players[0]
          : "Captain A"),
      player1: team1Players?.[0] || "Player B",
      player2: team1Players?.[1] || "Player C",
    };

    const teamBPlayers = {
      captain:
        team2Captain ||
        (team2Players && team2Players.length > 0
          ? team2Players[0]
          : "Captain X"),
      player1: team2Players?.[0] || "Player Y",
      player2: team2Players?.[1] || "Player Z",
    };

    let format;

    switch (true) {
      case type === "Single" && sets === 3:
        format = {
          type: "Singles3",
          sequence: [
            {
              type: "Singles A-X",
              home: `${teamAPlayers.captain} (A)`,
              away: `${teamBPlayers.captain} (X)`,
              players: {
                home: teamAPlayers.captain,
                away: teamBPlayers.captain,
              },
            },
            {
              type: "Singles B-Y",
              home: `${teamAPlayers.player1} (B)`,
              away: `${teamBPlayers.player1} (Y)`,
              players: {
                home: teamAPlayers.player1,
                away: teamBPlayers.player1,
              },
            },
            {
              type: "Singles C-Z",
              home: `${teamAPlayers.player2} (C)`,
              away: `${teamBPlayers.player2} (Z)`,
              players: {
                home: teamAPlayers.player2,
                away: teamBPlayers.player2,
              },
            },
          ],
        };
        break;

      case type === "Single" && sets === 5:
        format = {
          type: "Singles5",
          sequence: [
            {
              type: "Singles A-X",
              home: `${teamAPlayers.captain} (A)`,
              away: `${teamBPlayers.captain} (X)`,
              players: {
                home: teamAPlayers.captain,
                away: teamBPlayers.captain,
              },
            },
            {
              type: "Singles B-Y",
              home: `${teamAPlayers.player1} (B)`,
              away: `${teamBPlayers.player1} (Y)`,
              players: {
                home: teamAPlayers.player1,
                away: teamBPlayers.player1,
              },
            },
            {
              type: "Singles C-Z",
              home: `${teamAPlayers.player2} (C)`,
              away: `${teamBPlayers.player2} (Z)`,
              players: {
                home: teamAPlayers.player2,
                away: teamBPlayers.player2,
              },
            },
            {
              type: "Singles A-Y",
              home: `${teamAPlayers.captain} (A)`,
              away: `${teamBPlayers.player1} (Y)`,
              players: {
                home: teamAPlayers.captain,
                away: teamBPlayers.player1,
              },
            },
            {
              type: "Singles B-X",
              home: `${teamAPlayers.player1} (B)`,
              away: `${teamBPlayers.captain} (X)`,
              players: {
                home: teamAPlayers.player1,
                away: teamBPlayers.captain,
              },
            },
          ],
        };
        break;

      case type === "Double" && sets === 3:
        format = {
          type: "Doubles3",
          sequence: [
            {
              type: "Singles A-X",
              home: `${teamAPlayers.captain} (A)`,
              away: `${teamBPlayers.captain} (X)`,
              players: {
                home: teamAPlayers.captain,
                away: teamBPlayers.captain,
              },
            },
            {
              type: "Doubles BC-XZ",
              home: `${teamAPlayers.player1} & ${teamAPlayers.player2} (B&C)`,
              away: `${teamBPlayers.captain} & ${teamBPlayers.player2} (X&Z)`,
              players: {
                home1: teamAPlayers.player1,
                home2: teamAPlayers.player2,
                away1: teamBPlayers.captain,
                away2: teamBPlayers.player2,
              },
            },
            {
              type: "Singles A-Y",
              home: `${teamAPlayers.captain} (A)`,
              away: `${teamBPlayers.player1} (Y)`,
              players: {
                home: teamAPlayers.captain,
                away: teamBPlayers.player1,
              },
            },
          ],
        };
        break;

      case type === "Double" && sets === 5:
        format = {
          type: "Doubles5",
          sequence: [
            {
              type: "Singles A-X",
              home: `${teamAPlayers.captain} (A)`,
              away: `${teamBPlayers.captain} (X)`,
              players: {
                home: teamAPlayers.captain,
                away: teamBPlayers.captain,
              },
            },
            {
              type: "Singles B-Y",
              home: `${teamAPlayers.player1} (B)`,
              away: `${teamBPlayers.player1} (Y)`,
              players: {
                home: teamAPlayers.player1,
                away: teamBPlayers.player1,
              },
            },
            {
              type: "Doubles BC-XZ",
              home: `${teamAPlayers.player1} & ${teamAPlayers.player2} (B&C)`,
              away: `${teamBPlayers.captain} & ${teamBPlayers.player2} (X&Z)`,
              players: {
                home1: teamAPlayers.player1,
                home2: teamAPlayers.player2,
                away1: teamBPlayers.captain,
                away2: teamBPlayers.player2,
              },
            },
            {
              type: "Singles A-Y",
              home: `${teamAPlayers.captain} (A)`,
              away: `${teamBPlayers.player1} (Y)`,
              players: {
                home: teamAPlayers.captain,
                away: teamBPlayers.player1,
              },
            },
            {
              type: "Singles C-Z",
              home: `${teamAPlayers.player2} (C)`,
              away: `${teamBPlayers.player2} (Z)`,
              players: {
                home: teamAPlayers.player2,
                away: teamBPlayers.player2,
              },
            },
          ],
        };
        break;

      default:
        console.error("Unknown tournament configuration", { type, sets });
        format = null;
    }

    setMatchFormat(format);
    if (format && format.sequence[0]) {
      setCurrentPlayers(format.sequence[0]);
    }
  };

  // NEW: Use proper backend API for live score updates
  const updateLiveScore = async (homePoints, awayPoints) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/tournaments/team-knockout/matches/${matchId}/live-score`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            homePoints,
            awayPoints,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update live score");
      }

      const data = await response.json();
    } catch (error) {
      console.error("Error updating live score:", error);
      throw error;
    }
  };

  const getTeamAWins = () => {
    // Get wins from current set's games
    const currentSet = setsData[currentSetNumber - 1];
    if (!currentSet || !currentSet.games) return 0;

    return currentSet.games.filter(
      (game) => game.status === "COMPLETED" && game.winner === "home"
    ).length;
  };

  const getTeamBWins = () => {
    // Get wins from current set's games
    const currentSet = setsData[currentSetNumber - 1];
    if (!currentSet || !currentSet.games) return 0;

    return currentSet.games.filter(
      (game) => game.status === "COMPLETED" && game.winner === "away"
    ).length;
  };

  const incrementTeamA = async () => {
    if (route?.params?.viewOnly || winner || isButtonDisabled || tapCooldown)
      return;

    setTapCooldown(true);
    setIsButtonDisabled(true);
    setMessage("Please wait...");

    try {
      const newScore = teamAPoints + 1;
      setTeamAPoints(newScore);
      await updateLiveScore(newScore, teamBPoints);
    } catch (error) {
      console.error("Error incrementing Team A:", error);
      setTeamAPoints(teamAPoints);
      showModal("Error", "Failed to update score");
    } finally {
      setTimeout(() => {
        setTapCooldown(false);
        setIsButtonDisabled(false);
        setMessage("");
      }, 800);
    }
  };

  const incrementTeamB = async () => {
    if (route?.params?.viewOnly || winner || isButtonDisabled || tapCooldown)
      return;

    setTapCooldown(true);
    setIsButtonDisabled(true);
    setMessage("Please wait...");

    try {
      const newScore = teamBPoints + 1;
      setTeamBPoints(newScore);
      await updateLiveScore(teamAPoints, newScore);
    } catch (error) {
      console.error("Error incrementing Team B:", error);
      setTeamBPoints(teamBPoints);
      showModal("Error", "Failed to update score");
    } finally {
      setTimeout(() => {
        setTapCooldown(false);
        setIsButtonDisabled(false);
        setMessage("");
      }, 800);
    }
  };

  const decrementTeamA = async () => {
    if (
      route?.params?.viewOnly ||
      winner ||
      teamAPoints === 0 ||
      isButtonDisabled ||
      tapCooldown
    )
      return;

    setTapCooldown(true);
    setIsButtonDisabled(true);
    setMessage("Please wait...");

    try {
      const newScore = teamAPoints - 1;
      setTeamAPoints(newScore);
      await updateLiveScore(newScore, teamBPoints);
    } catch (error) {
      console.error("Error decrementing Team A:", error);
      setTeamAPoints(teamAPoints);
      showModal("Error", "Failed to update score");
    } finally {
      setTimeout(() => {
        setTapCooldown(false);
        setIsButtonDisabled(false);
        setMessage("");
      }, 800);
    }
  };

  const decrementTeamB = async () => {
    if (
      route?.params?.viewOnly ||
      winner ||
      teamBPoints === 0 ||
      isButtonDisabled ||
      tapCooldown
    )
      return;

    setTapCooldown(true);
    setIsButtonDisabled(true);
    setMessage("Please wait...");

    try {
      const newScore = teamBPoints - 1;
      setTeamBPoints(newScore);
      await updateLiveScore(teamAPoints, newScore);
    } catch (error) {
      console.error("Error decrementing Team B:", error);
      setTeamBPoints(teamBPoints);
      showModal("Error", "Failed to update score");
    } finally {
      setTimeout(() => {
        setTapCooldown(false);
        setIsButtonDisabled(false);
        setMessage("");
      }, 800);
    }
  };

  // NEW: Use proper backend API for game completion
  const submitRound = async () => {
    if (winner || isButtonDisabled) {
      showModal("Match Complete", "Winner has already been declared!");
      return;
    }

    // Validate using game rules from tournament sportRules
    const { pointsToWinGame, marginToWin, deuceRule, maxPointsCap } = gameRules;
    const maxPts = Math.max(teamAPoints, teamBPoints);
    const ptsDiff = Math.abs(teamAPoints - teamBPoints);

    let isGameWon = false;
    if (maxPointsCap && maxPts >= maxPointsCap) {
      isGameWon = ptsDiff > 0;
    } else if (maxPts >= pointsToWinGame) {
      isGameWon = deuceRule ? ptsDiff >= marginToWin : true;
    }

    if (!isGameWon) {
      showModal(
        "Invalid Score",
        `A team needs to reach ${pointsToWinGame} points${deuceRule ? ` with a ${marginToWin}-point lead` : ""} to win the game.`
      );
      return;
    }

    setIsButtonDisabled(true);
    setMessage("Completing game...");

    try {
      // Use the proper backend API for game completion
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/tournaments/team-knockout/matches/${matchId}/complete-game`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            setNumber: currentSetNumber,
            gameNumber: currentGameInMatch,
            finalHomePoints: teamAPoints,
            finalAwayPoints: teamBPoints,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to complete game");
      }

      const data = await response.json();

      if (data.success) {
        // Update local state based on backend response
        const updatedMatch = data.match;

        // Update live state
        setLiveState(updatedMatch.liveState);
        setCurrentSetNumber(updatedMatch.liveState.currentSetNumber);
        setCurrentGameInMatch(updatedMatch.liveState.currentGameNumber);

        // Update sets data
        setSetsData(updatedMatch.sets);

        // Update set wins
        setTeamASetWins(updatedMatch.setsWon.home);
        setTeamBSetWins(updatedMatch.setsWon.away);

        // Reset current points for next game
        setTeamAPoints(updatedMatch.liveState.currentPoints.home);
        setTeamBPoints(updatedMatch.liveState.currentPoints.away);

        // Check if match is completed
        if (updatedMatch.status === "COMPLETED") {
          setMatchStatus("COMPLETED");
          setIsMatchSubmitted(true);

          let winnerTeamName;

          // Handle winnerId as object (full team data)
          if (
            typeof updatedMatch.winnerId === "object" &&
            updatedMatch.winnerId.teamName
          ) {
            winnerTeamName = updatedMatch.winnerId.teamName;
          }
          // Use matchWinner field as primary source
          else if (updatedMatch.matchWinner === "home") {
            winnerTeamName = updatedMatch.team1Id.teamName || teamAName;
          } else if (updatedMatch.matchWinner === "away") {
            winnerTeamName = updatedMatch.team2Id.teamName || teamBName;
          }
          // Fallback: use sets won
          else {
            winnerTeamName =
              (updatedMatch.setsWon.home || 0) >
                (updatedMatch.setsWon.away || 0)
                ? updatedMatch.team1Id.teamName || teamAName
                : updatedMatch.team2Id.teamName || teamBName;
          }

          setWinner(winnerTeamName);
          showModal("Match Complete", `${winnerTeamName} wins the match!`);
        } else {
          // Update current players for next game/set
          if (
            matchFormat &&
            matchFormat.sequence[updatedMatch.liveState.currentSetNumber - 1]
          ) {
            setCurrentPlayers(
              matchFormat.sequence[updatedMatch.liveState.currentSetNumber - 1]
            );
            setCurrentGame(updatedMatch.liveState.currentSetNumber - 1);
          }

          showModal(
            "Game Complete",
            `Game completed! Moving to game ${updatedMatch.liveState.currentGameNumber} of set ${updatedMatch.liveState.currentSetNumber}`
          );
        }

        // Update matches display data
        if (updatedMatch.sets && updatedMatch.sets.length > 0) {
          const processedMatches = updatedMatch.sets.map((set, index) => ({
            setNumber: set.setNumber,
            score: `${set.gamesWon.home}-${set.gamesWon.away}`,
            games: set.games || [],
            roundNumber: index + 1,
            status: set.status,
          }));
          setMatches(processedMatches);
        }
      }
    } catch (error) {
      console.error("Error completing game:", error);
      showModal("Error", "Failed to complete game. Please try again.");
    } finally {
      setIsButtonDisabled(false);
      setMessage("");
    }
  };

  // NEW: Use proper backend API for player substitution
  const handleSubstitution = async (team, currentPlayer, substitute) => {
    try {

      // Get team ID based on team type
      const teamId = team === "team1" ? "home_team_id" : "away_team_id"; // You'll need actual team IDs

      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/tournaments/team-knockout/teams/${teamId}/substitute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            outgoingPlayer: currentPlayer,
            incomingPlayer: substitute,
            position: "A", // You'll need to determine the correct position
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to make substitution");
      }

      const data = await response.json();

      // Refresh match data
      await initializeMatch();

      showModal("Success", "Player substitution completed successfully");
    } catch (error) {
      console.error("Substitution error:", error);
      showModal("Error", error.message || "Failed to make substitution");
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

  // Save edited scores function for edit view
  const saveEditedScores = async () => {
    if (selectedGame === null) return;

    // Check maximum score
    if (teamAPoints >= 20 || teamBPoints >= 20) {
      showModal("Invalid Score", "Maximum score is 19 points");
      return;
    }

    // Minimum score check
    if (teamAPoints < 11 && teamBPoints < 11) {
      showModal("Invalid Score", "A team needs to reach at least 11 points");
      return;
    }

    // Check if the scores are close (within 1 point of each other)
    const pointDiff = Math.abs(teamAPoints - teamBPoints);
    const scoresAreClose = pointDiff === 1;

    // If scores are close (like 11-10), enforce the 2-point rule
    if (scoresAreClose) {
      showModal(
        "Invalid Score",
        "When scores are within 1 point, there must be a 2-point difference to win"
      );
      return;
    }

    // Ensure winning team has more points
    const isValidScore =
      (teamAPoints >= 11 && teamAPoints > teamBPoints) ||
      (teamBPoints >= 11 && teamBPoints > teamAPoints);

    if (!isValidScore) {
      showModal(
        "Invalid Score",
        "A team needs to reach 11 points and have more points than the opponent"
      );
      return;
    }

    // Continue with updating the score
    const [setIndex, gameIndex] = selectedGame.split("-").map(Number);
    const updatedMatches = [...matches];

    if (updatedMatches[setIndex]?.games) {
      updatedMatches[setIndex].games[gameIndex] = {
        ...updatedMatches[setIndex].games[gameIndex],
        score: `${teamAPoints}-${teamBPoints}`,
      };

      // Calculate wins for the set
      let teamASetWins = 0;
      let teamBSetWins = 0;
      updatedMatches[setIndex].games.forEach((game) => {
        const [scoreA, scoreB] = game.score.split("-").map(Number);
        if (scoreA > scoreB) teamASetWins++;
        if (scoreB > scoreA) teamBSetWins++;
      });

      // Update set score
      updatedMatches[setIndex].score = `${teamASetWins}-${teamBSetWins}`;

      // Update match state and backend
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `/api/tournaments/team-knockout/matches/${matchId}/live-score`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              matches: updatedMatches,
              teamASetWins,
              teamBSetWins,
            }),
          }
        );

        if (response.ok) {
          setMatches(updatedMatches);
          setRefreshTrigger((prev) => prev + 1);
          setSelectedGame(null);
          showModal("Success", "Score updated successfully");
        } else {
          throw new Error("Failed to update scores");
        }
      } catch (error) {
        console.error("Error updating scores:", error);
        showModal("Error", "Failed to update scores");
      }
    }
  };

  // Helper function to show modal
  const showModal = (title, message) => {
    setModalTitle(title);
    setModalMessage(message);
    setIsModalOpen(true);
  };

  // Helper function to close modal
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Enhanced Substitution Modal Component
  const SubstitutionModal = ({
    visible,
    onClose,
    selectedTeam,
    matchId,
    currentGame,
    matchFormat,
    onSubstitute,
  }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [teamData, setTeamData] = useState(null);
    const [selectedPlayer, setSelectedPlayer] = useState("");
    const [selectedSubstitute, setSelectedSubstitute] = useState("");
    const [matchDetails, setMatchDetails] = useState(null);
    const [substitutionHistory, setSubstitutionHistory] = useState([]);
    const [localMatchFormat, setLocalMatchFormat] = useState(null);

    useEffect(() => {
      if (!visible || !matchId) return;

      const fetchTeamData = async () => {
        try {
          setLoading(true);
          // Fetch team data and substitution history
          const token = localStorage.getItem("token");
          const response = await fetch(
            `/api/tournaments/team-knockout/matches/${matchId}/live-state`,
            {
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              const relevantTeam =
                selectedTeam === "team1"
                  ? data.match.team1Id
                  : data.match.team2Id;
              setTeamData(relevantTeam);
              setMatchDetails(data.match);
            }
          }
        } catch (err) {
          setError("Failed to load team data");
        } finally {
          setLoading(false);
        }
      };

      fetchTeamData();
    }, [visible, matchId, selectedTeam]);

    const getCurrentMatchInfo = () => {
      if (!matchFormat?.sequence) return null;
      const currentMatch = matchFormat.sequence[currentGame];
      return currentMatch || null;
    };

    const getCurrentPlayers = () => {
      const currentMatch = getCurrentMatchInfo();
      if (!currentMatch) return [];
      return selectedTeam === "team1"
        ? [currentMatch.players.home]
        : [currentMatch.players.away];
    };

    const getAvailableSubstitutes = () => {
      if (!teamData) return [];

      const currentPlayers = getCurrentPlayers();
      const allSubstitutes = teamData.substitutes || [];

      return allSubstitutes
        .filter((sub) => !currentPlayers.includes(sub))
        .map((name) => ({
          name,
          isSubstituted: false,
        }));
    };

    const handleSubstitutionSubmit = async () => {
      if (!selectedPlayer || !selectedSubstitute) {
        setError("Please select both players for substitution");
        return;
      }

      try {
        setLoading(true);
        await onSubstitute(selectedTeam, selectedPlayer, selectedSubstitute);
        onClose();
      } catch (err) {
        setError("Failed to complete substitution. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (!visible) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-[#181A22] rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              Player Substitution
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-6 py-3 bg-red-500/10 border-l-4 border-red-500">
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Content */}
          <div
            className="p-6 overflow-y-auto"
            style={{ maxHeight: "calc(90vh - 150px)" }}
          >
            {/* Current Match Info */}
            <div className="mb-6 p-4 bg-white/[0.03] rounded-lg">
              <h3 className="font-medium text-white mb-2">
                Current Match Information
              </h3>
              {getCurrentMatchInfo() && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-300">
                    Match Type: {getCurrentMatchInfo().type}
                  </p>
                  <p className="text-sm text-gray-300">
                    Current Game: {currentGame + 1} of{" "}
                    {matchFormat.sequence.length}
                  </p>
                  <p className="text-sm text-gray-300">
                    Players:{" "}
                    {selectedTeam === "team1"
                      ? getCurrentMatchInfo().home
                      : getCurrentMatchInfo().away}
                  </p>
                </div>
              )}
            </div>

            {/* Player Selection */}
            <div className="space-y-6">
              {/* Current Player Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Current Player
                </label>
                <select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                  disabled={loading}
                  className="w-full border border-white/[0.12] rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select player to substitute</option>
                  {getCurrentPlayers().map((player) => (
                    <option key={player} value={player}>
                      {player}
                    </option>
                  ))}
                </select>
              </div>

              {/* Substitute Player Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Substitute Player
                </label>
                <select
                  value={selectedSubstitute}
                  onChange={(e) => setSelectedSubstitute(e.target.value)}
                  disabled={loading || !selectedPlayer}
                  className="w-full border border-white/[0.12] rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select substitute player</option>
                  {getAvailableSubstitutes().map((player) => (
                    <option
                      key={player.name}
                      value={player.name}
                      disabled={player.isSubstituted}
                      className={player.isSubstituted ? "text-gray-400" : ""}
                    >
                      {player.name}
                      {player.isSubstituted ? " (Substituted)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Substitution History */}
              {substitutionHistory.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium text-white mb-3">
                    Recent Substitutions
                  </h3>
                  <div className="space-y-2">
                    {substitutionHistory
                      .filter((sub) => sub.teamType === selectedTeam)
                      .slice(-3)
                      .map((sub, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 bg-white/[0.03] rounded"
                        >
                          <span className="text-sm">
                            {sub.outgoingPlayer} → {sub.incomingPlayer}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(sub.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-white/[0.03] flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-white/[0.12] rounded-md text-gray-200 hover:bg-white/[0.03] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubstitutionSubmit}
              disabled={loading || !selectedPlayer || !selectedSubstitute}
              className={`px-4 py-2 rounded-md text-white transition-colors ${loading || !selectedPlayer || !selectedSubstitute
                ? "bg-orange-400 cursor-not-allowed"
                : "bg-orange-500 hover:bg-orange-600"
                }`}
            >
              {loading ? "Processing..." : "Confirm Substitution"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleOpenSubModal = (teamType) => {
    setSelectedTeam(teamType);
    setShowSubModal(true);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading match data...</div>
      </div>
    );
  }

  return (
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
              {/* Main container - switches to column on mobile */}
              <div className="flex flex-col md:flex-row h-screen">
                {/* Team A Side */}
                <div
                  className={`w-full md:w-1/2 bg-orange-500 relative flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-black py-6 md:py-0 transition-colors ${tapCooldown
                    ? "opacity-50 cursor-not-allowed"
                    : "active:bg-orange-500"
                    }`}
                  onClick={() =>
                    !route?.params?.viewOnly && !tapCooldown && incrementTeamA()
                  }
                >
                  {/* Trophy */}
                  {(winner === teamAName ||
                    winner === liveState?.team1Name ||
                    (route?.params?.viewOnly &&
                      matchStatus === "COMPLETED" &&
                      (winner === teamAName ||
                        teamASetWins > teamBSetWins))) && (
                      <div className="absolute top-4 md:top-12 right-4 md:right-12">
                        <Trophy className="text-yellow-400 w-8 h-8 md:w-16 md:h-16" />
                      </div>
                    )}

                  {/* Set Wins */}
                  <div className="absolute top-4 md:top-12 left-4 md:left-12">
                    <span className="text-4xl md:text-8xl font-bold text-white">
                      {teamASetWins}
                    </span>
                  </div>

                  {/* Main Score */}
                  <div className="text-6xl md:text-[12rem] font-bold text-white mb-4 md:mb-12">
                    {teamAPoints < 10 ? `0${teamAPoints}` : teamAPoints}
                  </div>

                  {/* Team Name */}
                  <span className="text-2xl md:text-4xl font-bold text-white mb-4 md:mb-12 px-2 text-center">
                    {route?.params?.viewOnly ? teamAName : currentPlayers.home}
                  </span>

                  {/* Substitute Button */}
                  {!route?.params?.viewOnly && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSubModal("team1");
                      }}
                      className="bg-green-700 hover:bg-green-800 text-white px-6 md:px-10 py-2 md:py-4 rounded-full text-base md:text-xl w-auto"
                    >
                      Substitute Team 1
                    </button>
                  )}

                  {/* Game Scores */}
                  <div className="absolute bottom-16 md:bottom-32 right-4 md:right-12">
                    <div className="space-y-2 md:space-y-4">
                      {Array.from({
                        length: matchFormat?.type.includes("5") ? 5 : 3,
                      }).map((_, index) => {
                        const currentSet = setsData[currentSetNumber - 1];
                        const game = currentSet?.games?.[index];
                        return (
                          <span
                            key={`game${index}`}
                            className="text-xl md:text-4xl text-white block text-right font-semibold"
                          >
                            {game?.status === "COMPLETED"
                              ? game.homePoints
                              : index === currentGameInMatch - 1
                                ? teamAPoints
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
                        if (!tapCooldown) decrementTeamA();
                      }}
                      className="absolute bottom-4 md:bottom-12 left-4 md:left-12 bg-black/20 p-3 md:p-5 rounded-full hover:bg-black/30 w-auto"
                      disabled={tapCooldown}
                    >
                      <X className="text-white w-6 h-6 md:w-10 md:h-10" />
                    </button>
                  )}
                </div>

                {/* Team B Side */}
                <div
                  className={`w-full md:w-1/2 bg-red-500 relative flex flex-col items-center justify-center py-6 md:py-0 transition-colors ${tapCooldown
                    ? "opacity-50 cursor-not-allowed"
                    : "active:bg-red-600"
                    }`}
                  onClick={() =>
                    !route?.params?.viewOnly && !tapCooldown && incrementTeamB()
                  }
                >
                  {/* Trophy */}
                  {(winner === teamBName ||
                    winner === liveState?.team2Name ||
                    (route?.params?.viewOnly &&
                      matchStatus === "COMPLETED" &&
                      (winner === teamBName ||
                        teamBSetWins > teamASetWins))) && (
                      <div className="absolute top-4 md:top-12 left-4 md:left-12">
                        <Trophy className="text-yellow-400 w-8 h-8 md:w-16 md:h-16" />
                      </div>
                    )}

                  {/* Set Wins */}
                  <div className="absolute top-4 md:top-12 right-4 md:right-12">
                    <span className="text-4xl md:text-8xl font-bold text-white">
                      {teamBSetWins}
                    </span>
                  </div>

                  {/* Main Score */}
                  <div className="text-6xl md:text-[12rem] font-bold text-white mb-4 md:mb-12">
                    {teamBPoints < 10 ? `0${teamBPoints}` : teamBPoints}
                  </div>

                  {/* Team Name */}
                  <span className="text-2xl md:text-4xl font-bold text-white mb-4 md:mb-12 px-2 text-center">
                    {route?.params?.viewOnly ? teamBName : currentPlayers.away}
                  </span>

                  {/* Substitute Button */}
                  {!route?.params?.viewOnly && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSubModal("team2");
                      }}
                      className="bg-green-700 hover:bg-green-800 text-white px-6 md:px-10 py-2 md:py-4 rounded-full text-base md:text-xl w-auto"
                    >
                      Substitute Team 2
                    </button>
                  )}

                  {/* Game Scores */}
                  <div className="absolute bottom-16 md:bottom-32 left-4 md:left-12">
                    <div className="space-y-2 md:space-y-4">
                      {Array.from({
                        length: matchFormat?.type.includes("5") ? 5 : 3,
                      }).map((_, index) => {
                        const currentSet = setsData[currentSetNumber - 1];
                        const game = currentSet?.games?.[index];
                        return (
                          <span
                            key={`game${index}`}
                            className="text-xl md:text-4xl text-white block font-semibold"
                          >
                            {game?.status === "COMPLETED"
                              ? game.awayPoints
                              : index === currentGameInMatch - 1
                                ? teamBPoints
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
                        if (!tapCooldown) decrementTeamB();
                      }}
                      className="absolute bottom-4 md:bottom-12 right-4 md:right-12 bg-black/20 p-3 md:p-5 rounded-full hover:bg-black/30 w-auto"
                      disabled={tapCooldown}
                    >
                      <X className="text-white w-6 h-6 md:w-10 md:h-10" />
                    </button>
                  )}
                </div>

                {/* Instructions for tap/click */}
                {!route?.params?.viewOnly && (
                  <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-black/50 text-white text-xs md:text-sm px-4 py-2 rounded-full z-10">
                    Tap team area to increase score
                  </div>
                )}

                {/* Control Buttons */}
                {!route?.params?.viewOnly && (
                  <div className="absolute bottom-4 md:bottom-12 left-1/2 transform -translate-x-1/2 flex gap-3 md:gap-8 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        submitRound();
                      }}
                      className="bg-orange-600 text-white px-4 md:px-10 py-2 md:py-5 rounded-full flex items-center gap-2 md:gap-3 hover:bg-orange-700 text-base md:text-xl mr-60 w-auto"
                      disabled={isButtonDisabled}
                    >
                      <Check className="w-5 h-3 md:w-8 md:h-8" />
                      <span>End Game</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetPoints();
                      }}
                      className="bg-gray-600 text-white px-4 md:px-10 py-2 md:py-5 rounded-full flex items-center gap-2 md:gap-3 hover:bg-gray-700 text-base md:text-xl w-auto"
                      disabled={isButtonDisabled}
                    >
                      <RefreshCcw className="w-5 h-5 md:w-8 md:h-8" />
                      <span>Reset</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Manual Scoreboard
            <div className="max-w-4xl mx-auto p-6 bg-gray-900 rounded-lg">
              <h2 className="text-2xl font-bold text-white text-center mb-6">
                Manual Scoreboard
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Game Score Inputs */}
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-orange-400">Game Scores</h3>
                    <span className="text-xs text-gray-400">Set {currentSetNumber}</span>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider px-2">
                      <span>Game</span>
                      <span>{teamAName}</span>
                      <span>{teamBName}</span>
                    </div>

                    {manualGames.map((game, index) => {
                      // FIXED: Use setsData to get players for the CURRENT SET if available
                      const currentSetInfo = setsData[currentSetNumber - 1];
                      let homePlayerName = "Home";
                      let awayPlayerName = "Away";

                      if (currentSetInfo && currentSetInfo.homePlayer && currentSetInfo.awayPlayer) {
                        // Show the doubles pair when a partner exists (Rapid Rallies
                        // rubbers 2 & 4), else just the singles player.
                        const awayPartner = currentSetInfo.awayPlayerB || currentSetInfo.awayPlayerZ;
                        homePlayerName = [currentSetInfo.homePlayer, currentSetInfo.homePlayerB].filter(Boolean).join(" & ");
                        awayPlayerName = [currentSetInfo.awayPlayer, awayPartner].filter(Boolean).join(" & ");
                      } else {
                        // Fallback to matchFormat logic
                        const players = matchFormat?.sequence?.[currentSetNumber - 1];
                        homePlayerName = players?.home || "Player A";
                        awayPlayerName = players?.away || "Player B";
                      }

                      return (
                        <div key={index} className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                          {/* Player Info Header */}
                          <div className="flex justify-between items-center mb-2 px-1">
                            <span className="text-gray-500 font-bold bg-gray-800 px-2 py-0.5 rounded text-xs">G{index + 1}</span>
                            <div className="flex gap-4 text-[10px] text-gray-400">
                              <span className="text-orange-300 truncate max-w-[100px]">{homePlayerName}</span>
                              <span>vs</span>
                              <span className="text-red-300 truncate max-w-[100px]">{awayPlayerName}</span>
                            </div>
                          </div>

                          {/* Inputs Row */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                              <input
                                type="number"
                                placeholder={homePlayerName}
                                value={game.a}
                                onChange={(e) => handleManualGameChange(index, "a", e.target.value)}
                                className="w-full bg-gray-800 text-white text-center px-1 py-3 rounded border border-gray-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-all placeholder:text-gray-300 font-mono text-lg"
                                disabled={winner || isButtonDisabled}
                              />
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                placeholder={awayPlayerName}
                                value={game.b}
                                onChange={(e) => handleManualGameChange(index, "b", e.target.value)}
                                className="w-full bg-gray-800 text-white text-center px-1 py-3 rounded border border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none transition-all placeholder:text-gray-300 font-mono text-lg"
                                disabled={winner || isButtonDisabled}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={submitBulkManualScores}
                    disabled={isButtonDisabled || winner}
                    className="w-full mt-6 bg-gradient-to-r from-green-600 to-green-800 text-white py-3 rounded-xl font-bold shadow-lg hover:from-green-500 hover:to-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
                  >
                    {isButtonDisabled ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-6 h-6" />
                        <span>Submit All Games</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right Column: Match Preview & Summary */}
                <div className="space-y-6">
                  {/* Match Info Card */}
                  <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h3 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                      <Trophy className="w-5 h-5" />
                      Match Status
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-lg">
                        <div className="text-center flex-1">
                          <div className="text-sm text-gray-400 mb-1">Score</div>
                          <div className="text-3xl font-bold text-orange-400">{teamASetWins}</div>
                          <div className="text-xs text-gray-500 mt-1 truncate">{teamAName}</div>
                        </div>
                        <div className="px-4 text-gray-300 font-bold text-xl">VS</div>
                        <div className="text-center flex-1">
                          <div className="text-sm text-gray-400 mb-1">Score</div>
                          <div className="text-3xl font-bold text-red-400">{teamBSetWins}</div>
                          <div className="text-xs text-gray-500 mt-1 truncate">{teamBName}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-900/50 p-3 rounded-lg text-center">
                          <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Format</div>
                          <div className="text-white text-sm font-medium">Best of {setCount} Sets</div>
                        </div>
                        <div className="bg-gray-900/50 p-3 rounded-lg text-center">
                          <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Game Info</div>
                          <div className="text-white text-sm font-medium">G{currentGameInMatch} / S{currentSetNumber}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                      <RefreshCcw className="w-5 h-5" />
                      Actions
                    </h3>

                    <div className="space-y-3">
                      {!winner && (
                        <button
                          onClick={resetPoints}
                          className="w-full py-3 rounded-lg border border-gray-600 text-gray-400 text-sm hover:bg-gray-700 hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                          <RefreshCcw className="w-4 h-4" />
                          Reset Current Points
                        </button>
                      )}

                      {matchStatus === "COMPLETED" && winner && (
                        <button
                          onClick={() => setShowEditView(true)}
                          className="w-full bg-orange-500 text-white py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-orange-600 transition-all font-bold"
                        >
                          <Edit className="w-5 h-5" />
                          <span>Edit Final Scores</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {winner && (
                <div className="mt-8 bg-yellow-400/10 border border-yellow-400/50 p-6 rounded-xl text-center">
                  <div className="text-yellow-400 text-2xl font-black flex items-center justify-center gap-3">
                    <Trophy className="w-8 h-8" />
                    <span>WINNER: {winner}</span>
                    <Trophy className="w-8 h-8" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Enhanced Substitution Modal */}
          <SubstitutionModal
            visible={showSubModal}
            onClose={() => setShowSubModal(false)}
            selectedTeam={selectedTeam}
            matchId={matchId}
            currentGame={currentGame}
            matchFormat={matchFormat}
            onSubstitute={handleSubstitution}
          />
        </>
      )}

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#181A22] rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-xl font-bold mb-4">{modalTitle}</h2>
            <p className="text-gray-200 mb-6 whitespace-pre-line">
              {modalMessage}
            </p>
            <div className="flex justify-end">
              <button
                onClick={closeModal}
                className="bg-orange-500 text-white px-6 py-2 rounded hover:bg-orange-600 w-auto"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Message */}
      {message && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40">
          <div className="bg-[#181A22] px-6 py-4 rounded-lg">
            <p className="text-gray-100">{message}</p>
          </div>
        </div>
      )}

      {/* Match Status Display */}
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
    </div>
  );
};

export default TeamKnockoutsScoreboard;
