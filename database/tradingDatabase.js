// src/database/tradingDatabase.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file paths
const TRADES_FILE = path.join(__dirname, "../../data/trades.json");
const ACTIVE_SYMBOLS_FILE = path.join(
  __dirname,
  "../../data/active_symbols.json"
);
const CONFIG_FILE = path.join(__dirname, "../../data/config.json");

/**
 * Trading database service
 * Simple file-based storage for trading data
 */
class TradingDatabase {
  /**
   * Initialize the database
   */
  static async initialize() {
    try {
      // Create data directory if it doesn't exist
      const dataDir = path.join(__dirname, "../../data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Initialize trades file
      if (!fs.existsSync(TRADES_FILE)) {
        fs.writeFileSync(TRADES_FILE, JSON.stringify([], null, 2));
      } else {
        // Validate file content
        try {
          const content = fs.readFileSync(TRADES_FILE, "utf8");
          if (!content || content.trim() === "") {
            fs.writeFileSync(TRADES_FILE, JSON.stringify([], null, 2));
          } else {
            JSON.parse(content); // This will throw if content is not valid JSON
          }
        } catch (error) {
          console.warn("Invalid trades file content, resetting to empty array");
          fs.writeFileSync(TRADES_FILE, JSON.stringify([], null, 2));
        }
      }

      // Initialize active symbols file
      if (!fs.existsSync(ACTIVE_SYMBOLS_FILE)) {
        fs.writeFileSync(ACTIVE_SYMBOLS_FILE, JSON.stringify([], null, 2));
      } else {
        // Validate file content
        try {
          const content = fs.readFileSync(ACTIVE_SYMBOLS_FILE, "utf8");
          if (!content || content.trim() === "") {
            fs.writeFileSync(ACTIVE_SYMBOLS_FILE, JSON.stringify([], null, 2));
          } else {
            JSON.parse(content); // This will throw if content is not valid JSON
          }
        } catch (error) {
          console.warn(
            "Invalid active symbols file content, resetting to empty array"
          );
          fs.writeFileSync(ACTIVE_SYMBOLS_FILE, JSON.stringify([], null, 2));
        }
      }

      // Initialize config file
      if (!fs.existsSync(CONFIG_FILE)) {
        const defaultConfig = {
          maxRiskPercent: 10, // Maximum risk percent of balance for 100% confidence
          minRiskPercent: 0.5, // Minimum risk percent of balance for low confidence
          maxLot: 10, // Maximum lot size for 100% confidence
          minLot: 0.01, // Minimum lot size for low confidence
          targetDailyGrowth: 30, // Target daily growth percentage
          stopLossMultiplier: 0.5, // Stop loss multiplier based on risk
          takeProfitMultiplier: 1.5, // Take profit multiplier based on risk
        };

        fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
      } else {
        // Validate file content
        try {
          const content = fs.readFileSync(CONFIG_FILE, "utf8");
          if (!content || content.trim() === "") {
            const defaultConfig = {
              maxRiskPercent: 10,
              minRiskPercent: 0.5,
              maxLot: 10,
              minLot: 0.01,
              targetDailyGrowth: 30,
              stopLossMultiplier: 0.5,
              takeProfitMultiplier: 1.5,
            };
            fs.writeFileSync(
              CONFIG_FILE,
              JSON.stringify(defaultConfig, null, 2)
            );
          } else {
            JSON.parse(content); // This will throw if content is not valid JSON
          }
        } catch (error) {
          console.warn("Invalid config file content, resetting to default");
          const defaultConfig = {
            maxRiskPercent: 10,
            minRiskPercent: 0.5,
            maxLot: 10,
            minLot: 0.01,
            targetDailyGrowth: 30,
            stopLossMultiplier: 0.5,
            takeProfitMultiplier: 1.5,
          };
          fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
        }
      }

      console.log("Trading database initialized");
      return true;
    } catch (error) {
      console.error("Error initializing database:", error);
      return false;
    }
  }

  /**
   * Get all trades
   * @returns {Promise<Array>} List of trades
   */
  static async getTrades() {
    try {
      if (!fs.existsSync(TRADES_FILE)) {
        return [];
      }

      const data = fs.readFileSync(TRADES_FILE, "utf8");

      // Handle empty file
      if (!data || data.trim() === "") {
        return [];
      }

      return JSON.parse(data);
    } catch (error) {
      console.error("Error reading trades:", error);
      return [];
    }
  }

  /**
   * Save a new trade
   * @param {Object} trade - Trade data
   * @returns {Promise<boolean>} Success indicator
   */
  static async saveTrade(trade) {
    try {
      const trades = await this.getTrades();

      // Add unique ID and timestamp
      const newTrade = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date(),
        ...trade,
      };

      trades.push(newTrade);

      fs.writeFileSync(TRADES_FILE, JSON.stringify(trades, null, 2));
      return true;
    } catch (error) {
      console.error("Error saving trade:", error);
      return false;
    }
  }

