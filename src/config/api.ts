// src/config/api.ts

// src/config/api.ts
const API_BASE_URL = import.meta.env.MODE === "production"
  ? 'https://expense-splitter-app-6gc3.onrender.com' // Live backend for production
  : 'http://localhost:5000'; // Local backend for development

export const API_ENDPOINTS = {
  auth: `${API_BASE_URL}/api/auth`,
  groups: `${API_BASE_URL}/api/groups`,
  expenses: `${API_BASE_URL}/api/expenses`,
  chat: `${API_BASE_URL}/api/chat`,
};

export const SOCKET_URL = API_BASE_URL;
