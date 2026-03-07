function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function inferDefaultApiOrigin() {
  if (typeof window === "undefined") return "http://localhost:8000";

  const { origin, hostname, port } = window.location;
  if (hostname === "localhost" && port === "5173") {
    return "http://localhost:8000";
  }

  return origin;
}

const defaultApiOrigin = inferDefaultApiOrigin();

export const API_ORIGIN = trimTrailingSlash(
  String(import.meta.env.VITE_API_ORIGIN || defaultApiOrigin),
);

export const API_BASE_URL = `${API_ORIGIN}/api`;

export const SOCKET_URL = trimTrailingSlash(
  String(import.meta.env.VITE_SOCKET_URL || API_ORIGIN),
);