  /**
   * Update trade information
   * @param {string} tradeId - Trade ID
   * @param {Object} updates - Trade updates
   * @returns {Promise<boolean>} Success indicator
   */
  static async updateTrade(tradeId, updates) {
    try {
      const trades = await this.getTrades();

      const tradeIndex = trades.findIndex((t) => t.id === tradeId);

      if (tradeIndex === -1) {
        console.error(`Trade not found: ${tradeId}`);
        return false;
      }

      // Update the trade
      trades[tradeIndex] = {
        ...trades[tradeIndex],
        ...updates,
        updatedAt: new Date(),
      };

      fs.writeFileSync(TRADES_FILE, JSON.stringify(trades, null, 2));
      return true;
    } catch (error) {
      console.error("Error updating trade:", error);
      return false;
    }
  }

  /**
   * Get active trading symbols
   * @returns {Promise<Array>} List of active symbols
   */
  static async getActiveSymbols() {
    try {
      if (!fs.existsSync(ACTIVE_SYMBOLS_FILE)) {
        return [];
      }

      const data = fs.readFileSync(ACTIVE_SYMBOLS_FILE, "utf8");

      // Handle empty file
      if (!data || data.trim() === "") {
        return [];
      }

      return JSON.parse(data);
    } catch (error) {
      console.error("Error reading active symbols:", error);
      return [];
    }
  }

  /**
   * Add a new active symbol
   * @param {string} symbol - Symbol to add
   * @returns {Promise<boolean>} Success indicator
   */
  static async addActiveSymbol(symbol) {
    try {
      const symbols = await this.getActiveSymbols();

      if (!symbols.includes(symbol)) {
        symbols.push(symbol);
        fs.writeFileSync(ACTIVE_SYMBOLS_FILE, JSON.stringify(symbols, null, 2));
      }

      return true;
    } catch (error) {
      console.error("Error adding active symbol:", error);
      return false;
    }
  }

  /**
   * Remove an active symbol
   * @param {string} symbol - Symbol to remove
   * @returns {Promise<boolean>} Success indicator
   */
  static async removeActiveSymbol(symbol) {
    try {
      const symbols = await this.getActiveSymbols();

      const index = symbols.indexOf(symbol);

      if (index !== -1) {
        symbols.splice(index, 1);
        fs.writeFileSync(ACTIVE_SYMBOLS_FILE, JSON.stringify(symbols, null, 2));
      }

      return true;
    } catch (error) {
      console.error("Error removing active symbol:", error);
      return false;
    }
  }

  /**
   * Get bot configuration
   * @returns {Promise<Object>} Bot configuration
   */
  static async getConfig() {
    try {
      if (!fs.existsSync(CONFIG_FILE)) {
        // Return default config if file doesn't exist
        return {
          maxRiskPercent: 10,
          minRiskPercent: 0.5,
          maxLot: 10,
          minLot: 0.01,
          targetDailyGrowth: 30,
          stopLossMultiplier: 0.5,
          takeProfitMultiplier: 1.5,
        };
      }

      const data = fs.readFileSync(CONFIG_FILE, "utf8");

      // Handle empty file
      if (!data || data.trim() === "") {
        // Return default config if file is empty
        return {
          maxRiskPercent: 10,
          minRiskPercent: 0.5,
          maxLot: 10,
          minLot: 0.01,
          targetDailyGrowth: 30,
          stopLossMultiplier: 0.5,
          takeProfitMultiplier: 1.5,
        };
      }

      return JSON.parse(data);
    } catch (error) {
      console.error("Error reading config:", error);
      // Return default config in case of error
      return {
        maxRiskPercent: 10,
        minRiskPercent: 0.5,
        maxLot: 10,
        minLot: 0.01,
        targetDailyGrowth: 30,
        stopLossMultiplier: 0.5,
        takeProfitMultiplier: 1.5,
      };
    }
  }

