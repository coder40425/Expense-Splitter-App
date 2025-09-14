// src/config/api.ts
// Priority order: 1. Environment variable, 2. Auto-detection, 3. Fallback
const API_BASE_URL = 
  import.meta.env.VITE_API_URL ||                     // Explicit env var (highest priority)
  (import.meta.env.PROD || 
   import.meta.env.MODE === "production" ||
   window.location.hostname !== "localhost"
     ? 'https://expense-splitter-app-6gc3.onrender.com' // Auto-detect production
     : 'http://localhost:5000');                       // Local development

export const API_ENDPOINTS = {
  auth: `${API_BASE_URL}/api/auth`,
  groups: `${API_BASE_URL}/api/groups`,
  expenses: `${API_BASE_URL}/api/expenses`,
  chat: `${API_BASE_URL}/api/chat`,
};

export const SOCKET_URL = API_BASE_URL;

// Export the base URL for direct usage in components
export { API_BASE_URL };

// Debug logging (remove after deployment is working)
console.log('API Configuration:', {
  'VITE_API_URL': import.meta.env.VITE_API_URL,
  'PROD': import.meta.env.PROD,
  'MODE': import.meta.env.MODE,
  'hostname': window.location.hostname,
  'Final API_BASE_URL': API_BASE_URL
});
