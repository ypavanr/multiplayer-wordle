// src/socket.js
import { io } from "socket.io-client";

export const socket = io("http://localhost:3000", {
  autoConnect: false,           // connect manually after login
  reconnection: true,
  reconnectionAttempts: 5,
  transports: ["websocket"],
});