  /**
   * Update bot configuration
   * @param {Object} config - New configuration
   * @returns {Promise<boolean>} Success indicator
   */
  static async updateConfig(config) {
    try {
      // Make sure we have a valid config to update
      const currentConfig = await this.getConfig();

      // Merge with current config
      const updatedConfig = {
        ...currentConfig,
        ...config,
      };

      fs.writeFileSync(CONFIG_FILE, JSON.stringify(updatedConfig, null, 2));
      return true;
    } catch (error) {
      console.error("Error updating config:", error);
      return false;
    }
  }

  /**
   * Get trades for a specific symbol
   * @param {string} symbol - Trading symbol
   * @returns {Promise<Array>} List of trades for the symbol
   */
  static async getTradesBySymbol(symbol) {
    try {
      const trades = await this.getTrades();
      return trades.filter((trade) => trade.symbol === symbol);
    } catch (error) {
      console.error(`Error getting trades for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get trades for a specific date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} List of trades in the date range
   */
  static async getTradesByDateRange(startDate, endDate) {
    try {
      const trades = await this.getTrades();

      return trades.filter((trade) => {
        const tradeDate = new Date(trade.timestamp);
        return tradeDate >= startDate && tradeDate <= endDate;
      });
    } catch (error) {
      console.error("Error getting trades by date range:", error);
      return [];
    }
  }

  /**
   * Get open trades (trades with status 'OPEN')
   * @returns {Promise<Array>} List of open trades
   */
  static async getOpenTrades() {
    try {
      const trades = await this.getTrades();
      return trades.filter((trade) => trade.status === "OPEN");
    } catch (error) {
      console.error("Error getting open trades:", error);
      return [];
    }
  }

  /**
   * Calculate trading statistics
   * @returns {Promise<Object>} Trading statistics
   */
  static async getStatistics() {
    try {
      const trades = await this.getTrades();

      if (trades.length === 0) {
        return {
          totalTrades: 0,
          winRate: 0,
          avgProfit: 0,
          totalProfit: 0,
          avgDuration: 0,
          bestTrade: null,
          worstTrade: null,
          todayProfit: 0,
        };
      }

      // Filter completed trades
      const completedTrades = trades.filter(
        (trade) =>
          trade.status === "CLOSED" ||
          trade.status === "CLOSED_REVERSAL" ||
          trade.status === "CLOSED_DANGER"
      );

      // Calculate today's profit
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTrades = completedTrades.filter((trade) => {
        const exitTime = trade.exitTime ? new Date(trade.exitTime) : null;
        return exitTime && exitTime >= today;
      });

      const todayProfit = todayTrades.reduce(
        (sum, trade) => sum + (trade.pnl || 0),
        0
      );

      if (completedTrades.length === 0) {
        return {
          totalTrades: trades.length,
          completedTrades: 0,
          openTrades: trades.length,
          winRate: 0,
          avgProfit: 0,
          totalProfit: 0,
          avgDuration: 0,
          bestTrade: null,
          worstTrade: null,
          todayProfit,
        };
      }

      // Calculate statistics
      const winningTrades = completedTrades.filter((trade) => trade.pnl > 0);
      const winRate = (winningTrades.length / completedTrades.length) * 100;

      const totalProfit = completedTrades.reduce(
        (sum, trade) => sum + (trade.pnl || 0),
        0
      );
      const avgProfit = totalProfit / completedTrades.length;

      // Calculate average duration
      const durations = completedTrades
        .filter((trade) => trade.entryTime && trade.exitTime)
        .map((trade) => new Date(trade.exitTime) - new Date(trade.entryTime));

      const avgDuration =
        durations.length > 0
          ? durations.reduce((sum, duration) => sum + duration, 0) /
            durations.length
          : 0;

      // Find best and worst trades
      const bestTrade = completedTrades.reduce(
        (best, trade) => (!best || trade.pnl > best.pnl ? trade : best),
        null
      );

      const worstTrade = completedTrades.reduce(
        (worst, trade) => (!worst || trade.pnl < worst.pnl ? trade : worst),
        null
      );

      return {
        totalTrades: trades.length,
        completedTrades: completedTrades.length,
        openTrades: trades.length - completedTrades.length,
        winRate: parseFloat(winRate.toFixed(2)),
        avgProfit: parseFloat(avgProfit.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        avgDuration: avgDuration, // in milliseconds
        bestTrade,
        worstTrade,
        todayProfit,
      };
    } catch (error) {
      console.error("Error calculating statistics:", error);
      return {
        totalTrades: 0,
        completedTrades: 0,
        openTrades: 0,
        winRate: 0,
        avgProfit: 0,
        totalProfit: 0,
        avgDuration: 0,
        bestTrade: null,
        worstTrade: null,
        todayProfit: 0,
      };
    }
  }
}

export default TradingDatabase;
