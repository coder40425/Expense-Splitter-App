import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import User from "./models/User.js";
// ROUTES
import authRoutes from "./routes/authRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// ---------- MONGO CONNECTION ----------
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
};
connectDB();

// SIMPLIFIED CORS Configuration - This should fix the issue
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://expense-splitter-app-ys.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization'
  ],
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser support
};

// Apply CORS first, before any other middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root route for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'Expense Splitter API is running!',
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Test CORS route
app.get('/api/test-cors', (req, res) => {
  res.json({ 
    message: 'CORS is working!', 
    origin: req.headers.origin,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Test POST route for CORS
app.post('/api/test-cors', (req, res) => {
  res.json({ 
    message: 'POST CORS is working!', 
    origin: req.headers.origin,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });
});

// Attach Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://expense-splitter-app-ys.vercel.app"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// SOCKET LOGIC
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  
  socket.on("joinUser", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined user_${userId}`);
  });
  
  socket.on("joinGroup", (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`Socket ${socket.id} joined group_${groupId}`);
  });
  
  socket.on("sendMessage", async (data) => {
    try {
      let userName = "Unknown";
      if (data.userId) {
        const user = await User.findById(data.userId).select("name email");
        if (user) {
          userName = user.name || user.email;
        }
      }
      
      const msgObj = {
        user: userName,
        userId: data.userId || null,
        message: data.message,
        time: new Date().toISOString(),
      };
      
      io.to(`group_${data.groupId}`).emit("newMessage", msgObj);
    } catch (err) {
      console.error("Error in sendMessage:", err.message);
    }
  });
  
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/expenses", expenseRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: ['/health', '/api/test-cors', '/api/auth', '/api/groups', '/api/expenses']
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('🌐 CORS enabled for:', corsOptions.origin);
});

export { io };
