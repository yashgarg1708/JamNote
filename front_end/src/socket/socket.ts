import { io } from "socket.io-client";
import { getStoredAccessToken } from "../utils/authSession";
import { SOCKET_URL } from "../config/env";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: (cb) => {
    cb({ token: getStoredAccessToken() });
  },
});

export function connectSocket() {
  if (!socket.connected) socket.connect();
}
