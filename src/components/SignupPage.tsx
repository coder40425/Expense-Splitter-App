import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Mail, Lock, User, Eye, EyeOff, Moon, Sun } from 'lucide-react';
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from '../config/api';

interface SignupPageProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  onNavigate: (path: string) => void;
  setUserName: React.Dispatch<React.SetStateAction<string>>;
}

export default function SignupPage({ onNavigate, isDarkMode, toggleTheme }: SignupPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
      `${API_ENDPOINTS.auth}/signup`,
      { name: formData.name,
        email: formData.email,
        password: formData.password,
  }
);
      // Show success notification with better styling
      toast.success(`🎉 Account created successfully! Welcome ${formData.name}!`, {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: isDarkMode ? "dark" : "light",
        style: {
          background: isDarkMode ? "linear-gradient(135deg, #065f46, #047857)" : "linear-gradient(135deg, #f0fdf4, #dcfce7)",
          color: isDarkMode ? "#ffffff" : "#065f46",
          borderRadius: "16px",
          border: `1px solid ${isDarkMode ? "#10b981" : "#84cc16"}`,
          fontSize: "16px",
          fontWeight: "600",
        }
      });

      // Follow-up notification to login
      setTimeout(() => {
        toast.info("🔑 Please login with your credentials to continue", {
          position: "top-center",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: isDarkMode ? "dark" : "light",
          style: {
            background: isDarkMode ? "linear-gradient(135deg, #1e40af, #3b82f6)" : "linear-gradient(135deg, #eff6ff, #dbeafe)",
            color: isDarkMode ? "#ffffff" : "#1e40af",
            borderRadius: "16px",
            border: `1px solid ${isDarkMode ? "#3b82f6" : "#93c5fd"}`,
            fontSize: "15px",
            fontWeight: "500",
          }
        });
      }, 1500);

      // Navigate to login page
      if (onNavigate) {
        onNavigate('login'); // For standalone component usage
      } else {
        navigate('/login'); // For router usage
      }
    } catch (err) {
      console.error("Signup failed:", err.response?.data || err.message);
      
      // Enhanced error notifications with better styling
      let errorMessage = "Signup failed! Please try again.";
      
      if (err.response?.status === 400) {
        if (err.response.data?.message?.includes('email')) {
          errorMessage = "📧 This email is already registered. Please login instead.";
        } else if (err.response.data?.message?.includes('password')) {
          errorMessage = "🔒 Password must be at least 6 characters long.";
        } else if (err.response.data?.message?.includes('name')) {
          errorMessage = "👤 Please enter a valid name.";
        } else {
          errorMessage = `❌ ${err.response.data.message}`;
        }
      } else if (err.response?.status === 409) {
        errorMessage = "📧 Account already exists! Please login instead.";
      } else if (err.response?.status === 429) {
        errorMessage = "⏰ Too many signup attempts. Please try again later.";
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      {/* Dynamic Gradient Background */}
      <div className={`absolute inset-0 transition-all duration-1000 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900' 
          : 'bg-gradient-to-br from-pink-900 via-purple-900 to-blue-900'
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
      
      {/* Animated Background Elements */}
      <motion.div
        className="absolute top-32 right-20 w-40 h-40 rounded-full opacity-40"
        style={{
          background: 'linear-gradient(45deg, #ec4899, #8b5cf6, #06b6d4)',
          filter: 'blur(50px)',
        }}
        animate={{
          y: [0, -25, 0],
          x: [0, 10, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute bottom-20 left-16 w-28 h-28 rounded-full opacity-35"
        style={{
          background: 'linear-gradient(135deg, #06b6d4, #ec4899)',
          filter: 'blur(35px)',
        }}
        animate={{
          y: [0, 20, 0],
          x: [0, -15, 0],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Signup Card */}
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <motion.div
          className="backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/25 relative"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.08))',
          }}
          whileHover={{ 
            scale: 1.01,
            boxShadow: '0 0 50px rgba(236, 72, 153, 0.3)',
          }}
          transition={{ duration: 0.3 }}
        >
          {/* Glowing Border Effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20 blur-sm" />
          
          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                className="text-4xl mb-2"
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, -5, 5, 0] 
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                ✨
              </motion.div>
              <h1 
                className="text-3xl mb-2 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent"
                style={{ fontWeight: 'bold' }}
              >
                Join Expense Splitter
              </h1>
              <p className="text-white/80">Create your account and start splitting!</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {/* Name Field */}
                <div className="relative">
                  <Label htmlFor="name" className="text-white/90 mb-2 block">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="pl-12 bg-white/10 border-white/25 text-white placeholder-white/50 rounded-2xl h-12 backdrop-blur-sm focus:border-pink-400 focus:ring-2 focus:ring-pink-400/50 transition-all duration-300"
                      placeholder="Enter your full name"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

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
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="pl-12 bg-white/10 border-white/25 text-white placeholder-white/50 rounded-2xl h-12 backdrop-blur-sm focus:border-pink-400 focus:ring-2 focus:ring-pink-400/50 transition-all duration-300"
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
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="pl-12 pr-12 bg-white/10 border-white/25 text-white placeholder-white/50 rounded-2xl h-12 backdrop-blur-sm focus:border-pink-400 focus:ring-2 focus:ring-pink-400/50 transition-all duration-300"
                      placeholder="Create a password"
                      required
                      disabled={loading}
                      minLength={6}
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

              {/* Create Account Button */}
              <motion.div
                whileHover={!loading ? { scale: 1.02 } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
              >
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-2xl text-white relative overflow-hidden border-0 disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6, #06b6d4)',
                    boxShadow: '0 0 40px rgba(236, 72, 153, 0.6)',
                  }}
                >
                  <motion.span 
                    className="relative z-10"
                    animate={!loading ? { y: [0, -2, 0] } : {}}
                    transition={!loading ? { duration: 2, repeat: Infinity } : {}}
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Creating Account...</span>
                      </div>
                    ) : (
                      'Create Account'
                    )}
                  </motion.span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 opacity-0"
                    whileHover={{ opacity: loading ? 0 : 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </Button>
              </motion.div>

              {/* Login Link */}
              <div className="text-center">
                {onNavigate ? (
                  <button
                    type="button"
                    onClick={() => onNavigate('login')}
                    className="text-white/70 hover:text-white transition-colors relative group"
                    disabled={loading}
                  >
                    Already have an account? Login
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-400 to-purple-400 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                    />
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="text-white/70 hover:text-white transition-colors relative group"
                  >
                    Already have an account? Login
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-400 to-purple-400 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                    />
                  </Link>
                )}
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
