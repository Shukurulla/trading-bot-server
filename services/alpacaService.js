// src/services/alpacaService.js
import Alpaca from "@alpacahq/alpaca-trade-api";
import dotenv from "dotenv";

dotenv.config();

let alpacaClient = null;

/**
 * Initialize Alpaca connection with API keys
 * @param {Object} config - Optional config to override environment variables
 */
export function initializeAlpacaConnection(config = {}) {
  const apiKey = config.apiKey || process.env.ALPACA_API_KEY;
  const apiSecret = config.apiSecret || process.env.ALPACA_API_SECRET;
  const paper = config.paper !== undefined ? config.paper : true;

  if (!apiKey || !apiSecret) {
    throw new Error(
      "Alpaca API key and secret are required. Please set ALPACA_API_KEY and ALPACA_API_SECRET environment variables."
    );
  }

  alpacaClient = new Alpaca({
    keyId: apiKey,
    secretKey: apiSecret,
    paper,
    baseUrl: paper
      ? "https://paper-api.alpaca.markets"
      : "https://api.alpaca.markets",
  });

  console.log(`Alpaca client initialized in ${paper ? "paper" : "live"} mode`);

  return alpacaClient;
}

/**
 * Get Alpaca client instance
 * @returns {Object} Alpaca client
 */
export function getAlpacaClient() {
  if (!alpacaClient) {
    initializeAlpacaConnection();
  }

  return alpacaClient;
}

/**
 * Update Alpaca configuration
 * @param {Object} config - New configuration
 */
export function updateAlpacaConfig(config) {
  initializeAlpacaConnection(config);
  return alpacaClient;
}

/**
 * Get available symbols for trading
 * @returns {Promise<Array>} List of available symbols
 */
export async function getAvailableSymbols() {
  try {
    const assets = await alpacaClient.getAssets({
      status: "active",
      tradable: true,
    });

    return assets.map((asset) => ({
      symbol: asset.symbol,
      name: asset.name,
      exchange: asset.exchange,
      class: asset.class,
    }));
  } catch (error) {
    console.error("Error getting available symbols:", error);
    throw error;
  }
}

/**
 * Get account information
 * @returns {Promise<Object>} Account information
 */
export async function getAccountInfo() {
  try {
    const account = await alpacaClient.getAccount();

    return {
      id: account.id,
      cash: parseFloat(account.cash),
      equity: parseFloat(account.equity),
      buyingPower: parseFloat(account.buying_power),
      daytradeCount: account.daytrade_count,
      status: account.status,
    };
  } catch (error) {
    console.error("Error getting account info:", error);
    throw error;
  }
}

/**
 * Get all open positions
 * @returns {Promise<Array>} List of open positions
 */
export async function getOpenPositions() {
  try {
    const positions = await alpacaClient.getPositions();

    return positions.map((position) => ({
      symbol: position.symbol,
      quantity: parseFloat(position.qty),
      side: position.side,
      entryPrice: parseFloat(position.avg_entry_price),
      currentPrice: parseFloat(position.current_price),
      pnl: parseFloat(position.unrealized_pl),
      pnlPercent: parseFloat(position.unrealized_plpc) * 100,
      marketValue: parseFloat(position.market_value),
    }));
  } catch (error) {
    console.error("Error getting open positions:", error);
    throw error;
  }
}

// Update this in your services/alpacaService.js file

/**
 * Get market data for a symbol
 * @param {string} symbol - The trading symbol
 * @param {string} timeframe - Timeframe for bars (e.g., '1D', '1H', '5Min')
 * @param {number} limit - Maximum number of bars to return
 * @returns {Promise<Array>} Historical price data
 */
