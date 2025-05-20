// src/bot/tradingBot.js
import { io } from "../server.js";
import { getAlpacaClient } from "../services/alpacaService.js";
import { performTechnicalAnalysis } from "./analysisEngine.js";
import { calculateFibonacciLevels } from "./fibonacciCalculator.js";
import TradingDatabase from "../database/tradingDatabase.js";

// Trading bot configuration
const DEFAULT_CONFIG = {
  maxRiskPercent: 10,
  minRiskPercent: 0.5,
  maxLot: 10,
  minLot: 0.01,
  targetDailyGrowth: 30,
  stopLossMultiplier: 0.5,
  takeProfitMultiplier: 1.5,
};

// Active trading symbols
let activeSymbols = new Map();
let isRunning = false;
let config = { ...DEFAULT_CONFIG };

/**
 * Start the trading bot
 */
export async function startTradingBot() {
  try {
    isRunning = true;
    console.log("Trading bot started");

    await TradingDatabase.initialize();

    const savedSymbols = await TradingDatabase.getActiveSymbols();
    savedSymbols.forEach((symbol) => {
      activeSymbols.set(symbol, {
        isTrading: false,
        lastAnalysis: null,
        openPositions: [],
        analysisHistory: [],
      });
    });

    io.emit("botStatus", {
      running: isRunning,
      activeSymbols: Array.from(activeSymbols.keys()),
    });

    runAnalysisLoop();
  } catch (error) {
    console.error("Error starting trading bot:", error);
    stopTradingBot();
  }
}

/**
 * Stop the trading bot
 */
export function stopTradingBot() {
  isRunning = false;
  console.log("Trading bot stopped");
  io.emit("botStatus", { running: isRunning });
}

/**
 * Add a new symbol to the trading bot
 * @param {string} symbol - The symbol to add
 */
export async function addSymbol(symbol) {
  if (!activeSymbols.has(symbol)) {
    activeSymbols.set(symbol, {
      isTrading: false,
      lastAnalysis: null,
      openPositions: [],
      analysisHistory: [],
    });
    await TradingDatabase.addActiveSymbol(symbol);
    io.emit("botStatus", {
      running: isRunning,
      activeSymbols: Array.from(activeSymbols.keys()),
    });
    console.log(`Added symbol: ${symbol}`);
  }
}

/**
 * Remove a symbol from the trading bot
 * @param {string} symbol - The symbol to remove
 */
export async function removeSymbol(symbol) {
  if (activeSymbols.has(symbol)) {
    await closeAllPositionsForSymbol(symbol);

    activeSymbols.delete(symbol);
    await TradingDatabase.removeActiveSymbol(symbol);
    io.emit("botStatus", {
      running: isRunning,
      activeSymbols: Array.from(activeSymbols.keys()),
    });
    console.log(`Removed symbol: ${symbol}`);
  }
}

/**
 * Update trading bot configuration
 * @param {object} newConfig - The new configuration
 */
export function updateConfig(newConfig) {
  config = { ...config, ...newConfig };
  io.emit("botConfig", config);
  console.log("Updated bot configuration:", config);
}

/**
 * Run the continuous analysis loop
 */
