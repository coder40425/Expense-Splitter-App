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
// -------------------------------------

// Middlewares
app.use(express.json());
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
}));

// Attach Socket.io
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

// SOCKET LOGIC
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinUser", (userId) => {
    socket.join(`user_${userId}`);
  });

  socket.on("joinGroup", (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`Socket ${socket.id} joined group_${groupId}`);
  });

  socket.on("sendMessage", async (data) => {
    try {
      // fetch user from DB based on userId
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

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export { io };