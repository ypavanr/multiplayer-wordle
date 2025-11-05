// src/socket.js
import { io } from "socket.io-client";

export const socket = io("https://multiplayer-wordle-pvla.onrender.com", {
  autoConnect: false,           // connect manually after login
  reconnection: true,
  reconnectionAttempts: 5,
  transports: ["websocket"],
});