async function runAnalysisLoop() {
  console.log("Starting analysis loop");

  let hasCreatedTestTrades = false;

  while (isRunning) {
    try {
      const alpaca = getAlpacaClient();

      let account;
      try {
        account = await alpaca.getAccount();
        console.log(`Account status: ${account.status}`);
      } catch (accountError) {
        console.error("Failed to get account info:", accountError.message);
        account = { equity: 10000 };
        console.log("Using default account balance of $10000");
      }

      const balance = parseFloat(account.equity);

      console.log(`Current balance: $${balance}`);
      io.emit("accountUpdate", { balance });

      let positions = [];
      try {
        positions = await alpaca.getPositions();
        console.log(`Retrieved ${positions.length} positions from Alpaca`);
      } catch (positionsError) {
        console.error("Failed to get positions:", positionsError.message);
        const openTrades = await TradingDatabase.getOpenTrades();
        console.log(
          `Using ${openTrades.length} open trades from database instead`
        );

        positions = openTrades.map((trade) => ({
          symbol: trade.symbol,
          qty: trade.quantity,
          side: trade.side,
          avg_entry_price: trade.entryPrice,
          current_price: trade.entryPrice,
          unrealized_pl: 0,
          unrealized_plpc: 0,
        }));
      }

      if (
        !hasCreatedTestTrades &&
        positions.length === 0 &&
        activeSymbols.size > 0
      ) {
        const symbols = Array.from(activeSymbols.keys());

        const existingTrades = await TradingDatabase.getTrades();
        if (existingTrades.length === 0) {
          console.log(
            "No positions found and no existing trades - creating test trades"
          );

          for (let i = 0; i < Math.min(3, symbols.length); i++) {
            const randomSymbol = symbols[i];
            const randomDirection = Math.random() > 0.5 ? "BUY" : "SELL";
            const mockAnalysis = {
              symbol: randomSymbol,
              price: randomSymbol.includes("BTC")
                ? 50000
                : randomSymbol.includes("ETH")
                ? 3000
                : randomSymbol.includes("EUR")
                ? 1.1
                : randomSymbol.includes("GBP")
                ? 1.35
                : randomSymbol.includes("JPY")
                ? 115
                : 100,
              timestamp: new Date(),
              direction: randomDirection,
              confidence: 70 + Math.floor(Math.random() * 20),
              dangerSignals: [],
            };

            console.log(
              `Creating test trade for ${randomSymbol} - ${randomDirection}`
            );
            await openNewPosition(
              randomSymbol,
              activeSymbols.get(randomSymbol),
              mockAnalysis,
              balance
            );
          }

          hasCreatedTestTrades = true;
        } else {
          console.log(
            `Found ${existingTrades.length} existing trades in database, not creating test trades`
          );
          hasCreatedTestTrades = true;
        }
      }

      for (const [symbol, data] of activeSymbols.entries()) {
        await processSymbol(symbol, data, balance, positions);
      }

      console.log("Waiting 60 seconds until next analysis cycle...");
      await new Promise((resolve) => setTimeout(resolve, 60000));
    } catch (error) {
      console.error("Error in analysis loop:", error);
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
}

/**
 * Generate mock price data for testing when real data is not available
 * @param {string} symbol - Trading symbol
 * @param {number} barCount - Number of bars to generate
 * @returns {Array} Generated bar data
 */
async function generateMockBarData(symbol, barCount = 100) {
  console.log(
    `Generating mock data for ${symbol} since real data is not available`
  );

  let basePrice = 0;

  if (symbol.includes("BTC") || symbol.includes("XBT")) {
    basePrice = 50000 + Math.random() * 5000;
  } else if (symbol.includes("ETH")) {
    basePrice = 3000 + Math.random() * 300;
  } else if (symbol.includes("EURUSD")) {
    basePrice = 1.1 + Math.random() * 0.05;
  } else if (symbol.includes("USDJPY")) {
    basePrice = 110 + Math.random() * 5;
  } else if (symbol.includes("GBPUSD")) {
    basePrice = 1.3 + Math.random() * 0.05;
  } else {
    basePrice = 100 + Math.random() * 20;
  }

  const bars = [];
  const now = new Date();
  const volatility = basePrice * 0.01;

  let currentPrice = basePrice;
  let trendDirection = Math.random() > 0.5 ? 1 : -1;
  let trendStrength = Math.random() * 0.01;

  for (let i = 0; i < barCount; i++) {
    if (i % 20 === 0) {
      trendDirection = Math.random() > 0.5 ? 1 : -1;
      trendStrength = Math.random() * 0.01;
    }

    const change =
      (Math.random() - 0.5) * volatility +
      trendDirection * trendStrength * basePrice;
    currentPrice += change;

    if (currentPrice <= 0) {
      currentPrice = basePrice * 0.1;
    }

    const open = currentPrice;
    const close = currentPrice + (Math.random() - 0.5) * volatility * 0.5;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 1000) + 100;

    const timestamp = new Date(now);
    timestamp.setMinutes(now.getMinutes() - i * 5);

    bars.push({
      timestamp: timestamp.toISOString(),
      open: open,
      high: high,
      low: low,
      close: close,
      volume: volume,
    });
  }

  return bars.reverse();
}

/**
 * Process a single symbol
 * @param {string} symbol - The trading symbol
 * @param {object} data - Symbol trading data
 * @param {number} balance - Account balance
 * @param {Array} positions - Current open positions
 */
async function processSymbol(symbol, data, balance, positions) {
  try {
    const alpaca = getAlpacaClient();
    let barData = [];

    try {
      const bars = await alpaca.getBarsV2(symbol, {
        timeframe: "5Min",
        limit: 100,
      });

      for await (const bar of bars) {
        barData.push({
          timestamp: bar.Timestamp,
          open: bar.OpenPrice,
          high: bar.HighPrice,
          low: bar.LowPrice,
          close: bar.ClosePrice,
          volume: bar.Volume,
        });
      }
    } catch (error) {
      console.error(`Error getting real data for ${symbol}:`, error.message);
    }

    if (barData.length < 50) {
      console.log(
        `Not enough data for symbol ${symbol}, using mock data instead`
      );
      barData = await generateMockBarData(symbol, 100);
    }

    let analysis = await performTechnicalAnalysis(symbol, barData);

    if (!analysis || !analysis.direction || analysis.confidence === undefined) {
      console.warn(`Invalid analysis for ${symbol}, using fallback values`);
      analysis = {
        symbol,
        direction: Math.random() > 0.5 ? "BUY" : "SELL",
        confidence: 70,
        price: barData[barData.length - 1]?.close || 100,
        dangerSignals: [],
        timestamp: new Date(),
      };
    }

    data.analysisHistory.push({
      timestamp: new Date(),
      ...analysis,
    });

    if (data.analysisHistory.length > 100) {
      data.analysisHistory.shift();
    }

    data.lastAnalysis = analysis;

    io.emit("analysisUpdate", {
      symbol,
      analysis,
      timestamp: new Date(),
    });

    console.log(
      `Analysis for ${symbol}: Direction ${analysis.direction}, Confidence ${analysis.confidence}%`
    );

    const symbolPositions = positions.filter((p) => p.symbol === symbol);
    data.openPositions = symbolPositions;

    if (symbolPositions.length > 0) {
      await manageExistingPositions(symbol, data, analysis);
    } else if (analysis.confidence >= 60) {
      console.log(`Attempting to open new position for ${symbol}`);
      await openNewPosition(symbol, data, analysis, balance);
    } else {
      console.log(
        `Confidence ${analysis.confidence}% for ${symbol} is below threshold (60%), skipping trade`
      );
    }
  } catch (error) {
    console.error(`Error processing symbol ${symbol}:`, error);
  }
}

/**
 * Manage existing positions for a symbol
 * @param {string} symbol - The trading symbol
 * @param {object} data - Symbol trading data
 * @param {object} analysis - Technical analysis results
 */
async function manageExistingPositions(symbol, data, analysis) {
  try {
    const alpaca = getAlpacaClient();
    const position = data.openPositions[0];

    const currentDirection = position.side === "long" ? "BUY" : "SELL";

    if (analysis.direction !== currentDirection && analysis.confidence >= 75) {
      console.log(
        `${symbol}: Trend reversed with high confidence. Closing position and reversing.`
      );

      await alpaca.closePosition(symbol);

      await TradingDatabase.saveTrade({
        symbol,
        entryPrice: parseFloat(position.avg_entry_price),
        exitPrice: parseFloat(position.current_price),
        quantity: parseFloat(position.qty),
        side: position.side,
        pnl: parseFloat(position.unrealized_pl),
        entryTime: new Date(position.created_at),
        exitTime: new Date(),
        status: "CLOSED_REVERSAL",
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const account = await alpaca.getAccount();
      const balance = parseFloat(account.equity);
      await openNewPosition(symbol, data, analysis, balance);
    } else if (analysis.dangerSignals && analysis.dangerSignals.length > 0) {
      const significantDanger = analysis.dangerSignals.some(
        (signal) => signal.importance >= 7
      );

      if (significantDanger) {
        console.log(
          `${symbol}: Significant danger detected. Closing position to secure profits/minimize loss.`
        );

        await alpaca.closePosition(symbol);

        await TradingDatabase.saveTrade({
          symbol,
          entryPrice: parseFloat(position.avg_entry_price),
          exitPrice: parseFloat(position.current_price),
          quantity: parseFloat(position.qty),
          side: position.side,
          pnl: parseFloat(position.unrealized_pl),
          entryTime: new Date(position.created_at),
          exitTime: new Date(),
          status: "CLOSED_DANGER",
        });
      }
    }
  } catch (error) {
    console.error(`Error managing positions for ${symbol}:`, error);
  }
}

/**
 * Open a new trading position
 * @param {string} symbol - The trading symbol
 * @param {object} data - Symbol trading data
 * @param {object} analysis - Technical analysis results
 * @param {number} balance - Account balance
 */
async function openNewPosition(symbol, data, analysis, balance) {
  try {
    console.log(
      `Opening position for ${symbol} with confidence ${analysis.confidence}%`
    );

    const riskPercent =
      (config.maxRiskPercent - config.minRiskPercent) *
        (analysis.confidence / 100) +
      config.minRiskPercent;

    const riskAmount = balance * (riskPercent / 100);

    const alpaca = getAlpacaClient();
    let currentPrice;

    try {
      const lastQuote = await alpaca.getLatestQuote(symbol);
      currentPrice = (lastQuote.bidprice + lastQuote.askprice) / 2;
    } catch (error) {
      console.warn(
        `Failed to get latest quote for ${symbol}, using analysis price`
      );
      currentPrice = analysis.price || 100; // Fallback to analysis price or default
    }

    const baseQuantity = riskAmount / currentPrice;

    const lotMultiplier =
      (config.maxLot - config.minLot) * (analysis.confidence / 100) +
      config.minLot;

    let quantity = baseQuantity * lotMultiplier; // Define quantity here

    // Ensure quantity is within acceptable range
    quantity = Math.max(config.minLot, Math.min(config.maxLot, quantity));
    quantity = parseFloat(quantity.toFixed(6));

    const recentBars = data.analysisHistory.slice(-20);
    const prices = recentBars.map((bar) => bar.price || currentPrice);
    const fibLevels = calculateFibonacciLevels(
      prices,
      analysis.direction === "BUY"
    );

    let stopLossPrice, takeProfitPrice;

    if (analysis.direction === "BUY") {
      stopLossPrice = fibLevels.support || currentPrice * (1 - 0.02);
      takeProfitPrice = fibLevels.resistance || currentPrice * (1 + 0.05);
    } else {
      stopLossPrice = fibLevels.resistance || currentPrice * (1 + 0.02);
      takeProfitPrice = fibLevels.support || currentPrice * (1 - 0.05);
    }

    stopLossPrice = parseFloat(stopLossPrice.toFixed(2));
    takeProfitPrice = parseFloat(takeProfitPrice.toFixed(2));

    console.log(
      `Order details: ${analysis.direction}, Quantity: ${quantity}, Price: ${currentPrice}, SL: ${stopLossPrice}, TP: ${takeProfitPrice}`
    );

    const order = await alpaca.createOrder({
      symbol: symbol,
      qty: quantity,
      side: analysis.direction === "BUY" ? "buy" : "sell",
      type: "market",
      time_in_force: "gtc",
      order_class: "bracket",
      stop_loss: {
        stop_price: stopLossPrice,
      },
      take_profit: {
        limit_price: takeProfitPrice,
      },
    });

    await TradingDatabase.saveTrade({
      symbol,
      entryPrice: currentPrice,
      quantity: quantity,
      side: analysis.direction === "BUY" ? "long" : "short",
      stopLoss: stopLossPrice,
      takeProfit: takeProfitPrice,
      entryTime: new Date(),
      confidence: analysis.confidence,
      status: "OPEN",
      orderId: order.id,
    });

    io.emit("newTrade", {
      symbol,
      side: analysis.direction === "BUY" ? "long" : "short",
      quantity: quantity,
      price: currentPrice,
      stopLoss: stopLossPrice,
      takeProfit: takeProfitPrice,
      confidence: analysis.confidence,
      timestamp: new Date(),
    });

    console.log(
      `Successfully opened position for ${symbol}, Order ID: ${order.id}`
    );
  } catch (error) {
    console.error(`Failed to open position for ${symbol}:`, error.message);
  }
}

/**
 * Close all positions for a specific symbol
 * @param {string} symbol - The trading symbol to close positions for
 */
async function closeAllPositionsForSymbol(symbol) {
  try {
    const alpaca = getAlpacaClient();
    await alpaca.closePosition(symbol);
    console.log(`Closed all positions for ${symbol}`);
  } catch (error) {
    if (!error.message.includes("position does not exist")) {
      console.error(`Error closing positions for ${symbol}:`, error);
    }
  }
}

export default {
  startTradingBot,
  stopTradingBot,
  addSymbol,
  removeSymbol,
  updateConfig,
};
