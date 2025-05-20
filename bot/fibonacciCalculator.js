// src/bot/fibonacciCalculator.js

/**
 * Calculate Fibonacci levels for support and resistance
 * @param {Array} prices - Array of prices
 * @param {boolean} isUptrend - Whether we're in an uptrend
 * @returns {Object} Fibonacci levels for support and resistance
 */
export function calculateFibonacciLevels(prices, isUptrend) {
  // Find highest and lowest prices in the range
  const highestPrice = Math.max(...prices);
  const lowestPrice = Math.min(...prices);
  const range = highestPrice - lowestPrice;

  // Define Fibonacci retracement levels
  const levels = {
    0: isUptrend ? highestPrice : lowestPrice,
    0.236: isUptrend
      ? highestPrice - range * 0.236
      : lowestPrice + range * 0.236,
    0.382: isUptrend
      ? highestPrice - range * 0.382
      : lowestPrice + range * 0.382,
    0.5: isUptrend ? highestPrice - range * 0.5 : lowestPrice + range * 0.5,
    0.618: isUptrend
      ? highestPrice - range * 0.618
      : lowestPrice + range * 0.618,
    0.786: isUptrend
      ? highestPrice - range * 0.786
      : lowestPrice + range * 0.786,
    1: isUptrend ? lowestPrice : highestPrice,
  };

  // Define extension levels
  const extensions = {
    1.272: isUptrend
      ? highestPrice + range * 0.272
      : lowestPrice - range * 0.272,
    1.618: isUptrend
      ? highestPrice + range * 0.618
      : lowestPrice - range * 0.618,
    2.618: isUptrend
      ? highestPrice + range * 1.618
      : lowestPrice - range * 1.618,
  };

  // Determine key support and resistance levels based on current trend
  const currentPrice = prices[prices.length - 1];

  // Find closest level below current price (support)
  let support = lowestPrice;
  let closestSupportDistance = Math.abs(currentPrice - lowestPrice);

  // Find closest level above current price (resistance)
  let resistance = highestPrice;
  let closestResistanceDistance = Math.abs(highestPrice - currentPrice);

  // Check retracement levels
  for (const [level, price] of Object.entries(levels)) {
    const distance = Math.abs(currentPrice - price);

    if (price < currentPrice && distance < closestSupportDistance) {
      support = price;
      closestSupportDistance = distance;
    } else if (price > currentPrice && distance < closestResistanceDistance) {
      resistance = price;
      closestResistanceDistance = distance;
    }
  }

  // Check extension levels
  for (const [level, price] of Object.entries(extensions)) {
    const distance = Math.abs(currentPrice - price);

    if (price < currentPrice && distance < closestSupportDistance) {
      support = price;
      closestSupportDistance = distance;
    } else if (price > currentPrice && distance < closestResistanceDistance) {
      resistance = price;
      closestResistanceDistance = distance;
    }
  }

  return {
    support,
    resistance,
    levels,
    extensions,
    trend: isUptrend ? "up" : "down",
  };
}

/**
 * Calculate potential stop loss and take profit levels using Fibonacci
 * @param {Array} prices - Array of prices
 * @param {string} direction - Trading direction ('BUY' or 'SELL')
 * @param {number} entryPrice - Entry price for the trade
 * @returns {Object} Stop loss and take profit levels
 */
export function calculateStopLossTakeProfit(prices, direction, entryPrice) {
  const isUptrend = direction === "BUY";
  const { levels, extensions } = calculateFibonacciLevels(prices, isUptrend);

  let stopLoss, takeProfit;

  if (direction === "BUY") {
    // For buy orders, stop loss below entry, take profit above
    // Find closest Fibonacci level below entry for stop loss
    stopLoss = levels[1]; // Default to the lowest point

    for (const [level, price] of Object.entries(levels)) {
      if (price < entryPrice && price > stopLoss) {
        stopLoss = price;
      }
    }

    // Find first extension level for take profit
    takeProfit = extensions[1.272];
  } else {
    // SELL order
    // For sell orders, stop loss above entry, take profit below
    // Find closest Fibonacci level above entry for stop loss
    stopLoss = levels[0]; // Default to the highest point

    for (const [level, price] of Object.entries(levels)) {
      if (price > entryPrice && price < stopLoss) {
        stopLoss = price;
      }
    }

    // Find first extension level for take profit
    takeProfit = extensions[1.272];
  }

  return {
    stopLoss,
    takeProfit,
    risk: Math.abs(entryPrice - stopLoss),
    reward: Math.abs(takeProfit - entryPrice),
    riskRewardRatio:
      Math.abs(takeProfit - entryPrice) / Math.abs(entryPrice - stopLoss),
  };
}

export default {
  calculateFibonacciLevels,
  calculateStopLossTakeProfit,
};
