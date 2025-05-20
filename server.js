// src/server.js
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import alpacaRoutes from "./routes/alpaca.js";
import tradingRoutes from "./routes/trading.js";
import symbolsRoutes from "./routes/symbols.js";
import { initializeAlpacaConnection } from "./services/alpacaService.js";
import { startTradingBot } from "./bot/tradingBot.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/alpaca", alpacaRoutes);
app.use("/api/trading", tradingRoutes);
app.use("/api/symbols", symbolsRoutes);

// Socket.io connection
io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Export io instance to be used in other modules
export { io };

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Initialize Alpaca connection
  initializeAlpacaConnection();

  // Start trading bot
  startTradingBot();
});