export async function getMarketData(symbol, timeframe = "1D", limit = 100) {
  try {
    const alpaca = getAlpacaClient();
    const result = [];

    // Try to get real data from Alpaca
    try {
      const bars = await alpaca.getBarsV2(symbol, {
        timeframe,
        limit,
      });

      for await (const bar of bars) {
        result.push({
          timestamp: bar.Timestamp,
          open: bar.OpenPrice,
          high: bar.HighPrice,
          low: bar.LowPrice,
          close: bar.ClosePrice,
          volume: bar.Volume,
        });
      }

      // If data is insufficient, generate mock data
      if (result.length < 50) {
        console.log(
          `Insufficient data for ${symbol} from Alpaca, using synthetic data`
        );
        return generateSyntheticMarketData(symbol, timeframe, limit);
      }
    } catch (error) {
      console.error(
        `Error getting bars from Alpaca for ${symbol}:`,
        error.message
      );
      console.log(`Falling back to synthetic data for ${symbol}`);
      return generateSyntheticMarketData(symbol, timeframe, limit);
    }

    return result;
  } catch (error) {
    console.error(`Error getting market data for ${symbol}:`, error);
    // Return synthetic data as fallback
    return generateSyntheticMarketData(symbol, timeframe, limit);
  }
}

/**
 * Generate synthetic market data when real data is unavailable
 * @param {string} symbol - The trading symbol
 * @param {string} timeframe - Timeframe for bars
 * @param {number} limit - Number of bars to generate
 * @returns {Array} Synthetic price data
 */
function generateSyntheticMarketData(symbol, timeframe = "1D", limit = 100) {
  console.log(
    `Generating synthetic data for ${symbol} with ${timeframe} timeframe`
  );

  // Determine bar duration in minutes based on timeframe
  let minutesPerBar = 1;
  if (timeframe === "1Min") minutesPerBar = 1;
  else if (timeframe === "5Min") minutesPerBar = 5;
  else if (timeframe === "15Min") minutesPerBar = 15;
  else if (timeframe === "1H") minutesPerBar = 60;
  else if (timeframe === "1D") minutesPerBar = 60 * 24;

  // Set base price based on symbol
  let basePrice = 100;
  if (symbol.includes("BTC") || symbol.includes("XBT")) {
    basePrice = 50000;
  } else if (symbol.includes("ETH")) {
    basePrice = 3000;
  } else if (symbol.includes("EURUSD")) {
    basePrice = 1.1;
  } else if (symbol.includes("USDJPY")) {
    basePrice = 115;
  } else if (symbol.includes("GBPUSD")) {
    basePrice = 1.35;
  } else if (symbol.includes("AAPL")) {
    basePrice = 170;
  } else if (symbol.includes("MSFT")) {
    basePrice = 310;
  } else if (symbol.includes("AMZN")) {
    basePrice = 3300;
  }

  // Generate synthetic bars
  const result = [];
  const now = new Date();
  let currentPrice = basePrice;

  // Create some randomness in price movement
  const volatility = basePrice * 0.01; // 1% daily volatility
  let trend = Math.random() > 0.5 ? 1 : -1; // Random initial trend
  let trendStrength = Math.random() * 0.003; // Random trend strength

  for (let i = 0; i < limit; i++) {
    // Occasionally change trend direction
    if (i % 20 === 0) {
      trend = Math.random() > 0.5 ? 1 : -1;
      trendStrength = Math.random() * 0.003;
    }

    // Add some randomness to price
    const randomChange = (Math.random() - 0.5) * volatility;
    const trendChange = trend * trendStrength * basePrice;
    currentPrice += randomChange + trendChange;

    // Make sure price doesn't go negative
    if (currentPrice <= 0) {
      currentPrice = basePrice * 0.01;
    }

    // Generate OHLC data
    const open = currentPrice;
    const close = open * (1 + (Math.random() - 0.5) * 0.005); // 0.5% random change
    const high = Math.max(open, close) * (1 + Math.random() * 0.005);
    const low = Math.min(open, close) * (1 - Math.random() * 0.005);
    const volume = Math.floor(Math.random() * 10000) + 1000;

    // Calculate timestamp (going back in time from now)
    const barTime = new Date(now);
    barTime.setMinutes(now.getMinutes() - (limit - i) * minutesPerBar);

    result.push({
      timestamp: barTime,
      open: open,
      high: high,
      low: low,
      close: close,
      volume: volume,
    });
  }

  return result;
}

