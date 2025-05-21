// src/database/tradingDatabase.js
import { connectToDatabase, Trade, ActiveSymbol, Config } from "./mongodb.js";

/**
 * Trading database service
 * MongoDB-based storage for trading data
 */
class TradingDatabase {
  /**
   * Initialize the database
   */
  static async initialize() {
    try {
      // Connect to MongoDB
      const connected = await connectToDatabase();
      if (!connected) {
        console.error("Failed to initialize database connection");
        return false;
      }

      // Initialize config if it doesn't exist
      const configCount = await Config.countDocuments();
      if (configCount === 0) {
        console.log("Initializing default config");
        const defaultConfig = {
          maxRiskPercent: 10,
          minRiskPercent: 0.5,
          maxLot: 10,
          minLot: 0.01,
          targetDailyGrowth: 30,
          stopLossMultiplier: 0.5,
          takeProfitMultiplier: 1.5,
        };

        await Config.create(defaultConfig);
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
      const trades = await Trade.find().sort({ timestamp: -1 });
      return trades;
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
      await Trade.create({
        ...trade,
        timestamp: new Date(),
      });
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
      const result = await Trade.findByIdAndUpdate(tradeId, {
        ...updates,
        updatedAt: new Date(),
      });

      if (!result) {
        console.error(`Trade not found: ${tradeId}`);
        return false;
      }

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
      const activeSymbols = await ActiveSymbol.find();
      return activeSymbols.map((item) => item.symbol);
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
      const exists = await ActiveSymbol.findOne({ symbol });

      if (!exists) {
        await ActiveSymbol.create({ symbol });
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
      await ActiveSymbol.deleteOne({ symbol });
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
      const config = await Config.findOne().sort({ lastUpdated: -1 });

      if (!config) {
        // Return default config if none exists
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

      // Convert to plain object and remove Mongoose specific properties
      const configObj = config.toObject();
      delete configObj._id;
      delete configObj.__v;
      delete configObj.lastUpdated;

      return configObj;
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
      // Get the current config
      const currentConfig = await Config.findOne().sort({ lastUpdated: -1 });

      if (currentConfig) {
        // Update existing config
        Object.assign(currentConfig, config, { lastUpdated: new Date() });
        await currentConfig.save();
      } else {
        // Create new config
        await Config.create({
          ...config,
          lastUpdated: new Date(),
        });
      }

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
      const trades = await Trade.find({ symbol }).sort({ entryTime: -1 });
      return trades;
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
      const trades = await Trade.find({
        timestamp: { $gte: startDate, $lte: endDate },
      }).sort({ timestamp: -1 });

      return trades;
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
      const trades = await Trade.find({ status: "OPEN" });
      return trades;
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
      const trades = await Trade.find();

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
