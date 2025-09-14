import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import Dashboard from "./components/Dashboard";
import GroupDetails from "./components/GroupDetails";
import FloatingParticles from "./components/FloatingParticles";
import { ToastContainer } from "react-toastify";

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userName, setUserName] = useState("Yash");

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDarkMode]);

  return (
    <Router>
      <FloatingParticles isDarkMode={isDarkMode} />

      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />

        <Route
          path="/login"
          element={
            <LoginPage
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
              onNavigate={(path) => window.location.assign(path)}
              setUserName={setUserName}
            />
          }
        />

        <Route
          path="/signup"
          element={
            <SignupPage
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
              onNavigate={(path) => window.location.assign(path)}
              setUserName={setUserName}
            />
          }
        />

        <Route
          path="/dashboard"
          element={
            <Dashboard
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
              userName={userName}
              onNavigate={(path) => window.location.assign(path)}
            />
          }
        />

        <Route
          path="/groups/:groupId"
          element={
            <GroupDetails
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
              onNavigate={(path) => window.location.assign(path)}
            />
          }
        />

        <Route path="*" element={<h1>404 - Page Not Found</h1>} />
      </Routes>

      <ToastContainer />
    </Router>
  );
};

export default App;
