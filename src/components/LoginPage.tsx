import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Mail, Lock, Eye, EyeOff, Moon, Sun } from 'lucide-react';
import { toast } from 'react-toastify';
import socket from '../socket';
import { setAuthData } from '../utils/auth';
import { API_ENDPOINTS } from '../config/api';

interface LoginPageProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  onNavigate: (path: string) => void;
  setUserName: React.Dispatch<React.SetStateAction<string>>;
}

export default function LoginPage({ onNavigate, isDarkMode, toggleTheme }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        `${API_ENDPOINTS.auth}/login`,
     { email, password }
);

      // Store auth data in localStorage via your utility
      setAuthData(res.data.user, res.data.token);
      
      // Connect socket and join user room
      socket.connect();
      socket.emit("joinUser", res.data.user._id);

      // Show success notification with better styling and longer duration
      toast.success(`🎉 Welcome back, ${res.data.user.name}!`, {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: isDarkMode ? "dark" : "light",
        style: {
          background: isDarkMode ? "linear-gradient(135deg, #1f2937, #374151)" : "linear-gradient(135deg, #ffffff, #f3f4f6)",
          color: isDarkMode ? "#ffffff" : "#1f2937",
          borderRadius: "16px",
          border: `1px solid ${isDarkMode ? "#6b7280" : "#d1d5db"}`,
          fontSize: "16px",
          fontWeight: "600",
        }
      });

      // Navigate to dashboard
      if (onNavigate) {
        onNavigate('dashboard'); // For standalone component usage
      } else {
        navigate('/dashboard'); // For router usage
      }
    } catch (err) {
      console.error("Login failed:", err.response?.data || err.message);
      
      // Enhanced error notifications with better styling
      let errorMessage = "Login failed! Please check your credentials.";
      
      if (err.response?.status === 401) {
        errorMessage = "❌ Invalid email or password. Please try again.";
      } else if (err.response?.status === 404) {
        errorMessage = "❌ Account not found. Please check your email or sign up.";
      } else if (err.response?.status === 429) {
        errorMessage = "⏰ Too many attempts. Please try again later.";
      } else if (err.response?.data?.message) {
        errorMessage = `❌ ${err.response.data.message}`;
      } else if (err.code === 'NETWORK_ERROR') {
        errorMessage = "🌐 Network error. Please check your connection.";
      }

      toast.error(errorMessage, {
        position: "top-center",
        autoClose: 6000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: isDarkMode ? "dark" : "light",
        style: {
          background: isDarkMode ? "linear-gradient(135deg, #7f1d1d, #991b1b)" : "linear-gradient(135deg, #fef2f2, #fee2e2)",
          color: isDarkMode ? "#ffffff" : "#7f1d1d",
          borderRadius: "16px",
          border: `1px solid ${isDarkMode ? "#dc2626" : "#f87171"}`,
          fontSize: "15px",
          fontWeight: "500",
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      {/* Dynamic Gradient Background */}
      <div className={`absolute inset-0 transition-all duration-1000 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-black' 
          : 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900'
      }`} />

      {/* Theme Toggle Button - Top Right */}
      <motion.div 
        className="fixed top-6 right-6 z-20"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={toggleTheme}
            variant="ghost"
            size="sm"
            className={`rounded-2xl backdrop-blur-xl border transition-all duration-300 ${
              isDarkMode 
                ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10 bg-gray-800/30 border-gray-700/30' 
                : 'text-purple-300 hover:text-purple-200 hover:bg-purple-400/10 bg-white/10 border-white/20'
            }`}
            style={{
              boxShadow: isDarkMode 
                ? '0 8px 32px rgba(0, 0, 0, 0.3)' 
                : '0 8px 32px rgba(139, 92, 246, 0.1)',
            }}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </motion.div>
      </motion.div>
      
      {/* Floating 3D Shapes */}
      <motion.div
        className="absolute top-20 left-20 w-32 h-32 rounded-full opacity-30"
        style={{
          background: 'linear-gradient(45deg, #8b5cf6, #ec4899)',
          filter: 'blur(40px)',
        }}
        animate={{
          y: [0, -20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute bottom-32 right-32 w-24 h-24 rounded-full opacity-25"
        style={{
          background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
          filter: 'blur(30px)',
        }}
        animate={{
          y: [0, 15, 0],
          x: [0, -10, 0],
          scale: [1, 0.9, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div
          className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 shadow-2xl border border-white/20"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              className="text-4xl mb-2"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              💰
            </motion.div>
            <h1 
              className="text-3xl mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent"
              style={{ fontWeight: 'bold' }}
            >
              Welcome Back
            </h1>
            <p className="text-white/70">Sign in to your expense splitter</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Email Field */}
              <div className="relative">
                <Label htmlFor="email" className="text-white/90 mb-2 block">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 bg-white/10 border-white/20 text-white placeholder-white/50 rounded-2xl h-12 backdrop-blur-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 transition-all duration-300"
                    placeholder="Enter your email"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="relative">
                <Label htmlFor="password" className="text-white/90 mb-2 block">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-12 bg-white/10 border-white/20 text-white placeholder-white/50 rounded-2xl h-12 backdrop-blur-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 transition-all duration-300"
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Sign In Button */}
            <motion.div
              whileHover={!loading ? { scale: 1.02 } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
            >
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl text-white relative overflow-hidden border-0 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899, #06b6d4)',
                  boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)',
                }}
              >
                <span className="relative z-10">
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Signing In...</span>
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0"
                  whileHover={{ opacity: loading ? 0 : 1 }}
                  transition={{ duration: 0.3 }}
                />
              </Button>
            </motion.div>

            {/* Signup Link */}
            <div className="text-center">
              {onNavigate ? (
                <button
                  type="button"
                  onClick={() => onNavigate('signup')}
                  className="text-white/70 hover:text-white transition-colors relative group"
                  disabled={loading}
                >
                  New here? Create an account
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                  />
                </button>
              ) : (
                <Link
                  to="/signup"
                  className="text-white/70 hover:text-white transition-colors relative group"
                >
                  New here? Create an account
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                  />
                </Link>
              )}
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
