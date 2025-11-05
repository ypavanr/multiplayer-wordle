// backend/src/socket.js
export default function setupSocket(io) {
  const rooms = {};
  // rooms[roomId] = {
  //   host: string,
  //   players: string[],
  //   words: { [username]: string },
  //   assignedWords: { [username]: string },
  //   finished: string[],
  //   failed: string[],
  // }

  io.on("connection", (socket) => {
    const username = socket.handshake.auth?.username || "Anonymous";
    console.log(`[+] ${username} connected`);

    const emitRoomData = (roomId) => {
      const room = rooms[roomId];
      if (!room) return;
      io.to(roomId).emit("room-data", {
        roomId,
        host: room.host,
        players: [...room.players],
      });
    };

    const emitProgress = (roomId) => {
      const room = rooms[roomId];
      if (!room) return;
      io.to(roomId).emit("game-progress", {
        finished: [...room.finished],
        failed: [...room.failed],
      });
    };

    // --- CREATE / JOIN ROOM ---
    socket.on("join-room", ({ roomId, username }) => {
      roomId = (roomId || "").toUpperCase();
      if (!roomId || !username) return;

      let room = rooms[roomId];
      if (!room) {
        room = {
          host: username,
          players: [],
          words: {},
          assignedWords: {},
          finished: [],
          failed: [],
        };
        rooms[roomId] = room;
        console.log(`🆕 Room ${roomId} created by ${username}`);
      }

      if (!room.players.includes(username)) room.players.push(username);
      socket.join(roomId);

      emitRoomData(roomId);
      emitProgress(roomId);
      console.log(`👥 ${username} joined room ${roomId}`);
    });

    // --- SUBMIT WORD ---
    socket.on("submit-word", ({ roomId, username, word }) => {
      roomId = (roomId || "").toUpperCase();
      const room = rooms[roomId];
      if (!room || !room.players.includes(username)) return;
      if (typeof word !== "string") return;

      const W = word.toUpperCase();
      if (!/^[A-Z]{5}$/.test(W)) {
        socket.emit("error-message", "Word must be exactly 5 letters (A–Z).");
        return;
      }

      room.words[username] = W;
      console.log(`✍️ ${username} submitted word "${W}" in ${roomId}`);

      const allSubmitted = room.players.every((p) => !!room.words[p]);

      io.to(roomId).emit("word-submitted", {
        username,
        wordCount: Object.keys(room.words).length,
        total: room.players.length,
      });

      if (allSubmitted) {
        // Shuffle then circular shift A→B→C→A (no one gets their own unless n==1)
        const shuffled = [...room.players];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        room.assignedWords = {};
        for (let i = 0; i < shuffled.length; i++) {
          const giver = shuffled[i];
          const receiver = shuffled[(i + 1) % shuffled.length];
          room.assignedWords[receiver] = room.words[giver];
        }

        io.to(roomId).emit("all-words-submitted", {
          assignedWords: room.assignedWords,
        });

        console.log(`✅ All words submitted in ${roomId}. Assigned circularly.`);
      }
    });

    // --- START GAME (Host only) ---
    socket.on("start-game", ({ roomId }) => {
      roomId = (roomId || "").toUpperCase();
      const room = rooms[roomId];
      if (!room) return;

      if (Object.keys(room.words).length !== room.players.length) {
        io.to(roomId).emit("error-message", "Not all players have submitted words!");
        return;
      }

      io.to(roomId).emit("start-game", {
        roomId,
        assignedWords: room.assignedWords,
      });
      console.log(`🚀 Game started in room ${roomId}`);
    });

    // --- PLAYER RESULT (single event) ---
    socket.on("player-finished", ({ roomId, username, success }) => {
      roomId = (roomId || "").toUpperCase();
      const room = rooms[roomId];
      if (!room) return;

      // Remove from both lists first to avoid conflicts
      room.finished = room.finished.filter((p) => p !== username);
      room.failed = room.failed.filter((p) => p !== username);

      if (success) {
        if (!room.finished.includes(username)) room.finished.push(username);
      } else {
        if (!room.failed.includes(username)) room.failed.push(username);
      }

      emitProgress(roomId);
    });

    // (Optional) Back-compat if you still emit "player-failed" anywhere
    socket.on("player-failed", ({ roomId, username }) => {
      roomId = (roomId || "").toUpperCase();
      const room = rooms[roomId];
      if (!room) return;
      room.finished = room.finished.filter((p) => p !== username);
      if (!room.failed.includes(username)) room.failed.push(username);
      emitProgress(roomId);
    });

    // --- LEAVE ROOM ---
    socket.on("leave-room", ({ roomId, username }) => {
      roomId = (roomId || "").toUpperCase();
      const room = rooms[roomId];
      if (!room) return;

      room.players = room.players.filter((p) => p !== username);
      delete room.words[username];
      delete room.assignedWords[username];
      room.finished = room.finished.filter((p) => p !== username);
      room.failed = room.failed.filter((p) => p !== username);
      socket.leave(roomId);

      // If host left, promote next player (if any)
      if (room.host === username && room.players.length > 0) {
        room.host = room.players[0];
      }

      console.log(`🚪 ${username} left room ${roomId}`);

      if (room.players.length === 0) {
        delete rooms[roomId];
        console.log(`🧹 Room ${roomId} deleted (empty)`);
      } else {
        emitRoomData(roomId);
        emitProgress(roomId);
      }
    });

    // --- DISCONNECT CLEANUP ---
    socket.on("disconnect", () => {
      console.log(`[-] ${username} disconnected`);
      for (const [roomId, room] of Object.entries(rooms)) {
        if (!room.players.includes(username)) continue;

        room.players = room.players.filter((p) => p !== username);
        delete room.words[username];
        delete room.assignedWords[username];
        room.finished = room.finished.filter((p) => p !== username);
        room.failed = room.failed.filter((p) => p !== username);

        if (room.host === username && room.players.length > 0) {
          room.host = room.players[0];
        }

        if (room.players.length === 0) {
          delete rooms[roomId];
        } else {
          emitRoomData(roomId);
          emitProgress(roomId);
        }
      }
    });
  });
}
