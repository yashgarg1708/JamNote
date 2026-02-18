import axios from "axios";
import {
  clearStoredSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredAccessToken,
} from "../utils/authSession";

export const api = axios.create({
  baseURL: "http://localhost:8000/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401, then retry once
let isRefreshing = false;
let queue: Array<(token: string | null) => void> = [];

function flushQueue(token: string | null) {
  queue.forEach((cb) => cb(token));
  queue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const status = err?.response?.status;
    const path = String(original?.url ?? "");

    if (status !== 401 || original?._retry) {
      return Promise.reject(err);
    }

    if (path.includes("/auth/refresh")) {
      clearStoredSession();
      return Promise.reject(err);
    }

    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push((token) => {
          if (!token) return reject(err);
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      clearStoredSession();
      return Promise.reject(err);
    }

    isRefreshing = true;
    try {
      const r = await api.post("/auth/refresh", { refreshToken });
      const newToken = r.data.accessToken as string;
      if (!newToken) throw new Error("Missing access token");

      setStoredAccessToken(newToken);

      flushQueue(newToken);

      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (e) {
      clearStoredSession();
      flushQueue(null);
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  },
);
