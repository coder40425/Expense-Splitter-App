// src/socket.ts
import { io } from "socket.io-client";
import { SOCKET_URL } from './config/api';

const socket = io(SOCKET_URL, {
  withCredentials: true,
  transports: ['websocket', 'polling'],
});

export default socket; // Default export

// Or if you're using it directly in a component:
// const socket = io(SOCKET_URL, { withCredentials: true });