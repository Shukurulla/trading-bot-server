// src/routes/alpaca.js
import express from "express";
import {
  initializeAlpacaConnection,
  getAccountInfo,
  getOpenPositions,
  getMarketData,
  getOrders,
  closePosition,
} from "../services/alpacaService.js";

const router = express.Router();

/**
 * Update Alpaca API configuration
 * POST /api/alpaca/config
 */
router.post("/config", async (req, res) => {
  try {
    const { apiKey, apiSecret, paper } = req.body;

    if (!apiKey || !apiSecret) {
      return res.status(400).json({
        success: false,
        message: "API key and secret are required",
      });
    }

    // Initialize with new config
    await initializeAlpacaConnection({ apiKey, apiSecret, paper });

    res.json({
      success: true,
      message: "Alpaca configuration updated successfully",
    });
  } catch (error) {
    console.error("Error updating Alpaca config:", error);
    res.status(500).json({
      success: false,
      message: "Error updating Alpaca configuration",
      error: error.message,
    });
  }
});

/**
 * Get account information
 * GET /api/alpaca/account
 */
router.get("/account", async (req, res) => {
  try {
    const account = await getAccountInfo();
    res.json({ success: true, data: account });
  } catch (error) {
    console.error("Error getting account info:", error);
    res.status(500).json({
      success: false,
      message: "Error getting account information",
      error: error.message,
    });
  }
});

/**
 * Get open positions
 * GET /api/alpaca/positions
 */
router.get("/positions", async (req, res) => {
  try {
    const positions = await getOpenPositions();
    res.json({ success: true, data: positions });
  } catch (error) {
    console.error("Error getting positions:", error);
    res.status(500).json({
      success: false,
      message: "Error getting open positions",
      error: error.message,
    });
  }
});

/**
 * Get market data for a symbol
 * GET /api/alpaca/market-data/:symbol
 */
router.get("/market-data/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = "5Min", limit = 100 } = req.query;

    const data = await getMarketData(symbol, timeframe, parseInt(limit));
    res.json({ success: true, data });
  } catch (error) {
    console.error("Error getting market data:", error);
    res.status(500).json({
      success: false,
      message: "Error getting market data",
      error: error.message,
    });
  }
});

/**
 * Get orders
 * GET /api/alpaca/orders
 */
router.get("/orders", async (req, res) => {
  try {
    const { status = "all", limit = 100 } = req.query;

    const orders = await getOrders(status, parseInt(limit));
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error("Error getting orders:", error);
    res.status(500).json({
      success: false,
      message: "Error getting orders",
      error: error.message,
    });
  }
});

/**
 * Close a position
 * DELETE /api/alpaca/positions/:symbol
 */
router.delete("/positions/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;

    const result = await closePosition(symbol);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error closing position:", error);
    res.status(500).json({
      success: false,
      message: "Error closing position",
      error: error.message,
    });
  }
});

export default router;
