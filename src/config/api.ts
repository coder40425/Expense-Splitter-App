// src/utils/api.ts

// Use your VITE_API_URL from .env
const API_BASE_URL = import.meta.env.MODE === "production"
  ? import.meta.env.VITE_API_URL   // from .env.production
  : "http://localhost:5000";       // dev fallback

export const API_ENDPOINTS = {
  auth: `${API_BASE_URL}/api/auth`,
  groups: `${API_BASE_URL}/api/groups`,
  expenses: `${API_BASE_URL}/api/expenses`,
  chat: `${API_BASE_URL}/api/chat`,
};

export const SOCKET_URL = API_BASE_URL;