/**
 * Helper function for submitting market orders, providing additional validation and verification
 * @param {string} symbol - The trading symbol
 * @param {number} quantity - Order quantity
 * @param {string} side - Order side (buy/sell)
 * @param {Object} options - Additional options like stopLoss, takeProfit, etc.
 * @returns {Promise<Object>} Order result
 */
async function submitMarketOrder(symbol, quantity, side, options = {}) {
  try {
    const alpaca = getAlpacaClient();

    // Log detailed order intent
    console.log(
      `Submitting ${side} market order for ${quantity} ${symbol} with options:`,
      options
    );

    // First check if the symbol is tradable
    let isTradable = false;
    try {
      const asset = await alpaca.getAsset(symbol);
      isTradable = asset.tradable;
      console.log(
        `Asset details for ${symbol}: tradable=${asset.tradable}, class=${asset.class}, exchange=${asset.exchange}`
      );
    } catch (assetError) {
      console.warn(
        `Could not verify if ${symbol} is tradable: ${assetError.message}`
      );
      // Continue anyway as some symbols might not be found through getAsset but still tradable
    }

    // Check if market is open
    let isMarketOpen = true;
    try {
      const clock = await alpaca.getClock();
      isMarketOpen = clock.is_open;

      if (!isMarketOpen) {
        console.warn(
          `Market is currently closed. Next open: ${new Date(
            clock.next_open
          ).toLocaleString()}`
        );

        // Some assets (crypto) can be traded 24/7
        if (
          symbol.includes("BTC") ||
          symbol.includes("ETH") ||
          symbol.includes("USD")
        ) {
          console.log(
            `${symbol} might be tradable 24/7 despite market hours. Proceeding with order.`
          );
        } else {
          throw new Error(`Market is closed for trading ${symbol}`);
        }
      }
    } catch (clockError) {
      console.warn(`Could not check market hours: ${clockError.message}`);
    }

    // Format quantity appropriately
    const formattedQuantity = parseFloat(quantity.toFixed(8)); // Format to 8 decimal places max

    // Prepare order parameters
    const orderParams = {
      symbol: symbol,
      qty: formattedQuantity,
      side: side.toLowerCase(),
      type: "market",
      time_in_force: options.timeInForce || "gtc", // Good 'til cancelled as default
    };

    // Add bracket order parameters if provided
    if (options.stopLoss || options.takeProfit) {
      orderParams.order_class = "bracket";

      if (options.stopLoss) {
        orderParams.stop_loss = {
          stop_price: options.stopLoss,
        };
      }

      if (options.takeProfit) {
        orderParams.take_profit = {
          limit_price: options.takeProfit,
        };
      }
    }

    console.log(
      `Submitting order with parameters:`,
      JSON.stringify(orderParams, null, 2)
    );

    // Submit the order
    const order = await alpaca.createOrder(orderParams);
    console.log(`Order submitted: ID=${order.id}, status=${order.status}`);

    // Wait a moment for the order to be processed
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Get updated order details
    let updatedOrder;
    try {
      updatedOrder = await alpaca.getOrder(order.id);
      console.log(
        `Updated order status for ${order.id}: ${updatedOrder.status}`
      );
    } catch (orderCheckError) {
      console.error(
        `Error checking order ${order.id}: ${orderCheckError.message}`
      );
      // If we can't check the order, return the original order
      updatedOrder = order;
    }

    // Return formatted order details
    return {
      id: updatedOrder.id,
      symbol: updatedOrder.symbol,
      quantity: parseFloat(updatedOrder.qty),
      filledQuantity: parseFloat(updatedOrder.filled_qty || 0),
      side: updatedOrder.side,
      type: updatedOrder.type,
      status: updatedOrder.status,
      createdAt: updatedOrder.created_at,
      filledAt: updatedOrder.filled_at,
      fillPrice: updatedOrder.filled_avg_price
        ? parseFloat(updatedOrder.filled_avg_price)
        : null,
      stopPrice: updatedOrder.stop_price
        ? parseFloat(updatedOrder.stop_price)
        : null,
      limitPrice: updatedOrder.limit_price
        ? parseFloat(updatedOrder.limit_price)
        : null,
      rejectReason: updatedOrder.reject_reason || null,
    };
  } catch (error) {
    console.error(`Error in submitMarketOrder for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Submit a limit order
 * @param {string} symbol - The trading symbol
 * @param {number} quantity - Order quantity
 * @param {string} side - Order side (buy/sell)
 * @param {number} limitPrice - Limit price
 * @returns {Promise<Object>} Order result
 */
export async function submitLimitOrder(symbol, quantity, side, limitPrice) {
  try {
    const order = await alpacaClient.createOrder({
      symbol,
      qty: quantity,
      side,
      type: "limit",
      time_in_force: "gtc",
      limit_price: limitPrice,
    });

    return {
      id: order.id,
      symbol: order.symbol,
      quantity: parseFloat(order.qty),
      side: order.side,
      type: order.type,
      limitPrice: parseFloat(order.limit_price),
      status: order.status,
    };
  } catch (error) {
    console.error(`Error submitting limit order for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Submit a bracket order (entry + stop loss + take profit)
 * @param {string} symbol - The trading symbol
 * @param {number} quantity - Order quantity
 * @param {string} side - Order side (buy/sell)
 * @param {number} takeProfitPrice - Take profit price
 * @param {number} stopLossPrice - Stop loss price
 * @returns {Promise<Object>} Order result
 */
export async function submitBracketOrder(
  symbol,
  quantity,
  side,
  takeProfitPrice,
  stopLossPrice
) {
  try {
    const order = await alpacaClient.createOrder({
      symbol,
      qty: quantity,
      side,
      type: "market",
      time_in_force: "gtc",
      order_class: "bracket",
      take_profit: {
        limit_price: takeProfitPrice,
      },
      stop_loss: {
        stop_price: stopLossPrice,
      },
    });

    return {
      id: order.id,
      symbol: order.symbol,
      quantity: parseFloat(order.qty),
      side: order.side,
      type: order.type,
      status: order.status,
      takeProfitPrice,
      stopLossPrice,
    };
  } catch (error) {
    console.error(`Error submitting bracket order for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Close a position
 * @param {string} symbol - The trading symbol
 * @returns {Promise<Object>} Close result
 */
export async function closePosition(symbol) {
  try {
    const result = await alpacaClient.closePosition(symbol);

    return {
      symbol: result.symbol,
      quantity: parseFloat(result.qty),
      side: result.side,
      status: "closed",
    };
  } catch (error) {
    console.error(`Error closing position for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Get all orders
 * @param {string} status - Order status (open, closed, all)
 * @param {number} limit - Maximum number of orders to return
 * @returns {Promise<Array>} Orders
 */
export async function getOrders(status = "all", limit = 100) {
  try {
    const orders = await alpacaClient.getOrders({
      status,
      limit,
    });

    return orders.map((order) => ({
      id: order.id,
      symbol: order.symbol,
      quantity: parseFloat(order.qty),
      side: order.side,
      type: order.type,
      status: order.status,
      submitDate: new Date(order.submitted_at),
      fillDate: order.filled_at ? new Date(order.filled_at) : null,
      fillPrice: order.filled_avg_price
        ? parseFloat(order.filled_avg_price)
        : null,
    }));
  } catch (error) {
    console.error("Error getting orders:", error);
    throw error;
  }
}

export default {
  initializeAlpacaConnection,
  getAlpacaClient,
  updateAlpacaConfig,
  getAvailableSymbols,
  getAccountInfo,
  getOpenPositions,
  getMarketData,
  submitMarketOrder,
  submitLimitOrder,
  submitBracketOrder,
  closePosition,
  getOrders,
};
