//Dashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { getAuthToken, getAuthUser, clearAuthData } from "../utils/auth";
import { Plus, Users, Sparkles, Bell, Settings, LogOut, Sun, Moon, X, Loader2, Menu } from "lucide-react";

interface DashboardProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  userName: string;
  onNavigate: (path: string) => void;
}


type Group = {
    _id: string;
    name: string;
    members?: string[];
};

const Dashboard = () => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('darkMode');
        return saved !== null ? JSON.parse(saved) : false;
    });
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // Create Group Form State
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [members, setMembers] = useState([""]);
    const [isCreating, setIsCreating] = useState(false);
    
    const navigate = useNavigate();
    const user = getAuthUser();
    const userName = user?.name || "User";

    // Get API URL - fix for undefined environment variable
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    // Fetch groups from backend
    useEffect(() => {
        const fetchGroups = async () => {
            try {
                setIsLoading(true);
                const token = getAuthToken();
                if (!token) {
                    navigate('/login');
                    return;
                }

                const res = await axios.get(`${API_URL}/api/groups`, {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                });
                
                console.log('Fetched groups:', res.data); // Debug log
                setGroups(res.data || []);
            } catch (err) {
                console.error("Error fetching groups:", err);
                
                // Handle different error scenarios
                if (err.response?.status === 401) {
                    clearAuthData();
                    navigate('/login');
                    toast.error("Session expired. Please login again.");
                } else if (err.response?.status === 404) {
                    // No groups found is not an error
                    setGroups([]);
                } else {
                    const errorMessage = err.response?.data?.message || "Failed to fetch groups";
                    toast.error(errorMessage);
                    setGroups([]);
                }
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchGroups();
    }, []); // Remove navigate from dependency array to prevent infinite loops

    // Theme toggle
    const toggleTheme = () => {
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);
        localStorage.setItem('darkMode', JSON.stringify(newTheme));
    };

    // Logout handler
    const handleLogout = () => {
        clearAuthData();
        navigate('/login');
        toast.success("Logged out successfully");
    };

    // Create Group Functions
    const addMember = () => {
        setMembers([...members, ""]);
    };

    const removeMember = (index) => {
        if (members.length > 1) {
            setMembers(members.filter((_, i) => i !== index));
        }
    };

    const updateMember = (index, value) => {
        const newMembers = [...members];
        newMembers[index] = value;
        setMembers(newMembers);
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        
        if (!groupName.trim()) {
            toast.error("Please enter a group name");
            return;
        }

        setIsCreating(true);
        try {
            const token = getAuthToken();
            if (!token) {
                navigate('/login');
                return;
            }

            // Filter out empty members and validate emails
            const filteredMembers = members
                .filter(member => member.trim() !== "")
                .map(member => member.trim().toLowerCase());

            // Basic email validation for non-empty members
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            for (const member of filteredMembers) {
                if (!emailRegex.test(member)) {
                    toast.error(`Please enter a valid email address for: ${member}`);
                    setIsCreating(false);
                    return;
                }
            }
            
            // Step 1: Create the group first (without members)
            const groupData = {
                name: groupName.trim()
            };

            console.log('Creating group with:', groupData);

            const res = await axios.post(
                `${API_URL}/api/groups`,
                groupData,
                {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                }
            );

            console.log('Group created:', res.data);
            const newGroup = res.data;
            const groupId = newGroup._id;

            // Step 2: Add members to the created group (if any)
            let memberAddedCount = 0;
            const memberErrors = [];

            for (const memberEmail of filteredMembers) {
                try {
                    await axios.post(
                        `${API_URL}/api/groups/${groupId}/members`,
                        {
                            email: memberEmail.trim()
                        },
                        {
                            headers: { 
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                        }
                    );
                    memberAddedCount++;
                    console.log(`Member ${memberEmail} added successfully`);
                } catch (memberErr) {
                    console.error(`Error adding member ${memberEmail}:`, memberErr);
                    memberErrors.push(`${memberEmail}: ${memberErr.response?.data?.message || 'Failed to add'}`);
                }
            }

            // Step 3: Update the local state with the new group
            setGroups(prev => [newGroup, ...prev]);
            
            // Reset form
            setGroupName("");
            setMembers([""]);
            setShowCreateForm(false);
            
            // Step 4: Show success/error messages
            let successMessage = "Group created successfully!";
            
            if (filteredMembers.length > 0) {
                if (memberAddedCount > 0) {
                    successMessage += ` ${memberAddedCount} member${memberAddedCount > 1 ? 's' : ''} invited.`;
                }
                
                // Show member addition errors if any
                if (memberErrors.length > 0) {
                    setTimeout(() => {
                        memberErrors.forEach(error => {
                            toast.warn(`Invite failed - ${error}`, {
                                position: "top-right",
                                autoClose: 6000,
                            });
                        });
                    }, 1000);
                }
            }
            
            toast.success(successMessage, {
                position: "top-right",
                autoClose: 4000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });

        } catch (err) {
            console.error("Error creating group:", err);
            
            if (err.response?.status === 401) {
                clearAuthData();
                navigate('/login');
                toast.error("Session expired. Please login again.");
            } else {
                const errorMessage = err.response?.data?.message || err.response?.data?.error || "Failed to create group";
                toast.error(errorMessage, {
                    position: "top-right",
                    autoClose: 4000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                });
            }
        } finally {
            setIsCreating(false);
        }
    };

    // Generate gradient for group cards
    const getGroupGradient = (index) => {
        const gradients = [
            'from-purple-500 to-pink-500',
            'from-blue-500 to-cyan-500',
            'from-green-500 to-teal-500',
            'from-orange-500 to-red-500',
            'from-indigo-500 to-purple-500',
            'from-pink-500 to-rose-500',
        ];
        return gradients[index % gradients.length];
    };

    return (
        <div className="min-h-screen relative">
            {/* Dynamic Gradient Background */}
            <div className={`absolute inset-0 transition-all duration-1000 ${
                isDarkMode 
                    ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-black' 
                    : 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900'
            }`} />

            {/* Theme Toggle - Top Right */}
            <motion.div 
                className="fixed top-4 right-4 z-20 sm:top-6 sm:right-6"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
            >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <button
                        onClick={toggleTheme}
                        className={`rounded-2xl backdrop-blur-xl border transition-all duration-300 p-2 sm:p-3 ${
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
                        {isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                </motion.div>
            </motion.div>

            {/* Floating 3D Shapes */}
            <motion.div
                className="absolute top-20 left-20 w-32 h-32 rounded-full opacity-30 hidden lg:block"
                style={{
                    background: isDarkMode 
                        ? 'linear-gradient(45deg, #6366f1, #8b5cf6)' 
                        : 'linear-gradient(45deg, #8b5cf6, #ec4899)',
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
                className="absolute bottom-32 right-32 w-24 h-24 rounded-full opacity-25 hidden lg:block"
                style={{
                    background: isDarkMode 
                        ? 'linear-gradient(135deg, #06b6d4, #6366f1)' 
                        : 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
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

            {/* Navigation Header */}
            <motion.nav
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative z-10 backdrop-blur-xl border-b transition-all duration-500"
                style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                    borderColor: 'rgba(255,255,255,0.2)',
                    boxShadow: isDarkMode 
                        ? '0 8px 32px rgba(0, 0, 0, 0.3)' 
                        : '0 8px 32px rgba(139, 92, 246, 0.1)',
                }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16 sm:h-20">
                        {/* Logo Section */}
                        <div className="flex items-center space-x-3">
                            <motion.div
                                className="text-2xl sm:text-4xl"
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 3, repeat: Infinity }}
                            >
                                💰
                            </motion.div>
                            <div className="hidden sm:block">
                                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                                    Expense Splitter
                                </h1>
                                <p className="text-white/70 text-xs sm:text-sm">
                                    Smart expense management
                                </p>
                            </div>
                            <div className="block sm:hidden">
                                <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                                    ExpenseSplit
                                </h1>
                            </div>
                        </div>

                        {/* Desktop User Section */}
                        <div className="hidden md:flex items-center space-x-4">
                            {/* Notifications */}
                            <button className="relative rounded-2xl p-2 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300">
                                <Bell className="w-5 h-5" />
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            </button>

                            {/* Settings */}
                            <button className="rounded-2xl p-2 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300">
                                <Settings className="w-5 h-5" />
                            </button>

                            {/* User Info */}
                            <div className="flex items-center space-x-3">
                                <div className="text-right hidden lg:block">
                                    <p className="text-sm font-medium text-white">
                                        {userName}
                                    </p>
                                    <p className="text-xs text-white/70">
                                        Premium Member
                                    </p>
                                </div>
                                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold ring-2 ring-white/30 text-sm">
                                    {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </div>
                            </div>

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                className="rounded-2xl p-2 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden flex items-center space-x-2">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold ring-2 ring-white/30 text-xs">
                                {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="rounded-2xl p-2 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu */}
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden border-t border-white/20 py-4 space-y-4"
                        >
                            <div className="flex items-center space-x-3 px-4">
                                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                                    {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">{userName}</p>
                                    <p className="text-xs text-white/70">Premium Member</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-around px-4">
                                <button className="flex flex-col items-center space-y-1 text-white/80 hover:text-white transition-all duration-300">
                                    <Bell className="w-5 h-5" />
                                    <span className="text-xs">Notifications</span>
                                </button>
                                <button className="flex flex-col items-center space-y-1 text-white/80 hover:text-white transition-all duration-300">
                                    <Settings className="w-5 h-5" />
                                    <span className="text-xs">Settings</span>
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex flex-col items-center space-y-1 text-white/80 hover:text-white transition-all duration-300"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span className="text-xs">Logout</span>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.nav>

            {/* Main Content */}
            <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 pt-6 sm:pt-8">
                {/* Welcome Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="text-center mb-8 sm:mb-12"
                >
                    <motion.h2 
                        className="text-2xl sm:text-3xl mb-2 font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                    >
                        Welcome back, {userName.split(' ')[0]}! 👋
                    </motion.h2>
                    <motion.p 
                        className="text-base sm:text-lg text-white/80 mb-6 sm:mb-8"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    >
                        Ready to split some expenses today?
                    </motion.p>

                    {/* Groups Title */}
                    <h3 className="text-3xl sm:text-5xl md:text-6xl font-black bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-4">
                        Your Groups
                    </h3>
                    <div className="w-24 sm:w-32 h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto rounded-full mb-4 sm:mb-6"></div>
                    <p className="text-base sm:text-lg md:text-xl text-white/80 opacity-90 max-w-2xl mx-auto px-4">
                        Manage your expenses with style ✨ Create, track, and split costs effortlessly
                    </p>
                </motion.div>

                {/* Loading State */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full"
                        />
                    </div>
                ) : (
                    <>
                        {/* Groups Grid */}
                        <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-12 sm:mb-16">
                            {groups.map((group, index) => (
                                <motion.div
                                    key={group._id}
                                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ 
                                        duration: 0.6, 
                                        delay: index * 0.1,
                                        ease: "easeOut" 
                                    }}
                                    whileHover={{ 
                                        y: -10,
                                        scale: 1.05,
                                        transition: { duration: 0.3 }
                                    }}
                                    className="relative group"
                                >
                                    <Link to={`/groups/${group._id}`}>
                                        {/* Card */}
                                        <div className="relative p-6 sm:p-8 backdrop-blur-xl rounded-2xl sm:rounded-3xl border shadow-2xl transform transition-all duration-500 group-hover:-translate-y-2 group-hover:scale-105"
                                             style={{
                                                 background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                                                 borderColor: 'rgba(255,255,255,0.2)',
                                             }}>
                                            {/* Sparkle */}
                                            <motion.div
                                                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100"
                                                initial={{ scale: 0, rotate: 0 }}
                                                whileHover={{ scale: 1, rotate: 180 }}
                                                transition={{ duration: 0.5 }}
                                            >
                                                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                                            </motion.div>

                                            {/* Header */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r ${getGroupGradient(index)} rounded-full flex items-center justify-center text-white text-lg sm:text-xl font-bold shadow-lg`}>
                                                    {group.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs sm:text-sm text-white/70">Members</div>
                                                    <div className="text-xl sm:text-2xl font-bold text-white">{group.members?.length || 0}</div>
                                                </div>
                                            </div>

                                            {/* Name */}
                                            <h3 className="text-lg sm:text-2xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-200 group-hover:to-pink-200 group-hover:bg-clip-text transition-all duration-300 line-clamp-1">
                                                {group.name}
                                            </h3>

                                            <p className="text-white/70 text-xs sm:text-sm mb-4">
                                                Tap to view details and chat
                                            </p>

                                            {/* Avatars */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex -space-x-1 sm:-space-x-2">
                                                    {[...Array(Math.min(group.members?.length || 0, 4))].map((_, i) => (
                                                        <div key={i} className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-300 to-pink-300 rounded-full border-2 border-white/30 flex items-center justify-center text-xs font-semibold text-purple-900">
                                                            {i + 1}
                                                        </div>
                                                    ))}
                                                    {(group.members?.length || 0) > 4 && (
                                                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 rounded-full border-2 border-white/30 flex items-center justify-center text-xs font-semibold text-white">
                                                            +{(group.members?.length || 0) - 4}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-white/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}

                            {/* Empty State */}
                            {groups.length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center py-16 sm:py-20">
                                    <motion.div 
                                        className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mb-6"
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        <Users className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                                    </motion.div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">No groups yet!</h3>
                                    <p className="text-white/70 text-center max-w-md px-4">
                                        Create your first group below to start tracking expenses with friends and family ✨
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Create Group Button */}
                        <motion.div 
                            className="text-center mb-8"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.5 }}
                        >
                            <motion.button
                                onClick={() => setShowCreateForm(true)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-2xl shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center mx-auto text-sm sm:text-base"
                            >
                                <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                Create New Group
                            </motion.button>
                        </motion.div>
                    </>
                )}
            </div>

            {/* Create Group Modal */}
            {showCreateForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="w-full max-w-md backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
                        style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                            border: '1px solid rgba(255,255,255,0.2)',
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl sm:text-2xl font-bold text-white">Create New Group</h2>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="text-white/70 hover:text-white p-1"
                            >
                                <X className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleCreateGroup} className="space-y-6">
                            {/* Group Name */}
                            <div>
                                <label className="block text-white/90 mb-2 text-sm font-medium">
                                    Group Name *
                                </label>
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm text-sm sm:text-base"
                                    placeholder="Enter group name..."
                                    required
                                    maxLength={50}
                                />
                            </div>

                            {/* Members */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="block text-white/90 text-sm font-medium">
                                        Members (Optional)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addMember}
                                        className="flex items-center text-purple-300 hover:text-white hover:bg-purple-400/20 rounded-lg px-2 py-1 text-xs sm:text-sm transition-all duration-300"
                                    >
                                        <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                        Add
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-40 overflow-y-auto">
                                    {members.map((member, index) => (
                                        <div key={index} className="flex items-center space-x-3">
                                            <div className="flex-1 relative">
                                                <input
                                                    type="email"
                                                    value={member}
                                                    onChange={(e) => updateMember(index, e.target.value)}
                                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm pl-10 text-sm sm:text-base"
                                                    placeholder="Enter email..."
                                                />
                                                <Users className="w-3 h-3 sm:w-4 sm:h-4 text-white/40 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                            </div>
                                            
                                            {members.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeMember(index)}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-400/20 rounded-lg px-2 py-1 text-xs sm:text-sm transition-all duration-300 min-w-[32px] h-8 flex items-center justify-center"
                                                >
                                                    <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                
                                <p className="text-xs text-white/50 mt-2">
                                    Add member emails to invite them to the group
                                </p>
                            </div>

                            {/* Submit Button */}
                            <motion.button
                                type="submit"
                                disabled={isCreating || !groupName.trim()}
                                whileHover={!isCreating ? { scale: 1.02 } : {}}
                                whileTap={!isCreating ? { scale: 0.98 } : {}}
                                className="w-full py-3 sm:py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                        Create Group
                                    </>
                                )}
                            </motion.button>
                            
                            {/* Helper Text */}
                            <p className="text-xs text-white/50 text-center">
                                You can add more members later from group settings
                            </p>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Floating Action Button */}
            <motion.div
                className="fixed bottom-6 right-6 z-20 sm:bottom-8 sm:right-8"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
            >
                <button 
                    onClick={() => setShowCreateForm(true)}
                    className="w-14 h-14 sm:w-16 sm:h-16 text-white rounded-full shadow-2xl transform transition-all duration-300 flex items-center justify-center font-bold text-xl sm:text-2xl relative overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                        boxShadow: '0 0 30px rgba(139, 92, 246, 0.6)',
                    }}
                >
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0"
                        whileHover={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                    />
                </button>
            </motion.div>
        </div>
    );
};

export default Dashboard;