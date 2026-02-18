import { io } from "socket.io-client";
import { getStoredAccessToken } from "../utils/authSession";

export const socket = io("http://localhost:8000", {
  autoConnect: false,
  auth: (cb) => {
    cb({ token: getStoredAccessToken() });
  },
});

export function connectSocket() {
  if (!socket.connected) socket.connect();
}
