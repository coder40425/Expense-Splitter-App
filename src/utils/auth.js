// utils/auth.js

// Save user and token
export const setAuthData = (user, token) => {
  if (!user || !token) return;
  const userStr = JSON.stringify(user);

  sessionStorage.setItem("user", userStr);
  sessionStorage.setItem("token", token);

  // Persist across sessions
  localStorage.setItem("user", userStr);
  localStorage.setItem("token", token);
};

// Get token (checks sessionStorage first, then localStorage)
export const getAuthToken = () => {
  return sessionStorage.getItem("token") || localStorage.getItem("token");
};

// Get logged-in user info
export const getAuthUser = () => {
  const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
};

// Clear auth data (logout)
export const clearAuthData = () => {
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("token");
};
