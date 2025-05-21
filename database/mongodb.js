// src/database/mongodb.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// MongoDB connection string - default to localhost if not provided
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/trading_bot";

// Connect to MongoDB
export async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB successfully");
    return true;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    return false;
  }
}

// Define schemas and models

// Schema for trades
const tradeSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  entryPrice: { type: Number, required: true },
  exitPrice: { type: Number },
  quantity: { type: Number, required: true },
  side: { type: String, required: true },
  pnl: { type: Number },
  entryTime: { type: Date, default: Date.now },
  exitTime: { type: Date },
  status: { type: String, default: "OPEN" },
  confidence: { type: Number },
  stopLoss: { type: Number },
  takeProfit: { type: Number },
  orderId: { type: String },
  timestamp: { type: Date, default: Date.now },
});

// Schema for active symbols
const activeSymbolSchema = new mongoose.Schema({
  symbol: { type: String, required: true, unique: true },
  addedAt: { type: Date, default: Date.now },
});

// Schema for bot configuration
const configSchema = new mongoose.Schema({
  maxRiskPercent: { type: Number, default: 10 },
  minRiskPercent: { type: Number, default: 0.5 },
  maxLot: { type: Number, default: 10 },
  minLot: { type: Number, default: 0.01 },
  targetDailyGrowth: { type: Number, default: 30 },
  stopLossMultiplier: { type: Number, default: 0.5 },
  takeProfitMultiplier: { type: Number, default: 1.5 },
  lastUpdated: { type: Date, default: Date.now },
});

// Create models
export const Trade = mongoose.model("Trade", tradeSchema);
export const ActiveSymbol = mongoose.model("ActiveSymbol", activeSymbolSchema);
export const Config = mongoose.model("Config", configSchema);

export default {
  connectToDatabase,
  Trade,
  ActiveSymbol,
  Config,
};
