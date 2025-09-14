// utils/ProtectedRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import { getAuthToken } from "./auth";

const ProtectedRoute = ({ children }) => {
  const token = getAuthToken();

  if (!token) {
    // Not logged in → redirect to login
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
