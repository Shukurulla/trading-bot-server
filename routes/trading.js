// src/routes/trading.js
import express from "express";
import TradingDatabase from "../database/tradingDatabase.js";
import {
  startTradingBot,
  stopTradingBot,
  addSymbol,
  removeSymbol,
  updateConfig,
} from "../bot/tradingBot.js";

const router = express.Router();

/**
 * Start the trading bot
 * POST /api/trading/start
 */
router.post("/start", async (req, res) => {
  try {
    await startTradingBot();
    res.json({ success: true, message: "Trading bot started successfully" });
  } catch (error) {
    console.error("Error starting trading bot:", error);
    res.status(500).json({
      success: false,
      message: "Error starting trading bot",
      error: error.message,
    });
  }
});

/**
 * Stop the trading bot
 * POST /api/trading/stop
 */
router.post("/stop", async (req, res) => {
  try {
    await stopTradingBot();
    res.json({ success: true, message: "Trading bot stopped successfully" });
  } catch (error) {
    console.error("Error stopping trading bot:", error);
    res.status(500).json({
      success: false,
      message: "Error stopping trading bot",
      error: error.message,
    });
  }
});

/**
 * Get bot status
 * GET /api/trading/status
 */
router.get("/status", async (req, res) => {
  try {
    // Import botStatus from tradingBot if available
    let status = { running: false, activeSymbols: [] };

    try {
      // Try to get the status from the bot
      const { isRunning, activeSymbols } = await import("../bot/tradingBot.js");
      if (typeof isRunning === "boolean") {
        status.running = isRunning;
      }

      // Get active symbols from database as fallback
      const dbSymbols = await TradingDatabase.getActiveSymbols();
      status.activeSymbols = dbSymbols;
    } catch (err) {
      console.warn("Could not import bot status:", err.message);
      // Get active symbols from database if bot status not available
      const dbSymbols = await TradingDatabase.getActiveSymbols();
      status.activeSymbols = dbSymbols;
    }

    res.json({ success: true, data: status });
  } catch (error) {
    console.error("Error getting bot status:", error);
    res.status(500).json({
      success: false,
      message: "Error getting bot status",
      error: error.message,
    });
  }
});

/**
 * Add a symbol to the trading bot
 * POST /api/trading/symbols
 */
router.post("/symbols", async (req, res) => {
  try {
    const { symbol } = req.body;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Symbol is required",
      });
    }

    await addSymbol(symbol);
    res.json({ success: true, message: `Symbol ${symbol} added successfully` });
  } catch (error) {
    console.error("Error adding symbol:", error);
    res.status(500).json({
      success: false,
      message: "Error adding symbol",
      error: error.message,
    });
  }
});

/**
 * Remove a symbol from the trading bot
 * DELETE /api/trading/symbols/:symbol
 */
router.delete("/symbols/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;

    await removeSymbol(symbol);
    res.json({
      success: true,
      message: `Symbol ${symbol} removed successfully`,
    });
  } catch (error) {
    console.error("Error removing symbol:", error);
    res.status(500).json({
      success: false,
      message: "Error removing symbol",
      error: error.message,
    });
  }
});

/**
 * Get active symbols
 * GET /api/trading/symbols
 */
router.get("/symbols", async (req, res) => {
  try {
    const symbols = await TradingDatabase.getActiveSymbols();
    res.json({ success: true, data: symbols });
  } catch (error) {
    console.error("Error getting active symbols:", error);
    res.status(500).json({
      success: false,
      message: "Error getting active symbols",
      error: error.message,
    });
  }
});

/**
 * Update trading bot configuration
 * PUT /api/trading/config
 */
router.put("/config", async (req, res) => {
  try {
    const config = req.body;

    // Update config in database and bot
    await TradingDatabase.updateConfig(config);
    updateConfig(config);

    res.json({
      success: true,
      message: "Trading bot configuration updated successfully",
    });
  } catch (error) {
    console.error("Error updating configuration:", error);
    res.status(500).json({
      success: false,
      message: "Error updating configuration",
      error: error.message,
    });
  }
});

/**
 * Get trading bot configuration
 * GET /api/trading/config
 */
router.get("/config", async (req, res) => {
  try {
    const config = await TradingDatabase.getConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    console.error("Error getting configuration:", error);
    res.status(500).json({
      success: false,
      message: "Error getting configuration",
      error: error.message,
    });
  }
});

/**
 * Get all trades
 * GET /api/trading/trades
 */
router.get("/trades", async (req, res) => {
  try {
    const trades = await TradingDatabase.getTrades();
    res.json({ success: true, data: trades });
  } catch (error) {
    console.error("Error getting trades:", error);
    res.status(500).json({
      success: false,
      message: "Error getting trades",
      error: error.message,
    });
  }
});

/**
 * Get trades for a specific symbol
 * GET /api/trading/trades/:symbol
 */
router.get("/trades/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;

    const trades = await TradingDatabase.getTradesBySymbol(symbol);
    res.json({ success: true, data: trades });
  } catch (error) {
    console.error("Error getting trades for symbol:", error);
    res.status(500).json({
      success: false,
      message: "Error getting trades for symbol",
      error: error.message,
    });
  }
});

/**
 * Get trading statistics
 * GET /api/trading/statistics
 */
router.get("/statistics", async (req, res) => {
  try {
    const statistics = await TradingDatabase.getStatistics();
    res.json({ success: true, data: statistics });
  } catch (error) {
    console.error("Error getting statistics:", error);
    res.status(500).json({
      success: false,
      message: "Error getting statistics",
      error: error.message,
    });
  }
});

export default router;
