import React, { useState, useEffect } from "react";
import { X, Trophy, Check, RefreshCcw, Edit } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Switch } from "@mui/material";
import { getSportConfig } from "../features/scoring/sportUIConfig";

const MGroupStageScoreBoard = () => {
    // Route parameters
    const location = useLocation();
    const route = {
        params: location.state || {},
    };

    const {
        matchId,
        playerAName = "Player A",
        playerBName = "Player B",
        playerAId,
        playerBId
    } = route.params;

    // Core scoreboard state
    const [playerAPoints, setPlayerAPoints] = useState(0);
    const [playerBPoints, setPlayerBPoints] = useState(0);
    const [winner, setWinner] = useState(null);
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);
    const [message, setMessage] = useState("");
    const [playerASetWins, setPlayerASetWins] = useState(0);
    const [playerBSetWins, setPlayerBSetWins] = useState(0);
    const [tapCooldown, setTapCooldown] = useState(false);
    const [currentSetNumber, setCurrentSetNumber] = useState(1);
    const [isEnabled, setIsEnabled] = useState(false);

    // Manual scoreboard state for multiple games (Dynamic based on format)
    const [manualGames, setManualGames] = useState([]);

    // Match Format Configuration (dynamically loaded from database)
    const [matchFormat, setMatchFormat] = useState(null);
    // Sport name → drives sport-specific scoreboard terminology (Foosball=Goals,
    // Cricket=Runs, Carrom=Boards, …) via the per-sport sportUIConfig registry.
    const [sportName, setSportName] = useState("");

    // Games tracking
    const [currentSetGames, setCurrentSetGames] = useState({ playerA: 0, playerB: 0 });
    const [currentGameNumber, setCurrentGameNumber] = useState(1);
    const [allSetsGames, setAllSetsGames] = useState([]);

    // Match data
    const [matchData, setMatchData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [matchStatus, setMatchStatus] = useState(null);


    const handleManualGameChange = (index, player, value) => {
        const newManualGames = [...manualGames];
        newManualGames[index][player] = value;
        setManualGames(newManualGames);
    };

    const submitBulkManualScores = async () => {
        if (winner || isButtonDisabled) return;

        // Filter out empty games
        const gamesToSubmit = manualGames.filter(g => g.a !== "" && g.b !== "");

        if (gamesToSubmit.length === 0) {
            showModal("Validation Error", "Please enter at least one game score.");
            return;
        }

        setIsButtonDisabled(true);
        setMessage("Submitting all game scores...");

        try {
            for (let i = 0; i < gamesToSubmit.length; i++) {
                const game = gamesToSubmit[i];
                const scoreA = parseInt(game.a);
                const scoreB = parseInt(game.b);

                // Basic validation for each game
                if (isNaN(scoreA) || isNaN(scoreB)) continue;

                setMessage(`Submitting game ${i + 1} of ${gamesToSubmit.length}...`);

                const token = localStorage.getItem("token");
                const response = await fetch(
                    `/api/tournaments/matches/${matchId}/complete-game`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({
                            finalPlayer1Points: scoreA,
                            finalPlayer2Points: scoreB
                        }),
                    }
                );

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Failed to submit game ${i + 1}`);
                }

                // Brief pause between requests to ensure sequence and UI feedback
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // After all submissions, refresh match data
            await initializeMatch();
            await syncScoreToPointsTable(); // Sync to points table after bulk update

            // Clear inputs but keep correct format count
            const totalSets = matchFormat?.totalSets || 5;
            setManualGames(Array(totalSets).fill().map(() => ({ a: "", b: "" })));

            showModal("Success", "All game scores submitted successfully!");

        } catch (error) {
            console.error("Bulk submission error:", error);
            showModal("Error", error.message || "Failed to submit some scores. Please check and try again.");
            await initializeMatch(); // Sync state even on partial failure
        } finally {
            setIsButtonDisabled(false);
            setMessage("");
        }
    };


    // Set tracking - using proper array format for backend compatibility
    const [currentSetData, setCurrentSetData] = useState({
        setOne: null,   // [playerA_score, playerB_score]
        setTwo: null,   // [playerA_score, playerB_score]
        setThree: null  // [playerA_score, playerB_score]
    });
    const [completedSets, setCompletedSets] = useState([]);


    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalMessage, setModalMessage] = useState("");



    // Initialize match with backend integration
    const initializeMatch = async () => {
        try {
            setLoading(true);

            // Get current live state from backend - ONLY auto-init when explicitly starting a match
            const token = localStorage.getItem("token");
            const response = await fetch(
                `/api/tournaments/matches/${matchId}/live-state?autoInit=false`,
                {
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();

                const match = data.match;
                if (match) {

                    // Sport name for sport-specific scoreboard labels.
                    setSportName(match.sportName || route.params.sportName || "");

                    // Load match format configuration - ALWAYS use database values!
                    const matchFormatFromDB = match.matchFormat || {};
                    setMatchFormat({
                        // 🎯 UNIFIED SETS CONFIGURATION - Handle all match types (TournamentMatch, SuperMatch, DirectKnockout)
                        totalSets: matchFormatFromDB.maxSets || matchFormatFromDB.totalSets || 5,
                        setsToWin: matchFormatFromDB.setsToWin || Math.ceil((matchFormatFromDB.maxSets || matchFormatFromDB.totalSets || 5) / 2),
                        maxSets: matchFormatFromDB.maxSets || matchFormatFromDB.totalSets || 5,

                        // 🎯 UNIFIED GAMES CONFIGURATION - Handle all match types
                        totalGames: matchFormatFromDB.maxGames || matchFormatFromDB.totalGames || 5,
                        gamesToWin: matchFormatFromDB.gamesToWin || Math.ceil((matchFormatFromDB.maxGames || matchFormatFromDB.totalGames || 5) / 2),
                        maxGames: matchFormatFromDB.maxGames || matchFormatFromDB.totalGames || 5,

                        pointsToWinGame: matchFormatFromDB.pointsToWinGame || null,
                        marginToWin: matchFormatFromDB.marginToWin ?? null,
                        deuceRule: matchFormatFromDB.deuceRule !== undefined ? matchFormatFromDB.deuceRule : false,
                        maxPointsPerGame: matchFormatFromDB.maxPointsPerGame || null,
                        serviceRule: {
                            pointsPerService: matchFormatFromDB.serviceRule?.pointsPerService || 2,
                            deuceServicePoints: matchFormatFromDB.serviceRule?.deuceServicePoints || 1
                        }
                    });

                    // Update live score
                    if (match.liveScore) {
                        setPlayerAPoints(match.liveScore.player1Points || 0);
                        setPlayerBPoints(match.liveScore.player2Points || 0);
                    }

                    // Update current set and game
                    setCurrentSetNumber(match.currentSet || 1);

                    // Load current set games from backend
                    if (match.sets && Array.isArray(match.sets)) {

                        const currentSet = match.sets.find(set => set.setNumber === match.currentSet);
                        if (currentSet && currentSet.games) {

                            const player1Games = currentSet.games.filter(game => {
                                if (game.status !== 'COMPLETED' || !game.winner) return false;

                                const winnerIdMatch = game.winner.playerId && playerAId &&
                                    game.winner.playerId.toString() === playerAId.toString();
                                const winnerNameMatch = game.winner.playerName === playerAName;

                                return winnerIdMatch || winnerNameMatch;
                            }).length;

                            const player2Games = currentSet.games.filter(game => {
                                if (game.status !== 'COMPLETED' || !game.winner) return false;

                                const winnerIdMatch = game.winner.playerId && playerBId &&
                                    game.winner.playerId.toString() === playerBId.toString();
                                const winnerNameMatch = game.winner.playerName === playerBName;

                                return winnerIdMatch || winnerNameMatch;
                            }).length;

                            // Calculate total games won across all sets (we'll update this after processing all sets)
                            setCurrentGameNumber((currentSet.games.filter(g => g.status === 'COMPLETED').length) + 1);
                        } else {
                        }

                        // Calculate completed sets from sets data
                        const completedSetsData = match.sets
                            .filter(set => set.status === 'COMPLETED')
                            .map(set => {
                                // Calculate set score from games
                                const player1Games = set.games.filter(game => {
                                    if (game.status !== 'COMPLETED' || !game.winner) return false;

                                    const winnerIdMatch = game.winner.playerId && playerAId &&
                                        game.winner.playerId.toString() === playerAId.toString();
                                    const winnerNameMatch = game.winner.playerName === playerAName;

                                    return winnerIdMatch || winnerNameMatch;
                                }).length;

                                const player2Games = set.games.filter(game => {
                                    if (game.status !== 'COMPLETED' || !game.winner) return false;

                                    const winnerIdMatch = game.winner.playerId && playerBId &&
                                        game.winner.playerId.toString() === playerBId.toString();
                                    const winnerNameMatch = game.winner.playerName === playerBName;

                                    return winnerIdMatch || winnerNameMatch;
                                }).length;

                                return [player1Games, player2Games];
                            });

                        // Store all sets games data for viewing
                        const allSetsGamesData = match.sets.map(set => {
                            const player1Games = set.games.filter(game => {
                                if (game.status !== 'COMPLETED' || !game.winner) return false;

                                const winnerIdMatch = game.winner.playerId && playerAId &&
                                    game.winner.playerId.toString() === playerAId.toString();
                                const winnerNameMatch = game.winner.playerName === playerAName;

                                return winnerIdMatch || winnerNameMatch;
                            }).length;

                            const player2Games = set.games.filter(game => {
                                if (game.status !== 'COMPLETED' || !game.winner) return false;

                                const winnerIdMatch = game.winner.playerId && playerBId &&
                                    game.winner.playerId.toString() === playerBId.toString();
                                const winnerNameMatch = game.winner.playerName === playerBName;

                                return winnerIdMatch || winnerNameMatch;
                            }).length;

                            return {
                                setNumber: set.setNumber,
                                games: [player1Games, player2Games],
                                status: set.status
                            };
                        });

                        // Calculate total games won across ALL sets (completed + current)
                        const totalPlayer1Games = allSetsGamesData.reduce((total, set) => total + set.games[0], 0);
                        const totalPlayer2Games = allSetsGamesData.reduce((total, set) => total + set.games[1], 0);

                        // Set the total games (this is what should show in the Games X/3 labels)
                        setCurrentSetGames({ playerA: totalPlayer1Games, playerB: totalPlayer2Games });

                        setCompletedSets(completedSetsData);
                        setAllSetsGames(allSetsGamesData);
                        calculateSetWins(completedSetsData);
                    }

                    setMatchData(match);
                    setMatchStatus(match.status);

                    // If match is completed, show winner
                    if (match.status === 'COMPLETED' && match.result && match.result.winner) {
                        setWinner(match.result.winner.playerName);
                    } else if (match.status === 'COMPLETED') {
                    }
                }
            }
        } catch (error) {
            console.error("Error initializing match:", error);
            // Even on error, try to show something meaningful
            setMatchStatus('ERROR');
            setMessage('Failed to load match data');
        } finally {
            setLoading(false);
        }
    };


    // Calculate set wins from completed sets
    const calculateSetWins = (sets) => {
        let playerAWins = 0;
        let playerBWins = 0;

        sets.forEach(set => {
            if (set && Array.isArray(set) && set.length === 2) {
                if (set[0] > set[1]) {
                    playerAWins++;
                } else if (set[1] > set[0]) {
                    playerBWins++;
                }
            }
        });

        setPlayerASetWins(playerAWins);
        setPlayerBSetWins(playerBWins);
    };

    // Update live score via backend
    const updateLiveScore = async (playerA_points, playerB_points, autoCheck = true) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `/api/tournaments/matches/${matchId}/live-score`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                        player1Points: playerA_points,
                        player2Points: playerB_points
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to update live score");
            }

            const data = await response.json();

            // Check if game is completed (11 points with 2+ point lead)
            // Only check if autoCheck is true and we're not in view-only mode
            if (autoCheck && !route?.params?.viewOnly) {
                checkGameCompletion(playerA_points, playerB_points);
            }

        } catch (error) {
            console.error("Error updating live score:", error);
            throw error;
        }
    };

    const resetPoints = async () => {
        if (route?.params?.viewOnly || winner || isButtonDisabled) return;

        setIsButtonDisabled(true);
        setMessage("Resetting scores...");

        try {
            setPlayerAPoints(0);
            setPlayerBPoints(0);
            await updateLiveScore(0, 0, false);
        } catch (error) {
            console.error("Error resetting scores:", error);
            showModal("Error", "Failed to reset scores");
        } finally {
            setIsButtonDisabled(false);
            setMessage("");
        }
    };

    // Check if current game is completed using dynamic configuration
    const checkGameCompletion = (playerA_points, playerB_points) => {
        // Safety check: Don't process if matchFormat hasn't loaded yet
        if (!matchFormat) {
            return;
        }

        const { pointsToWinGame, marginToWin, deuceRule, maxPointsPerGame } = matchFormat;

        const maxPoints = Math.max(playerA_points, playerB_points);
        const pointDiff = Math.abs(playerA_points - playerB_points);

        // Check max points limit (if configured)
        if (maxPointsPerGame && maxPoints >= maxPointsPerGame) {
            completeCurrentGame(playerA_points, playerB_points);
            return;
        }

        // Standard completion logic
        if (maxPoints >= pointsToWinGame) {
            if (deuceRule) {
                // With deuce rule: must win by margin
                if (pointDiff >= marginToWin) {
                    completeCurrentGame(playerA_points, playerB_points);
                }
            } else {
                // Without deuce rule: first to pointsToWinGame wins
                completeCurrentGame(playerA_points, playerB_points);
            }
        }
    };

    // Complete current game and handle set/match progression
    const completeCurrentGame = async (playerA_points, playerB_points) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `/api/tournaments/matches/${matchId}/complete-game`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                        finalPlayer1Points: playerA_points,
                        finalPlayer2Points: playerB_points
                    }),
                }
            );

            if (response.ok) {
                const data = await response.json();

                // Reset points for next game
                setPlayerAPoints(0);
                setPlayerBPoints(0);

                // Update current set/game from backend response
                if (data.match) {
                    setCurrentSetNumber(data.match.currentSet || currentSetNumber);

                    // Update current set games tracking
                    if (data.match.sets && Array.isArray(data.match.sets)) {
                        const currentSet = data.match.sets.find(set => set.setNumber === data.match.currentSet);
                        if (currentSet && currentSet.games) {
                            const player1Games = currentSet.games.filter(game => {
                                if (game.status !== 'COMPLETED') return false;

                                // Handle knockout matches with null playerIds
                                if (data.match.player1.playerId && game.winner.playerId) {
                                    return game.winner.playerId.toString() === data.match.player1.playerId.toString();
                                } else {
                                    // Fallback to playerName comparison
                                    const matchPlayer1Name = data.match.player1.playerName || data.match.player1.userName;
                                    return game.winner.playerName === matchPlayer1Name;
                                }
                            }).length;

                            const player2Games = currentSet.games.filter(game => {
                                if (game.status !== 'COMPLETED') return false;

                                // Handle knockout matches with null playerIds
                                if (data.match.player2.playerId && game.winner.playerId) {
                                    return game.winner.playerId.toString() === data.match.player2.playerId.toString();
                                } else {
                                    // Fallback to playerName comparison
                                    const matchPlayer2Name = data.match.player2.playerName || data.match.player2.userName;
                                    return game.winner.playerName === matchPlayer2Name;
                                }
                            }).length;

                            setCurrentSetGames({ playerA: player1Games, playerB: player2Games });
                            setCurrentGameNumber((currentSet.games.filter(g => g.status === 'COMPLETED').length) + 1);
                        }

                        // Recalculate completed sets
                        const completedSetsData = data.match.sets
                            .filter(set => set.status === 'COMPLETED')
                            .map(set => {
                                const player1Games = set.games.filter(game => {
                                    if (game.status !== 'COMPLETED') return false;

                                    // Handle knockout matches with null playerIds
                                    if (data.match.player1.playerId && game.winner.playerId) {
                                        return game.winner.playerId.toString() === data.match.player1.playerId.toString();
                                    } else {
                                        // Fallback to playerName comparison
                                        const matchPlayer1Name = data.match.player1.playerName || data.match.player1.userName;
                                        return game.winner.playerName === matchPlayer1Name;
                                    }
                                }).length;

                                const player2Games = set.games.filter(game => {
                                    if (game.status !== 'COMPLETED') return false;

                                    // Handle knockout matches with null playerIds
                                    if (data.match.player2.playerId && game.winner.playerId) {
                                        return game.winner.playerId.toString() === data.match.player2.playerId.toString();
                                    } else {
                                        // Fallback to playerName comparison
                                        const matchPlayer2Name = data.match.player2.playerName || data.match.player2.userName;
                                        return game.winner.playerName === matchPlayer2Name;
                                    }
                                }).length;

                                return [player1Games, player2Games];
                            });

                        // Update all sets games data
                        const allSetsGamesData = data.match.sets.map(set => {
                            const player1Games = set.games.filter(game => {
                                if (game.status !== 'COMPLETED') return false;

                                // Handle knockout matches with null playerIds
                                if (data.match.player1.playerId && game.winner.playerId) {
                                    return game.winner.playerId.toString() === data.match.player1.playerId.toString();
                                } else {
                                    // Fallback to playerName comparison
                                    const matchPlayer1Name = data.match.player1.playerName || data.match.player1.userName;
                                    return game.winner.playerName === matchPlayer1Name;
                                }
                            }).length;

                            const player2Games = set.games.filter(game => {
                                if (game.status !== 'COMPLETED') return false;

                                // Handle knockout matches with null playerIds
                                if (data.match.player2.playerId && game.winner.playerId) {
                                    return game.winner.playerId.toString() === data.match.player2.playerId.toString();
                                } else {
                                    // Fallback to playerName comparison
                                    const matchPlayer2Name = data.match.player2.playerName || data.match.player2.userName;
                                    return game.winner.playerName === matchPlayer2Name;
                                }
                            }).length;

                            return {
                                setNumber: set.setNumber,
                                games: [player1Games, player2Games],
                                status: set.status
                            };
                        });

                        setCompletedSets(completedSetsData);
                        setAllSetsGames(allSetsGamesData);
                        calculateSetWins(completedSetsData);
                    }
                }

                // Check if match is completed
                if (data.matchCompleted) {
                    // Handle different winner structures for SuperMatch vs regular Match
                    let winnerName = null;

                    if (data.match.winner?.playerName) {
                        // SuperMatch structure: direct winner field
                        winnerName = data.match.winner.playerName;
                    } else if (data.match.result?.winner?.playerName) {
                        // Regular Match structure: result.winner field
                        winnerName = data.match.result.winner.playerName;
                    }

                    if (winnerName) {
                        setWinner(winnerName);
                        setMatchStatus("COMPLETED");
                        showModal("Match Completed!", `${winnerName} wins the match!`);
                        // Sync to points table immediately when match completes
                        syncScoreToPointsTable();
                    }
                } else if (data.setCompleted) {
                    showModal("Set Completed!", `Set ${data.currentSet - 1} completed!`);
                    // Also sync when set completes for real-time updates
                    syncScoreToPointsTable();
                } else {
                    showModal("Game Won!", `Game completed! Next game starting...`);
                    // Sync after every game for live tracking
                    syncScoreToPointsTable();
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to complete game");
            }
        } catch (error) {
            console.error("Error completing game:", error);
            showModal("Error", error.message || "Failed to complete game");
        }
    };

    // The match result is already saved by the completeGame endpoint
    // No need for separate saveMatchResult function

    // Increment Player A score
    const incrementPlayerA = async () => {
        if (route?.params?.viewOnly || winner || isButtonDisabled || tapCooldown)
            return;

        setTapCooldown(true);
        setIsButtonDisabled(true);
        setMessage("Please wait...");

        try {
            const newScore = playerAPoints + 1;
            setPlayerAPoints(newScore);
            await updateLiveScore(newScore, playerBPoints);
        } catch (error) {
            console.error("Error incrementing Player A:", error);
            setPlayerAPoints(playerAPoints);
            showModal("Error", "Failed to update score");
        } finally {
            setTimeout(() => {
                setTapCooldown(false);
                setIsButtonDisabled(false);
                setMessage("");
            }, 800);
        }
    };

    // Increment Player B score
    const incrementPlayerB = async () => {
        if (route?.params?.viewOnly || winner || isButtonDisabled || tapCooldown)
            return;

        setTapCooldown(true);
        setIsButtonDisabled(true);
        setMessage("Please wait...");

        try {
            const newScore = playerBPoints + 1;
            setPlayerBPoints(newScore);
            await updateLiveScore(playerAPoints, newScore);
        } catch (error) {
            console.error("Error incrementing Player B:", error);
            setPlayerBPoints(playerBPoints);
            showModal("Error", "Failed to update score");
        } finally {
            setTimeout(() => {
                setTapCooldown(false);
                setIsButtonDisabled(false);
                setMessage("");
            }, 800);
        }
    };

    // Decrement scores
    const decrementPlayerA = async () => {
        if (playerAPoints > 0) {
            const newScore = playerAPoints - 1;
            setPlayerAPoints(newScore);
            await updateLiveScore(newScore, playerBPoints);
        }
    };

    const decrementPlayerB = async () => {
        if (playerBPoints > 0) {
            const newScore = playerBPoints - 1;
            setPlayerBPoints(newScore);
            await updateLiveScore(playerAPoints, newScore);
        }
    };


    // Enhanced sync function to ensure real-time points table updates
    const syncScoreToPointsTable = async () => {
        try {
            // Skip sync for knockout matches (only sync group stage matches to points table)
            if (matchData?.round && ['pre-quarter', 'quarter-final', 'semi-final', 'final'].includes(matchData.round)) {
                return;
            }


            // Use the endpoint from groupStageScoreboardController
            const token = localStorage.getItem("token");
            const response = await fetch(
                `/api/tournaments/matches/${matchId}/sync-scores`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();

                // Additional verification - check if score was created/updated
                if (data.success && data.score) {
                  // Score synced successfully
                }
            } else {
                const errorData = await response.json();
            }
        } catch (error) {
            console.error('❌ Error syncing match score to Score model:', error);
            // Don't show error to user for sync issues, just log for debugging
            // The main match functionality should still work
        }
    };

    // Modal helper
    const showModal = (title, message) => {
        setModalTitle(title);
        setModalMessage(message);
        setIsModalOpen(true);
    };

    // Update manual games inputs when match format is loaded or changed
    useEffect(() => {
        if (matchFormat) {
            const totalSets = matchFormat.totalSets || 5;
            setManualGames(Array(totalSets).fill().map(() => ({ a: "", b: "" })));
        }
    }, [matchFormat]);

    // Initialize match data on mount
    useEffect(() => {
        if (matchId) {
            initializeMatch();
        }
    }, [matchId]);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center">
                <div className="text-white text-lg md:text-2xl">Loading match...</div>
            </div>
        );
    }

    // ── Sport-specific scoreboard terminology ──
    // One registry (sportUIConfig) drives every sport's labels so each looks
    // distinct: Foosball → "Goal"/"Game", Table Tennis → "Point"/"Set", etc.
    const _cfg = getSportConfig(sportName);
    const _pt = _cfg?.labels?.point || "Point";   // "Goal" | "Point"
    const _set = _cfg?.labels?.set || "Set";      // "Game" | "Set"
    const _ptPlural = `${_pt}s`;                   // "Goals" | "Points"
    const _setPlural = `${_set}s`;                 // "Games" | "Sets"
    // Show the "- Game N" sub-unit only for sports whose top unit ISN'T already a
    // game (i.e. Table Tennis "Set" → "Set 1 - Game 1"; Foosball "Game" → "Game 1").
    const _topLabel = _set === "Game"
        ? `${_set} ${currentSetNumber}`
        : `${_set} ${currentSetNumber} - Game ${currentGameNumber}`;

    return (
        <div className="fixed inset-0 bg-black">
            {/* Clean Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-black/90 p-3 md:p-4">
                <div className="flex items-center justify-between text-white">
                    {/* Match Status */}
                    <div className="text-lg md:text-xl font-semibold">
                        {_topLabel}
                    </div>

                    {/* Quick Rules - Only show when matchFormat is loaded */}
                    {matchFormat && (
                        <div className="hidden md:flex items-center gap-4 text-sm text-gray-300">
                            <span>{`Best of ${matchFormat?.totalSets || 3} ${_setPlural}`}</span>
                            <span>•</span>
                            <span>{matchFormat?.pointsToWinGame ? `${matchFormat.pointsToWinGame} ${_ptPlural.toLowerCase()}/game` : ""}</span>
                            {matchFormat?.deuceRule && (
                                <>
                                    <span>•</span>
                                    <span>Win by {matchFormat?.marginToWin || "—"}+</span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Mode Toggle */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                            {isEnabled ? "Auto" : "Manual"}
                        </span>
                        <Switch
                            checked={isEnabled}
                            onChange={(e) => setIsEnabled(e.target.checked)}
                            color="primary"
                        />
                    </div>
                </div>
            </div>

            {isEnabled ? (
                // Live Scoreboard (Auto) - Redesigned Layout
                <div className="flex flex-col md:flex-row h-screen pt-16 md:pt-18 relative">
                    {/* Player A Side */}
                    <div
                        className={`w-full md:w-1/2 bg-orange-500 relative flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-black transition-colors ${tapCooldown ? "opacity-50 cursor-not-allowed" : "active:bg-orange-500"
                            }`}
                        onClick={() => !route?.params?.viewOnly && !tapCooldown && incrementPlayerA()}
                    >
                        {/* Player Stats - Clean */}
                        <div className="absolute top-4 left-4 right-4">
                            <div className="bg-black/80 rounded-lg p-3 text-center border border-white/20">
                                <div className="grid grid-cols-2 gap-4 text-white">
                                    <div>
                                        <div className="text-xs text-white/60 mb-1">{_setPlural}</div>
                                        <div className="text-2xl font-bold">{playerASetWins}/{matchFormat?.setsToWin || '?'}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-white/60 mb-1">Games</div>
                                        <div className="text-2xl font-bold">{currentSetGames.playerA}/{matchFormat?.gamesToWin || '?'}</div>
                                    </div>
                                </div>
                                {(winner === playerAName || playerASetWins > playerBSetWins) && (
                                    <div className="flex items-center justify-center gap-2 mt-2 text-yellow-400">
                                        <Trophy className="w-5 h-5" />
                                        <span className="font-bold">Winner</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Score Display - Clean */}
                        <div className="text-center mt-16 md:mt-20">
                            <div className="text-lg md:text-xl text-white/80 font-semibold mb-4">
                                Game {currentGameNumber}
                            </div>
                            <div className="text-8xl md:text-[9rem] font-bold text-white mb-4">
                                {playerAPoints < 10 ? `0${playerAPoints}` : playerAPoints}
                            </div>
                        </div>

                        {/* Player Name - Clean */}
                        <div className="absolute bottom-20 md:bottom-24 left-0 right-0 text-center">
                            <div className="text-xl md:text-3xl font-bold text-white px-4">
                                {playerAName}
                            </div>
                        </div>

                        {/* Controls & History - Clean */}
                        <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 right-2 md:right-4 flex justify-between items-center">
                            {/* Subtract Button */}
                            {!route?.params?.viewOnly && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!tapCooldown) decrementPlayerA();
                                    }}
                                    className="bg-black/30 p-3 rounded-full hover:bg-black/50 border border-white/20"
                                    disabled={tapCooldown}
                                >
                                    <X className="text-white w-6 h-6" />
                                </button>
                            )}

                            {/* Set History */}
                            <div className="flex gap-2">
                                {completedSets.map((set, index) => (
                                    <div key={index} className="bg-black/50 rounded px-3 py-1 text-center">
                                        <div className="text-lg font-bold text-white">{set[0]}</div>
                                        <div className="text-xs text-white/60">S{index + 1}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Central Status - Clean */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                        <div className="bg-black/95 text-white rounded-lg p-4 text-center border-2 border-white/30 min-w-[200px] md:min-w-[280px]">
                            {/* Current Score */}
                            <div className="text-3xl md:text-4xl font-bold mb-3">
                                <span className="text-orange-400">{playerAPoints}</span>
                                <span className="text-white/60 mx-2">-</span>
                                <span className="text-red-400">{playerBPoints}</span>
                            </div>

                            {/* Summary */}
                            <div className="grid grid-cols-2 gap-3 text-xs text-gray-400 mb-3">
                                <div>
                                    <div className="font-semibold">Games</div>
                                    <div className="text-white">{currentSetGames.playerA} - {currentSetGames.playerB}</div>
                                </div>
                                <div>
                                    <div className="font-semibold">{_setPlural}</div>
                                    <div className="text-white">{playerASetWins} - {playerBSetWins}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Control Buttons (Reset/Complete) for Auto Mode */}
                    {!route?.params?.viewOnly && (
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 flex gap-4">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    completeCurrentGame(playerAPoints, playerBPoints);
                                }}
                                disabled={isButtonDisabled || winner}
                                className="bg-orange-600 text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-orange-700 shadow-lg"
                            >
                                <Check className="w-5 h-5" />
                                <span className="hidden md:inline">End Game</span>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    resetPoints();
                                }}
                                disabled={isButtonDisabled || winner}
                                className="bg-gray-600 text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-gray-700 shadow-lg"
                            >
                                <RefreshCcw className="w-5 h-5" />
                                <span className="hidden md:inline">Reset</span>
                            </button>
                        </div>
                    )}

                    {/* Player B Side */}
                    <div
                        className={`w-full md:w-1/2 bg-red-500 relative flex flex-col items-center justify-center transition-colors ${tapCooldown ? "opacity-50 cursor-not-allowed" : "active:bg-red-600"
                            }`}
                        onClick={() => !route?.params?.viewOnly && !tapCooldown && incrementPlayerB()}
                    >
                        {/* Player Stats - Clean */}
                        <div className="absolute top-4 left-4 right-4">
                            <div className="bg-black/80 rounded-lg p-3 text-center border border-white/20">
                                <div className="grid grid-cols-2 gap-4 text-white">
                                    <div>
                                        <div className="text-xs text-white/60 mb-1">Games</div>
                                        <div className="text-2xl font-bold">{currentSetGames.playerB}/{matchFormat?.gamesToWin || '?'}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-white/60 mb-1">{_setPlural}</div>
                                        <div className="text-2xl font-bold">{playerBSetWins}/{matchFormat?.setsToWin || '?'}</div>
                                    </div>
                                </div>
                                {(winner === playerBName || playerBSetWins > playerASetWins) && (
                                    <div className="flex items-center justify-center gap-2 mt-2 text-yellow-400">
                                        <Trophy className="w-5 h-5" />
                                        <span className="font-bold">Winner</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Score Display - Clean */}
                        <div className="text-center mt-16 md:mt-20">
                            <div className="text-lg md:text-xl text-white/80 font-semibold mb-4">
                                Game {currentGameNumber}
                            </div>
                            <div className="text-8xl md:text-[9rem] font-bold text-white mb-4">
                                {playerBPoints < 10 ? `0${playerBPoints}` : playerBPoints}
                            </div>
                        </div>

                        {/* Player Name - Clean */}
                        <div className="absolute bottom-20 md:bottom-24 left-0 right-0 text-center">
                            <div className="text-xl md:text-3xl font-bold text-white px-4">
                                {playerBName}
                            </div>
                        </div>

                        {/* Controls & History - Clean */}
                        <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 right-2 md:right-4 flex justify-between items-center">
                            {/* Set History */}
                            <div className="flex gap-2">
                                {completedSets.map((set, index) => (
                                    <div key={index} className="bg-black/50 rounded px-3 py-1 text-center">
                                        <div className="text-lg font-bold text-white">{set[1]}</div>
                                        <div className="text-xs text-white/60">S{index + 1}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Subtract Button */}
                            {!route?.params?.viewOnly && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!tapCooldown) decrementPlayerB();
                                    }}
                                    className="bg-black/30 p-3 rounded-full hover:bg-black/50 border border-white/20"
                                    disabled={tapCooldown}
                                >
                                    <X className="text-white w-6 h-6" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Status Message */}
                    {message && (
                        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-4 py-2 rounded border border-white/30 z-40">
                            {message}
                        </div>
                    )}
                </div>
            ) : (
                // Manual Scoreboard (New)
                <div className="flex items-center justify-center min-h-screen pt-16 bg-black">
                    <div className="max-w-4xl w-full p-6 bg-gray-900 rounded-lg mx-4">
                        <h2 className="text-2xl font-bold text-white text-center mb-6">
                            Manual Scoreboard
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left Column: Game Score Inputs */}
                            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-orange-400">Game Scores</h3>
                                    <span className="text-xs text-gray-400">{_set} {currentSetNumber}</span>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-7 gap-2 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider px-2">
                                        <div className="col-span-1">#</div>
                                        <div className="col-span-3 text-center">{playerAName}</div>
                                        <div className="col-span-3 text-center">{playerBName}</div>
                                    </div>

                                    {manualGames.map((game, index) => (
                                        <div key={index} className="grid grid-cols-7 gap-2 items-center bg-gray-900/50 p-2 rounded-lg border border-gray-700/50">
                                            <div className="col-span-1 text-center font-bold text-gray-600">G{index + 1}</div>
                                            <div className="col-span-3">
                                                <input
                                                    type="number"
                                                    placeholder={_ptPlural}
                                                    value={game.a}
                                                    onChange={(e) => handleManualGameChange(index, 'a', e.target.value)}
                                                    className="w-full bg-gray-800 text-white text-center px-2 py-2 rounded border border-gray-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-all placeholder:text-gray-600"
                                                    disabled={winner || isButtonDisabled}
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <input
                                                    type="number"
                                                    placeholder={_ptPlural}
                                                    value={game.b}
                                                    onChange={(e) => handleManualGameChange(index, 'b', e.target.value)}
                                                    className="w-full bg-gray-800 text-white text-center px-2 py-2 rounded border border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none transition-all placeholder:text-gray-600"
                                                    disabled={winner || isButtonDisabled}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={submitBulkManualScores}
                                    disabled={isButtonDisabled || winner}
                                    className="w-full mt-6 bg-gradient-to-r from-orange-500 to-gray-800 text-white py-3 rounded-xl font-bold shadow-lg hover:from-orange-500 hover:to-orange-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
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
                                {/* Player Info Card */}
                                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                    <h3 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                                        <Trophy className="w-5 h-5" />
                                        Match Status
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-lg">
                                            <div className="text-center flex-1">
                                                <div className="text-sm text-gray-400 mb-1">Score</div>
                                                <div className="text-3xl font-bold text-orange-400">{playerASetWins}</div>
                                                <div className="text-xs text-gray-500 mt-1 truncate">{playerAName}</div>
                                            </div>
                                            <div className="px-4 text-gray-600 font-bold text-xl">VS</div>
                                            <div className="text-center flex-1">
                                                <div className="text-sm text-gray-400 mb-1">Score</div>
                                                <div className="text-3xl font-bold text-red-400">{playerBSetWins}</div>
                                                <div className="text-xs text-gray-500 mt-1 truncate">{playerBName}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-900/50 p-3 rounded-lg text-center">
                                                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Format</div>
                                                <div className="text-white text-sm font-medium">{`Best of ${matchFormat?.totalSets || 3} ${_setPlural}`}</div>
                                            </div>
                                            <div className="bg-gray-900/50 p-3 rounded-lg text-center">
                                                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{_set} Score</div>
                                                <div className="text-white text-sm font-medium">{currentSetGames.playerA} - {currentSetGames.playerB}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Set History */}
                                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                    <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                                        <RefreshCcw className="w-5 h-5" />
                                        {_set} History
                                    </h3>
                                    <div className="flex flex-wrap gap-3">
                                        {completedSets.length > 0 ? (
                                            completedSets.map((set, index) => (
                                                <div key={index} className="bg-gray-900 px-4 py-3 rounded-lg border border-gray-700 text-center min-w-[70px]">
                                                    <div className="text-xs text-gray-500 mb-1">{_set} {index + 1}</div>
                                                    <div className="text-lg font-bold">
                                                        <span className="text-orange-400">{set[0]}</span>
                                                        <span className="text-white/20 mx-1">-</span>
                                                        <span className="text-red-400">{set[1]}</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-gray-500 text-sm italic py-2">No completed {_setPlural.toLowerCase()} yet</div>
                                        )}
                                    </div>

                                    {!winner && (
                                        <button
                                            onClick={resetPoints}
                                            className="w-full mt-6 py-2 rounded-lg border border-gray-600 text-gray-400 text-sm hover:bg-gray-700 hover:text-white transition-all flex items-center justify-center gap-2"
                                        >
                                            <RefreshCcw className="w-4 h-4" />
                                            Reset Current {_ptPlural}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {winner && (
                            <div className="mt-8 bg-yellow-400/10 border border-yellow-400/50 p-4 rounded-xl text-center">
                                <div className="text-yellow-400 text-2xl font-black flex items-center justify-center gap-3">
                                    <Trophy className="w-8 h-8" />
                                    <span>WINNER: {winner}</span>
                                    <Trophy className="w-8 h-8" />
                                </div>
                            </div>
                        )}

                        {message && (
                            <div className="mt-4 bg-orange-500/10 border border-orange-500/50 p-3 rounded-lg text-center text-orange-400 text-sm animate-pulse">
                                {message}
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* General Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg max-w-sm w-full mx-4 p-6">
                        <h3 className="text-xl font-bold mb-4">{modalTitle}</h3>
                        <p className="text-gray-700 mb-6">{modalMessage}</p>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="w-full bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-500"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MGroupStageScoreBoard;