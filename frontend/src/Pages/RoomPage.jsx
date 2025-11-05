import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../socket";

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const username = localStorage.getItem("wordle-username");

  const [players, setPlayers] = useState([]);
  const [host, setHost] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [status, setStatus] = useState("Joining room...");
  const [word, setWord] = useState("");
  const [wordSubmitted, setWordSubmitted] = useState(false);
  const [allSubmitted, setAllSubmitted] = useState(false);
  const [assignedWord, setAssignedWord] = useState("");
  const [finished, setFinished] = useState([]);
  const [failed, setFailed] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const maxAttempts = 6;
  const hasJoined = useRef(false);

  const normalizedRoomId = useMemo(
    () => (roomId ? roomId.toUpperCase() : ""),
    [roomId]
  );

  const attempting = useMemo(() => {
    const done = new Set([...finished, ...failed]);
    return players.filter((p) => !done.has(p));
  }, [players, finished, failed]);

  const handleLeaveRoom = () => {
    socket.emit("leave-room", { roomId: normalizedRoomId, username });
    navigate("/");
  };

  const getGuessFeedback = (guess, target) => {
    const result = [];
    const targetArr = target.split("");
    const guessArr = guess.split("");

    const used = new Array(5).fill(false);
    for (let i = 0; i < 5; i++) {
      if (guessArr[i] === targetArr[i]) {
        result[i] = "green";
        used[i] = true;
      }
    }

    for (let i = 0; i < 5; i++) {
      if (result[i] === "green") continue;
      const idx = targetArr.findIndex(
        (ch, j) => ch === guessArr[i] && !used[j]
      );
      if (idx !== -1) {
        result[i] = "yellow";
        used[idx] = true;
      } else {
        result[i] = "gray";
      }
    }

    return result;
  };

  const handleGuessSubmit = () => {
    if (currentGuess.length !== 5) {
      alert("Enter a 5-letter word!");
      return;
    }
    const newGuess = currentGuess.toUpperCase();
    const newGuesses = [...guesses, newGuess];
    setGuesses(newGuesses);
    setCurrentGuess("");

    if (newGuess === assignedWord) {
      socket.emit("player-finished", {
        roomId: normalizedRoomId,
        username,
        success: true,
      });
      setStatus("You guessed the word correctly!");
      return;
    }

    if (newGuesses.length >= maxAttempts) {
      socket.emit("player-finished", {
        roomId: normalizedRoomId,
        username,
        success: false,
      });
      setStatus("You ran out of attempts!");
      return;
    }
  };

  useEffect(() => {
    if (!username || !normalizedRoomId) return;

    if (!socket.connected) {
      socket.auth = { username };
      socket.connect();
    }

    if (!hasJoined.current) {
      hasJoined.current = true;
      socket.emit("join-room", { roomId: normalizedRoomId, username });
    }

    const onRoomData = ({ host, players }) => {
      setHost(host);
      setPlayers([...players]);
      setIsHost(host === username);
      setStatus((prev) =>
        prev.startsWith("Joining") ? "Waiting for players..." : prev
      );
    };

    const onWordSubmitted = ({ wordCount, total }) => {
      setStatus(`Words submitted: ${wordCount}/${total}`);
    };

    const onAllWordsSubmitted = ({ assignedWords }) => {
      setAllSubmitted(true);
      const myWord = assignedWords[username];
      setAssignedWord(myWord || "");
      setStatus("All words entered! Host can start the game.");
    };

    const onStartGame = () => {
      setGameStarted(true);
      setStatus("Game started! Start guessing your word.");
    };

    const onGameProgress = ({ finished = [], failed = [] }) => {
      setFinished(finished);
      setFailed(failed);
    };

    const onErrorMessage = (msg) => {
      setStatus(msg || "An error occurred.");
      alert(msg);
    };

    socket.on("room-data", onRoomData);
    socket.on("word-submitted", onWordSubmitted);
    socket.on("all-words-submitted", onAllWordsSubmitted);
    socket.on("start-game", onStartGame);
    socket.on("game-progress", onGameProgress);
    socket.on("error-message", onErrorMessage);

    return () => {
      socket.off("room-data", onRoomData);
      socket.off("word-submitted", onWordSubmitted);
      socket.off("all-words-submitted", onAllWordsSubmitted);
      socket.off("start-game", onStartGame);
      socket.off("game-progress", onGameProgress);
      socket.off("error-message", onErrorMessage);
    };
  }, [normalizedRoomId, username]);

  const handleSubmitWord = () => {
    const w = word.trim().toUpperCase();
    if (w.length !== 5 || !/^[A-Z]{5}$/.test(w)) {
      alert("Enter a valid 5-letter word (A–Z).");
      return;
    }
    socket.emit("submit-word", { roomId: normalizedRoomId, username, word: w });
    setWordSubmitted(true);
    setStatus("Waiting for others to submit...");
  };

  const handleStartGame = () => {
    if (isHost && allSubmitted) {
      socket.emit("start-game", { roomId: normalizedRoomId });
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white px-6">
      {/* ✅ Top Bar */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-6 py-4 bg-neutral-800 shadow-md">
        <h1 className="text-xl font-bold text-emerald-400">
          Room {normalizedRoomId}
        </h1>
        <p className="text-gray-300">
          👤 <span className="font-semibold text-white">{username}</span>
        </p>
      </div>

      <div className="mt-20 bg-neutral-800 rounded-xl p-5 shadow-lg w-full max-w-md">
        <p className="text-gray-400 mb-4 text-center">{status}</p>

        <h2 className="text-xl font-semibold mb-3 text-center">Players</h2>
        <ul className="divide-y divide-gray-700 mb-4">
          {players.map((p) => (
            <li
              key={p}
              className={`py-2 text-center ${
                p === host ? "text-yellow-400" : "text-gray-200"
              }`}
            >
              {p} {p === host && "(Host)"}
            </li>
          ))}
        </ul>

        {/* Step 1: Submit Word */}
        {!wordSubmitted && !allSubmitted && (
          <div className="flex flex-col gap-3">
            <input
              value={word}
              onChange={(e) => setWord(e.target.value.toUpperCase())}
              maxLength={5}
              placeholder="Enter 5-letter word"
              className="text-center uppercase tracking-widest text-lg p-3 rounded-lg text-white"
            />
            <button
              onClick={handleSubmitWord}
              className="bg-emerald-500 hover:bg-emerald-600 py-2 rounded-lg font-semibold"
            >
              Submit Word
            </button>
          </div>
        )}

        {/* Step 2: Start Game */}
        {isHost && allSubmitted && !gameStarted && (
          <button
            onClick={handleStartGame}
            className="w-full mt-3 bg-yellow-500 hover:bg-yellow-600 text-black py-2 rounded-lg font-semibold"
          >
            Start Game
          </button>
        )}

        {/* Step 3: Game Grid */}
        {gameStarted && assignedWord && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3 text-center">
              Guess the 5-letter word
            </h3>

            <div className="space-y-2 mb-4">
              {guesses.map((g, idx) => {
                const colors = getGuessFeedback(g, assignedWord);
                return (
                  <div
                    key={idx}
                    className="flex justify-center gap-2 uppercase tracking-widest"
                  >
                    {g.split("").map((ch, i) => (
                      <span
                        key={i}
                        className={`w-10 h-10 flex items-center justify-center rounded font-bold text-lg
                          ${
                            colors[i] === "green"
                              ? "bg-green-600"
                              : colors[i] === "yellow"
                              ? "bg-yellow-500"
                              : "bg-gray-700"
                          }`}
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>

            {guesses.length < maxAttempts &&
              !finished.includes(username) &&
              !failed.includes(username) && (
                <div className="flex gap-3">
                  <input
                    value={currentGuess}
                    onChange={(e) =>
                      setCurrentGuess(e.target.value.toUpperCase())
                    }
                    maxLength={5}
                    placeholder="Enter guess"
                    className="flex-1 text-center uppercase tracking-widest text-lg p-3 rounded-lg text-black"
                  />
                  <button
                    onClick={handleGuessSubmit}
                    className="bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg font-semibold"
                  >
                    Guess
                  </button>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Status Lists */}
      <div className="mt-6 grid grid-cols-3 gap-10">
        <div>
          <h3 className="text-lg font-bold text-blue-400 mb-2">🕹️ Attempting</h3>
          <ul className="text-gray-200 text-sm space-y-1">
            {attempting.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-bold text-green-400 mb-2">✅ Finished</h3>
          <ul className="text-gray-200 text-sm space-y-1">
            {finished.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-bold text-red-400 mb-2">❌ Failed</h3>
          <ul className="text-gray-200 text-sm space-y-1">
            {failed.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </div>

      <button
        onClick={handleLeaveRoom}
        className="text-gray-400 hover:text-red-400 mt-8 text-sm"
      >
        Leave Room
      </button>
    </div>
  );
}
