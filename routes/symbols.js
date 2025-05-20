// src/routes/symbols.js
import express from "express";
import {
  getCryptoSymbols,
  getForexSymbols,
  getTrendingStocks,
  searchSymbols,
} from "../services/symbolsService.js";

const router = express.Router();

/**
 * Get all available symbols (crypto, forex, and stocks)
 * GET /api/symbols
 */
router.get("/", async (req, res) => {
  try {
    const [cryptos, forex, stocks] = await Promise.all([
      getCryptoSymbols(),
      getForexSymbols(),
      getTrendingStocks(),
    ]);

    res.json({
      success: true,
      data: {
        crypto: cryptos,
        forex: forex,
        stocks: stocks,
      },
    });
  } catch (error) {
    console.error("Error getting symbols:", error);
    res.status(500).json({
      success: false,
      message: "Error getting symbols",
      error: error.message,
    });
  }
});

/**
 * Get cryptocurrency symbols
 * GET /api/symbols/crypto
 */
router.get("/crypto", async (req, res) => {
  try {
    const cryptos = await getCryptoSymbols();
    res.json({ success: true, data: cryptos });
  } catch (error) {
    console.error("Error getting crypto symbols:", error);
    res.status(500).json({
      success: false,
      message: "Error getting cryptocurrency symbols",
      error: error.message,
    });
  }
});

/**
 * Get forex symbols
 * GET /api/symbols/forex
 */
router.get("/forex", async (req, res) => {
  try {
    const forex = await getForexSymbols();
    res.json({ success: true, data: forex });
  } catch (error) {
    console.error("Error getting forex symbols:", error);
    res.status(500).json({
      success: false,
      message: "Error getting forex symbols",
      error: error.message,
    });
  }
});

/**
 * Get stock symbols
 * GET /api/symbols/stocks
 */
router.get("/stocks", async (req, res) => {
  try {
    const stocks = await getTrendingStocks();
    res.json({ success: true, data: stocks });
  } catch (error) {
    console.error("Error getting stock symbols:", error);
    res.status(500).json({
      success: false,
      message: "Error getting stock symbols",
      error: error.message,
    });
  }
});

/**
 * Search for symbols
 * GET /api/symbols/search?q=query
 */
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    const results = await searchSymbols(q);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error("Error searching symbols:", error);
    res.status(500).json({
      success: false,
      message: "Error searching symbols",
      error: error.message,
    });
  }
});

export default router;
