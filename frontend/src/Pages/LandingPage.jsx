import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { nanoid } from "nanoid";
import { socket } from "../socket";

// --- Helper Components ---
const LetterBox = ({ char, colorClass, size = "md" }) => {
  const sizeClasses = {
    md: "w-14 h-14 sm:w-16 sm:h-16 text-3xl sm:text-4xl",
    sm: "w-10 h-10 sm:w-12 sm:h-12 text-2xl sm:text-3xl",
  };
  return (
    <div
      className={`flex items-center justify-center font-bold uppercase rounded-md ${sizeClasses[size]} ${colorClass}`}
    >
      {char}
    </div>
  );
};

const WordleHeader = () => (
  <div className="flex gap-2 mb-4">
    <LetterBox char="W" colorClass="bg-green-600 border-2 border-green-600" />
    <LetterBox char="O" colorClass="border-2 border-gray-500" />
    <LetterBox char="R" colorClass="bg-yellow-500 border-2 border-yellow-500" />
    <LetterBox char="D" colorClass="border-2 border-gray-500" />
    <LetterBox char="L" colorClass="bg-green-600 border-2 border-green-600" />
    <LetterBox char="E" colorClass="border-2 border-gray-500" />
  </div>
);

const ThemedButton = ({ onClick, children, className = "", type = "button", disabled }) => (
  <button
    onClick={onClick}
    type={type}
    disabled={disabled}
    className={`w-full p-4 text-white text-lg font-bold uppercase rounded-lg
               transition duration-200 shadow-lg disabled:opacity-50
               focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
               ${className}`}
  >
    {children}
  </button>
);

// --- Login Screen ---
const LoginScreen = ({ onLogin }) => {
  const [localUsername, setLocalUsername] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = localUsername.trim();
    if (trimmed) onLogin(trimmed);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex flex-col items-center gap-4">
        <WordleHeader />
        <h1 className="text-3xl sm:text-4xl font-extrabold uppercase text-center">
          Multiplayer Wordle
        </h1>
        <p className="text-gray-400 text-lg text-center mb-6">
          Enter a username to begin.
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <input
            type="text"
            value={localUsername}
            onChange={(e) => setLocalUsername(e.target.value)}
            placeholder="Your Username"
            required
            className="w-full p-4 bg-gray-800 border-2 border-gray-600 rounded-lg text-white text-lg
                       placeholder-gray-500 transition duration-200
                       focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500"
          />
          <ThemedButton
            type="submit"
            className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
            disabled={!localUsername.trim()}
          >
            Enter
          </ThemedButton>
        </form>
      </div>
    </div>
  );
};

// --- Menu Screen ---
const MenuScreen = ({ username, onLogout }) => {
  const navigate = useNavigate();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomCode, setRoomCode] = useState("");

  const handleCreateRoom = () => {
    const newRoomId = nanoid(6).toUpperCase();
    navigate(`/room/${newRoomId}`);
  };

  const handleJoinRoom = () => setShowJoinModal(true);

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    navigate(`/room/${roomCode.trim().toUpperCase()}`);
    setShowJoinModal(false);
  };

  return (
    <div className="w-full max-w-md mx-auto relative">
      <div className="flex flex-col items-center gap-6">
        <div className="flex gap-1.5 mb-2">
          <LetterBox char="W" colorClass="bg-green-600" size="sm" />
          <LetterBox char="O" colorClass="bg-gray-700" size="sm" />
          <LetterBox char="R" colorClass="bg-yellow-500" size="sm" />
          <LetterBox char="D" colorClass="bg-gray-700" size="sm" />
          <LetterBox char="E" colorClass="bg-green-600" size="sm" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-center">
          Welcome, <span className="text-green-400">{username}</span>!
        </h2>

        <div className="w-full flex flex-col gap-4 mt-4">
          <ThemedButton
            onClick={handleCreateRoom}
            className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
          >
            Create Room
          </ThemedButton>

          <ThemedButton
            onClick={handleJoinRoom}
            className="bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400"
          >
            Join Room
          </ThemedButton>
        </div>

        <button
          onClick={onLogout}
          className="text-gray-500 hover:text-red-400 transition duration-200 mt-6"
        >
          Not {username}? Logout
        </button>
      </div>

      {/* ✅ Join Room Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
          <div className="bg-neutral-800 rounded-2xl p-6 w-80 flex flex-col gap-4 shadow-lg">
            <h3 className="text-xl font-bold text-center text-yellow-400">Join Room</h3>
            <form onSubmit={handleJoinSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Enter Room Code"
                maxLength={6}
                className="text-center uppercase tracking-widest text-lg p-3 rounded-lg text-black"
              />
              <button
                type="submit"
                className="bg-yellow-500 hover:bg-yellow-600 py-2 rounded-lg font-semibold text-neutral-900"
              >
                Join
              </button>
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                className="text-gray-400 hover:text-red-400 text-sm mt-1"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main Component ---
export default function LandingPage() {
  const [page, setPage] = useState("loading");
  const [username, setUsername] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("wordle-username");
    if (saved) {
      setUsername(saved);
      setPage("menu");
    } else {
      setPage("login");
    }
  }, []);

  // connect socket after login
  useEffect(() => {
    if (!username) return;
    if (!socket.connected) {
      socket.auth = { username };
      socket.connect();
      socket.on("connect", () =>
        console.log(`✅ Connected as ${username} (id: ${socket.id})`)
      );
      socket.on("disconnect", (reason) =>
        console.log(`❌ Disconnected: ${reason}`)
      );
    }
    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [username]);

  const handleLogin = (name) => {
    localStorage.setItem("wordle-username", name.trim());
    setUsername(name.trim());
    setPage("menu");
  };

  const handleLogout = () => {
    localStorage.removeItem("wordle-username");
    setUsername("");
    socket.disconnect();
    setPage("login");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-100 font-sans p-4">
      {page === "login" ? (
        <LoginScreen onLogin={handleLogin} />
      ) : page === "menu" ? (
        <MenuScreen username={username} onLogout={handleLogout} />
      ) : (
        <h1 className="text-2xl font-bold text-gray-400">Loading...</h1>
      )}
    </div>
  );
}
