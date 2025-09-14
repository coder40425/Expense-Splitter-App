import React, { useEffect, useState, useRef, useCallback, FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "react-toastify";
import socket from "../socket";
import { getAuthToken, getAuthUser } from "../utils/auth";
import {
  ArrowLeft, Trash2, Plus, DollarSign, Receipt, Send,
  Users, MessageCircle, Sun, Moon, Loader2
} from "lucide-react";

// ---- TYPES ----

interface GroupDetailsProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  onNavigate: (path: string) => void;
}

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Expense {
  _id: string;
  description: string;
  amount: number;
  paidBy: User;
  splitAmong: User[];
  createdAt: string;
}

interface Message {
  user: string;
  userId: string;
  message: string;
  time: string;
}

interface Invite {
  email: string;
  createdAt: string;
}

interface Group {
  _id: string;
  name: string;
  members: User[];
  expenses: Expense[];
  messages: Message[];
  invites?: Invite[];
}

// ---- UTILS ----
const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// ---- COMPONENT ----
const GroupDetails: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentUser = getAuthUser();
  const currentUserId = currentUser?._id;

  // FIXED: Use production URL for deployed app
  const API_URL = import.meta.env.VITE_API_URL || "https://expense-splitter-app-6gc3.onrender.com";

  // ---- STATE ----
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");

  const [newExpense, setNewExpense] = useState<{ description: string; amount: string }>({ description: "", amount: "" });
  const [isAddingExpense, setIsAddingExpense] = useState<boolean>(false);

  const [showAddMember, setShowAddMember] = useState<boolean>(false);
  const [newMemberEmail, setNewMemberEmail] = useState<string>("");
  const [newMemberName, setNewMemberName] = useState<string>("");
  const [addingMember, setAddingMember] = useState<boolean>(false);

  // ---- THEME ----
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem("darkMode", JSON.stringify(newTheme));
  };

  // ---- FETCH GROUP ----
  const fetchGroupData = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) { navigate("/login"); return; }
      const res = await axios.get<Group>(`${API_URL}/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGroup(res.data);
      setMessages(res.data.messages || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to fetch group");
      if (err.response?.status === 401) navigate("/login");
    } finally { setLoading(false); }
  }, [groupId, navigate, API_URL]);

  useEffect(() => { fetchGroupData(); }, [fetchGroupData]);

  // ---- SOCKET LISTENERS ----
  // Replace your existing socket listeners useEffect with this updated version:

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    if (!socket.connected) socket.connect();
    socket.emit("joinGroup", groupId);

    const handleNewMessage = (msg: Message) => {
      setMessages(prev => [...prev, msg]);

      // Show notification for messages from other users
      if (msg.userId !== currentUserId) {
        toast.info(`${msg.user}: ${msg.message}`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    };

    const handleExpense = (expense: Expense) => {
      toast.success(`New expense: ${expense.description} - ₹${expense.amount}`);
      setGroup(prev => {
        if (!prev) return prev;
        if (prev.expenses?.some(e => e._id === expense._id)) return prev;
        return { ...prev, expenses: [...(prev.expenses || []), expense] };
      });
      fetchGroupData();
    };

    const handleMemberChanged = () => {
      fetchGroupData();
    };

    const handleMemberAdded = (data: { memberName: string; memberEmail: string }) => {
      toast.success(`${data.memberName || data.memberEmail} joined the group!`);
      fetchGroupData();
    };

    const handleMemberRemoved = (data: { memberName: string; memberEmail: string }) => {
      toast.info(`${data.memberName || data.memberEmail} left the group`);
      fetchGroupData();
    };

    const handleInviteCancelled = (data: { email: string }) => {
      toast.info(`Invite to ${data.email} was cancelled`);
      fetchGroupData();
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("expenseAdded", handleExpense);
    socket.on("memberAdded", handleMemberAdded);
    socket.on("memberRemoved", handleMemberRemoved);
    socket.on("inviteCancelled", handleInviteCancelled);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("expenseAdded", handleExpense);
      socket.off("memberAdded", handleMemberAdded);
      socket.off("memberRemoved", handleMemberRemoved);
      socket.off("inviteCancelled", handleInviteCancelled);
    };
  }, [groupId, fetchGroupData, currentUserId]);

  // ---- CHAT ----
  const sendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    socket.emit("sendMessage", {
      groupId: groupId,
      message: newMessage.trim(),
      user: currentUser?.name || currentUser?.email || "Unknown",
      userId: currentUserId,
      time: new Date().toISOString(),
    });
    setNewMessage("");
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // ---- EXPENSE ----
  const addExpense = async (e: FormEvent) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) {
      toast.error("Please enter description and amount!");
      return;
    }
    setIsAddingExpense(true);
    try {
      const token = getAuthToken();
      await axios.post(`${API_URL}/api/expenses/${groupId}`, {
        description: newExpense.description,
        amount: Number(newExpense.amount),
        splitAmong: group?.members.map(m => m._id) || [],
      }, { headers: { Authorization: `Bearer ${token}` } });
      setNewExpense({ description: "", amount: "" });
      toast.success("Expense added successfully!");
      fetchGroupData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add expense");
    } finally { setIsAddingExpense(false); }
  };

  // ---- MEMBERS ----
  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return toast.error("Please enter an email");
    setAddingMember(true);
    try {
      const token = getAuthToken();
      await axios.post(`${API_URL}/api/groups/${groupId}/members`, {
        email: newMemberEmail.trim(),
        name: newMemberName.trim() || undefined,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Member added successfully!");
      setNewMemberEmail(""); setNewMemberName(""); setShowAddMember(false);
      fetchGroupData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add member");
    } finally { setAddingMember(false); }
  };

  const handleRemoveMember = async (email: string) => {
    if (!window.confirm(`Remove ${email}?`)) return;
    try {
      const token = getAuthToken();
      await axios.delete(`${API_URL}/api/groups/${groupId}/members/${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Member removed successfully");
      fetchGroupData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to remove member");
    }
  };

  const handleCancelInvite = async (email: string) => {
    if (!window.confirm(`Cancel invite to ${email}?`)) return;
    try {
      const token = getAuthToken();
      await axios.delete(`${API_URL}/api/groups/${groupId}/invites/${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Invite cancelled successfully");
      fetchGroupData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to cancel invite");
    }
  };

  // ---- DELETE GROUP ----
  const handleDeleteGroup = async () => {
    if (!window.confirm(`Delete group "${group?.name}"? This cannot be undone.`)) return;
    try {
      const token = getAuthToken();
      await axios.delete(`${API_URL}/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Group deleted successfully!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete group");
    }
  };

  // ---- BALANCE ----
  const computeMemberBalance = (memberId) => {
    if (!group?.expenses) return { paid: 0, share: 0, net: 0 };

    let paid = 0;
    let share = 0;

    group.expenses.forEach((e) => {
      // number of people splitting this expense
      const numSplit = e.splitAmong.length;

      // ensure we don't divide by 0
      if (numSplit === 0) return;

      // compute individual share (rounded to 2 decimals)
      const individualShare = parseFloat((e.amount / numSplit).toFixed(2));

      // add amount paid by this member
      if (e.paidBy?._id === memberId || e.paidBy === memberId) paid += e.amount;

      // add amount owed by this member
      if (e.splitAmong.some((u) => u._id === memberId || u === memberId)) {
        share += individualShare;
      }
    });

    const net = parseFloat((paid - share).toFixed(2));
    return { paid, share, net };
  };


  const getGroupGradient = () => {
    if (!group) return "from-purple-500 to-pink-500";
    const gradients = ["from-purple-500 to-pink-500", "from-blue-500 to-cyan-500", "from-green-500 to-teal-500", "from-orange-500 to-red-500"];
    return gradients[group.name.length % gradients.length];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Group not found</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:shadow-lg transition-all duration-300"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Dynamic Gradient Background */}
      <div className={`absolute inset-0 transition-all duration-1000 ${isDarkMode
        ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-black'
        : 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900'
        }`} />

      {/* Floating Background Elements */}
      <motion.div
        className="absolute top-32 right-20 w-32 h-32 rounded-full opacity-20 hidden lg:block"
        style={{
          background: 'linear-gradient(45deg, #8b5cf6, #ec4899)',
          filter: 'blur(40px)',
        }}
        animate={{
          y: [0, -20, 0],
          x: [0, 10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={`relative z-10 backdrop-blur-xl border-b p-4 sm:p-6 transition-all duration-500 ${isDarkMode
          ? 'bg-gray-900/20 border-gray-700/30'
          : 'bg-white/10 border-white/20'
          }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-2xl p-2 transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-r ${getGroupGradient()} flex items-center justify-center shadow-lg`}
              >
                <span className="text-white font-bold text-sm sm:text-base">
                  {group.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className={`text-lg sm:text-2xl font-bold bg-gradient-to-r ${isDarkMode
                  ? 'from-blue-400 to-purple-400'
                  : 'from-white to-purple-200'
                  } bg-clip-text text-transparent`}>
                  {group.name}
                </h1>
                <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-white/70'}`}>
                  {group.members.length} members
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Theme Toggle */}
            <motion.button
              onClick={toggleTheme}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`rounded-2xl backdrop-blur-xl border transition-all duration-300 p-2 ${isDarkMode
                ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10 bg-gray-800/30 border-gray-700/30'
                : 'text-purple-300 hover:text-purple-200 hover:bg-purple-400/10 bg-white/10 border-white/20'
                }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </motion.button>

            {/* Delete Button */}
            <button
              onClick={handleDeleteGroup}
              className={`rounded-2xl backdrop-blur-sm transition-all duration-300 px-3 py-2 text-xs sm:text-sm ${isDarkMode
                ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30'
                : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30'
                }`}
            >
              <Trash2 className="w-4 h-4 sm:mr-1 sm:inline hidden" />
              <span className="hidden sm:inline">Delete</span>
              <Trash2 className="w-4 h-4 sm:hidden" />
            </button>
          </div>
        </div>
      </motion.div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

          {/* Left Column - Members & Expenses */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">

            {/* Members Section */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className={`backdrop-blur-xl rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-500 ${isDarkMode
                ? "bg-gray-800/30 border-gray-700/30"
                : "bg-white/10 border-white/20"
                } border`}
            >
              <div className="p-4 sm:p-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h2
                    className={`flex items-center text-lg sm:text-xl font-bold ${isDarkMode ? "text-white" : "text-white"
                      }`}
                  >
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Members ({group.members.length})
                  </h2>
                  <button
                    onClick={() => setShowAddMember(true)}
                    className={`rounded-2xl transition-all duration-300 px-3 py-2 text-xs sm:text-sm ${isDarkMode
                      ? "bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-600/30"
                      : "bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30"
                      }`}
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    Add
                  </button>
                </div>

                {/* Add Member Form */}
                {showAddMember && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleAddMember}
                    className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10"
                  >
                    <h3 className="text-sm font-semibold text-white mb-3">
                      Add New Member
                    </h3>
                    <div className="space-y-3">
                      <input
                        type="email"
                        placeholder="Email address *"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 text-sm"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        disabled={addingMember}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Name (optional)"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 text-sm"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        disabled={addingMember}
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={addingMember || !newMemberEmail.trim()}
                          className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 px-4 py-2 rounded-xl disabled:opacity-50 transition-all duration-300 text-sm flex items-center justify-center"
                        >
                          {addingMember ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            "Add Member"
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddMember(false);
                            setNewMemberEmail("");
                            setNewMemberName("");
                          }}
                          className="flex-1 bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 border border-gray-500/30 px-4 py-2 rounded-xl transition-all duration-300 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.form>
                )}

                {/* Members List */}
                <div className="space-y-3 sm:space-y-4">
                  {group.members.map((member, index) => {
                    const { paid, share, net } = computeMemberBalance(member._id);
                    return (
                      <motion.div
                        key={member._id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm sm:text-base">
                              {member.name}
                            </p>
                            <p className="text-white/60 text-xs sm:text-sm">
                              {member.email}
                            </p>
                            <div className="text-xs text-white/70 mt-1">
                              Paid: ₹{paid.toFixed(2)} • Share: ₹{share.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div
                            className={`text-xs sm:text-sm font-bold px-2 py-1 rounded-full ${net > 0
                              ? "bg-green-500/20 text-green-300 border border-green-500/30"
                              : net < 0
                                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                : "bg-gray-500/20 text-gray-300 border border-gray-500/30"
                              }`}
                          >
                            {net === 0
                              ? "Settled"
                              : net > 0
                                ? `+₹${net.toFixed(2)}`
                                : `-₹${Math.abs(net).toFixed(2)}`}
                          </div>
                          <button
                            onClick={() => handleRemoveMember(member.email)}
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-1 rounded-lg text-xs transition-all duration-300"
                          >
                            Remove
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Pending Invites */}
                {group?.invites?.length ? (
                  <div className="mt-6">
                    <h3 className="text-white font-semibold mb-2">Pending Invites</h3>
                    {group.invites.map((invite) => (
                      <div
                        key={invite.email}
                        className="flex justify-between items-center bg-white/5 border border-white/10 rounded-xl px-3 py-2 mb-2"
                      >
                        <span>{invite.email}</span>
                        <span className="text-sm text-white/60">
                          {new Date(invite.createdAt).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleCancelInvite(invite.email)}
                          className="text-red-400 hover:underline text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </motion.div>


            {/* Expenses Section */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className={`backdrop-blur-xl rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-500 ${isDarkMode
                ? 'bg-gray-800/30 border-gray-700/30'
                : 'bg-white/10 border-white/20'
                } border`}
            >
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`flex items-center text-lg sm:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-white'}`}>
                    <Receipt className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Expenses ({group.expenses?.length || 0})
                  </h2>
                </div>

                {/* Expenses List */}
                {group.expenses?.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4 max-h-80 overflow-y-auto mb-4">
                    {group.expenses.map((expense, index) => (
                      <motion.div
                        key={expense._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl backdrop-blur-sm transition-all duration-300 ${isDarkMode
                          ? 'bg-gray-700/30 border border-gray-600/30 hover:bg-gray-700/40'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                          }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-lg ${isDarkMode
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600'
                            : 'bg-gradient-to-r from-blue-500 to-purple-500'
                            }`}>
                            💰
                          </div>
                          <div>
                            <p className={`${isDarkMode ? 'text-white' : 'text-white'} font-medium text-sm sm:text-base`}>
                              {expense.description}
                            </p>
                            <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-white/60'}`}>
                              Paid by {expense.paidBy?.name || "Unknown"} • {new Date(expense.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`${isDarkMode ? 'text-white' : 'text-white'} font-bold text-sm sm:text-lg`}>
                            ₹{expense.amount}
                          </p>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-white/60'}`}>
                            Split {expense.splitAmong.length} ways
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <Receipt className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-white/70 mb-2">No expenses yet</p>
                    <p className="text-white/50 text-sm">Add your first expense below</p>
                  </div>
                )}

                {/* Add Expense Form */}
                <form onSubmit={addExpense} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Description"
                      className="sm:col-span-2 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-300 text-sm"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                      disabled={isAddingExpense}
                    />
                    <input
                      type="number"
                      placeholder="Amount (₹)"
                      step="0.01"
                      min="0"
                      className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-300 text-sm"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      disabled={isAddingExpense}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isAddingExpense || !newExpense.description.trim() || !newExpense.amount}
                    className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 px-4 py-3 rounded-xl disabled:opacity-50 transition-all duration-300 text-sm flex items-center justify-center"
                  >
                    {isAddingExpense ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding Expense...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Expense
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Chat */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className={`backdrop-blur-xl rounded-2xl sm:rounded-3xl overflow-hidden h-[500px] sm:h-[600px] flex flex-col transition-all duration-500 ${isDarkMode
              ? 'bg-gray-800/30 border-gray-700/30'
              : 'bg-white/10 border-white/20'
              } border`}
          >
            <div className="p-4 sm:p-6 pb-4">
              <h2 className="text-white flex items-center text-lg sm:text-xl font-bold">
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Group Chat
              </h2>
            </div>

            {/* Chat Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 sm:px-6 pb-2 space-y-3"
            >
              {messages.length > 0 ? (
                messages.map((message, index) => {
                  const isMe = message.userId === currentUserId;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-3 sm:px-4 py-2 sm:py-3 rounded-2xl text-sm ${isMe
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                          : 'bg-white/10 text-white backdrop-blur-sm border border-white/20'
                          }`}
                      >
                        {!isMe && (
                          <p className="text-xs text-white/70 mb-1 font-medium">
                            {message.user}
                          </p>
                        )}
                        <p>{message.message}</p>
                        <p className="text-xs text-white/60 mt-1">{formatTime(message.time)}</p>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-white/70 text-center">No messages yet</p>
                  <p className="text-white/50 text-sm text-center">Start the conversation!</p>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 sm:p-6 pt-4 border-t border-white/20">
              <form onSubmit={sendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 text-sm"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 rounded-xl px-4 py-3 transition-all duration-300"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </form>
            </div>
          </motion.div>
        </div >
      </div >

      {/* Floating Action Button - Add Expense */}
      < motion.div
        className="fixed bottom-6 right-6 z-20 sm:bottom-8 sm:right-8"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <button
          onClick={() => {
            const form = document.querySelector<HTMLFormElement>('form[onsubmit]');
            form?.scrollIntoView({ behavior: 'smooth' });

            const input = document.querySelector<HTMLInputElement>('input[placeholder="Description"]');
            input?.focus();
          }}
          className="w-14 h-14 sm:w-16 sm:h-16 text-white rounded-full shadow-2xl transform transition-all duration-300 flex items-center justify-center font-bold text-xl sm:text-2xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            boxShadow: '0 0 30px rgba(16, 185, 129, 0.6)',
          }}
        >
          <Plus className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 opacity-0"
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        </button>

      </motion.div >
    </div >
  );
};

export default GroupDetails;
