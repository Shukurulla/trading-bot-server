// src/bot/analysisEngine.js
import { technicalIndicators } from "../services/technicalIndicators.js";
import { getMarketNews } from "../services/marketNewsService.js";

/**
 * Perform comprehensive 10-step technical analysis on a trading symbol
 * @param {string} symbol - The trading symbol
 * @param {Array} barData - Historical price data
 * @returns {Object} Analysis results
 */
export async function performTechnicalAnalysis(symbol, barData) {
  try {
    // Extract price data
    const closes = barData.map((bar) => bar.close);
    const highs = barData.map((bar) => bar.high);
    const lows = barData.map((bar) => bar.low);
    const volumes = barData.map((bar) => bar.volume);
    const currentPrice = closes[closes.length - 1];

    // Store analysis results from each step
    const results = {
      symbol,
      price: currentPrice,
      timestamp: new Date(),
      analyses: [],
      direction: null, // BUY or SELL
      confidence: 0, // 0-100%
      dangerSignals: [],
    };

    // STEP 1: Moving Average Analysis
    const maResult = analyzeMovingAverages(closes);
    results.analyses.push({
      name: "Moving Averages",
      result: maResult,
      weight: 15,
    });

    // STEP 2: RSI Analysis
    const rsiResult = analyzeRSI(closes);
    results.analyses.push({
      name: "RSI",
      result: rsiResult,
      weight: 10,
    });

    // STEP 3: MACD Analysis
    const macdResult = analyzeMACD(closes);
    results.analyses.push({
      name: "MACD",
      result: macdResult,
      weight: 12,
    });

    // STEP 4: Bollinger Bands Analysis
    const bbResult = analyzeBollingerBands(closes);
    results.analyses.push({
      name: "Bollinger Bands",
      result: bbResult,
      weight: 10,
    });

    // STEP 5: Support/Resistance Analysis
    const srResult = analyzeSupportResistance(highs, lows, closes);
    results.analyses.push({
      name: "Support/Resistance",
      result: srResult,
      weight: 12,
    });

    // STEP 6: Volume Analysis
    const volumeResult = analyzeVolume(closes, volumes);
    results.analyses.push({
      name: "Volume",
      result: volumeResult,
      weight: 8,
    });

    // STEP 7: Candlestick Pattern Analysis
    const candleResult = analyzeCandlestickPatterns(barData);
    results.analyses.push({
      name: "Candlestick Patterns",
      result: candleResult,
      weight: 10,
    });

    // STEP 8: Fibonacci Retracement Analysis
    const fibResult = analyzeFibonacciLevels(highs, lows, closes);
    results.analyses.push({
      name: "Fibonacci",
      result: fibResult,
      weight: 8,
    });

    // STEP 9: Trend Strength Analysis
    const adxResult = analyzeADX(highs, lows, closes);
    results.analyses.push({
      name: "Trend Strength",
      result: adxResult,
      weight: 7,
    });

    // STEP 10: Market Sentiment Analysis (news, etc.)
    const sentimentResult = await analyzeMarketSentiment(symbol);
    results.analyses.push({
      name: "Market Sentiment",
      result: sentimentResult,
      weight: 8,
    });

    // Calculate final direction and confidence
    const { direction, confidence, dangerSignals } = calculateFinalResult(
      results.analyses
    );
    results.direction = direction;
    results.confidence = confidence;
    results.dangerSignals = dangerSignals;

    return results;
  } catch (error) {
    console.error("Error in technical analysis:", error);
    // Return a default result on error
    return {
      symbol,
      price: barData[barData.length - 1].close,
      timestamp: new Date(),
      analyses: [],
      direction: "NEUTRAL",
      confidence: 50,
      dangerSignals: [],
      error: error.message,
    };
  }
}

/**
 * Analyze moving averages (EMA and SMA)
 * @param {Array} closes - Array of closing prices
 * @returns {Object} Analysis result
 */
function analyzeMovingAverages(closes) {
  const ema9 = technicalIndicators.ema(closes, 9);
  const sma20 = technicalIndicators.sma(closes, 20);
  const sma50 = technicalIndicators.sma(closes, 50);
  const sma200 = technicalIndicators.sma(closes, 200);

  const currentEMA9 = ema9[ema9.length - 1];
  const currentSMA20 = sma20[sma20.length - 1];
  const currentSMA50 = sma50[sma50.length - 1];
  const currentSMA200 = sma200[sma200.length - 1];
  const currentPrice = closes[closes.length - 1];

  let direction = "NEUTRAL";
  let confidence = 50;
  const signals = [];

  // Check for golden cross (SMA50 crosses above SMA200)
  if (
    sma50[sma50.length - 1] > sma200[sma200.length - 1] &&
    sma50[sma50.length - 2] <= sma200[sma200.length - 2]
  ) {
    signals.push({
      name: "Golden Cross",
      direction: "BUY",
      strength: 80,
    });
  }

  // Check for death cross (SMA50 crosses below SMA200)
  if (
    sma50[sma50.length - 1] < sma200[sma200.length - 1] &&
    sma50[sma50.length - 2] >= sma200[sma200.length - 2]
  ) {
    signals.push({
      name: "Death Cross",
      direction: "SELL",
      strength: 80,
    });
  }

  // Price above/below key MAs
  if (
    currentPrice > currentSMA200 &&
    currentPrice > currentSMA50 &&
    currentPrice > currentSMA20 &&
    currentPrice > currentEMA9
  ) {
    signals.push({
      name: "Price Above All MAs",
      direction: "BUY",
      strength: 70,
    });
  } else if (
    currentPrice < currentSMA200 &&
    currentPrice < currentSMA50 &&
    currentPrice < currentSMA20 &&
    currentPrice < currentEMA9
  ) {
    signals.push({
      name: "Price Below All MAs",
      direction: "SELL",
      strength: 70,
    });
  }

  // EMA9 crosses above/below SMA20
  if (
    ema9[ema9.length - 1] > sma20[sma20.length - 1] &&
    ema9[ema9.length - 2] <= sma20[sma20.length - 2]
  ) {
    signals.push({
      name: "EMA9 Crosses Above SMA20",
      direction: "BUY",
      strength: 60,
    });
  } else if (
    ema9[ema9.length - 1] < sma20[sma20.length - 1] &&
    ema9[ema9.length - 2] >= sma20[sma20.length - 2]
  ) {
    signals.push({
      name: "EMA9 Crosses Below SMA20",
      direction: "SELL",
      strength: 60,
    });
  }

  // Calculate direction and confidence based on signals
  if (signals.length > 0) {
    const buySignals = signals.filter((s) => s.direction === "BUY");
    const sellSignals = signals.filter((s) => s.direction === "SELL");

    const buyStrength = buySignals.reduce((sum, s) => sum + s.strength, 0);
    const sellStrength = sellSignals.reduce((sum, s) => sum + s.strength, 0);

    if (buyStrength > sellStrength) {
      direction = "BUY";
      confidence = Math.min(
        90,
        50 + Math.round((buyStrength - sellStrength) / 2)
      );
    } else if (sellStrength > buyStrength) {
      direction = "SELL";
      confidence = Math.min(
        90,
        50 + Math.round((sellStrength - buyStrength) / 2)
      );
    }
  }

  return {
    direction,
    confidence,
    signals,
    values: {
      ema9: currentEMA9,
      sma20: currentSMA20,
      sma50: currentSMA50,
      sma200: currentSMA200,
    },
  };
}

/**
 * Analyze RSI (Relative Strength Index)
 * @param {Array} closes - Array of closing prices
 * @returns {Object} Analysis result
 */
function analyzeRSI(closes) {
  const rsiPeriod = 14;
  const rsiValues = technicalIndicators.rsi(closes, rsiPeriod);
  const currentRSI = rsiValues[rsiValues.length - 1];

  let direction = "NEUTRAL";
  let confidence = 50;
  const signals = [];

  // Oversold condition (RSI < 30)
  if (currentRSI < 30) {
    signals.push({
      name: "RSI Oversold",
      direction: "BUY",
      strength: 70 + (30 - currentRSI) * 2, // Higher strength for lower RSI
    });
  }

  // Overbought condition (RSI > 70)
  if (currentRSI > 70) {
    signals.push({
      name: "RSI Overbought",
      direction: "SELL",
      strength: 70 + (currentRSI - 70) * 2, // Higher strength for higher RSI
    });
  }

  // RSI crossing above 30 (bullish)
  if (currentRSI > 30 && rsiValues[rsiValues.length - 2] <= 30) {
    signals.push({
      name: "RSI Crosses Above 30",
      direction: "BUY",
      strength: 65,
    });
  }

  // RSI crossing below 70 (bearish)
  if (currentRSI < 70 && rsiValues[rsiValues.length - 2] >= 70) {
    signals.push({
      name: "RSI Crosses Below 70",
      direction: "SELL",
      strength: 65,
    });
  }

  // RSI divergence (basic implementation)
  const priceDirection =
    closes[closes.length - 1] > closes[closes.length - 5] ? "up" : "down";
  const rsiDirection =
    rsiValues[rsiValues.length - 1] > rsiValues[rsiValues.length - 5]
      ? "up"
      : "down";

  if (priceDirection === "up" && rsiDirection === "down") {
    signals.push({
      name: "Bearish RSI Divergence",
      direction: "SELL",
      strength: 75,
    });
  } else if (priceDirection === "down" && rsiDirection === "up") {
    signals.push({
      name: "Bullish RSI Divergence",
      direction: "BUY",
      strength: 75,
    });
  }

  // Calculate direction and confidence based on signals
  if (signals.length > 0) {
    const buySignals = signals.filter((s) => s.direction === "BUY");
    const sellSignals = signals.filter((s) => s.direction === "SELL");

    const buyStrength = buySignals.reduce((sum, s) => sum + s.strength, 0);
    const sellStrength = sellSignals.reduce((sum, s) => sum + s.strength, 0);

    if (buyStrength > sellStrength) {
      direction = "BUY";
      confidence = Math.min(
        90,
        50 + Math.round((buyStrength - sellStrength) / 2)
      );
    } else if (sellStrength > buyStrength) {
      direction = "SELL";
      confidence = Math.min(
        90,
        50 + Math.round((sellStrength - buyStrength) / 2)
      );
    }
  }

  return {
    direction,
    confidence,
    signals,
    values: {
      current: currentRSI,
    },
  };
}

/**
 * Analyze MACD (Moving Average Convergence Divergence)
 * @param {Array} closes - Array of closing prices
 * @returns {Object} Analysis result
 */
function analyzeMACD(closes) {
  const macdValues = technicalIndicators.macd(closes, 12, 26, 9);
  const macdLine = macdValues.macd;
  const signalLine = macdValues.signal;
  const histogram = macdValues.histogram;

  const currentMACD = macdLine[macdLine.length - 1];
  const currentSignal = signalLine[signalLine.length - 1];
  const currentHistogram = histogram[histogram.length - 1];
  const prevHistogram = histogram[histogram.length - 2];

  let direction = "NEUTRAL";
  let confidence = 50;
  const signals = [];

  // MACD crosses above signal line (bullish)
  if (
    currentMACD > currentSignal &&
    macdLine[macdLine.length - 2] <= signalLine[signalLine.length - 2]
  ) {
    signals.push({
      name: "MACD Bullish Crossover",
      direction: "BUY",
      strength: 70,
    });
  }

  // MACD crosses below signal line (bearish)
  if (
    currentMACD < currentSignal &&
    macdLine[macdLine.length - 2] >= signalLine[signalLine.length - 2]
  ) {
    signals.push({
      name: "MACD Bearish Crossover",
      direction: "SELL",
      strength: 70,
    });
  }

  // MACD histogram increasing (momentum building)
  if (currentHistogram > prevHistogram && currentHistogram > 0) {
    signals.push({
      name: "MACD Bullish Momentum",
      direction: "BUY",
      strength: 60,
    });
  } else if (currentHistogram < prevHistogram && currentHistogram < 0) {
    signals.push({
      name: "MACD Bearish Momentum",
      direction: "SELL",
      strength: 60,
    });
  }

  // MACD zero line crossover
  if (currentMACD > 0 && macdLine[macdLine.length - 2] <= 0) {
    signals.push({
      name: "MACD Crosses Above Zero",
      direction: "BUY",
      strength: 65,
    });
  } else if (currentMACD < 0 && macdLine[macdLine.length - 2] >= 0) {
    signals.push({
      name: "MACD Crosses Below Zero",
      direction: "SELL",
      strength: 65,
    });
  }

  // Calculate direction and confidence based on signals
  if (signals.length > 0) {
    const buySignals = signals.filter((s) => s.direction === "BUY");
    const sellSignals = signals.filter((s) => s.direction === "SELL");

    const buyStrength = buySignals.reduce((sum, s) => sum + s.strength, 0);
    const sellStrength = sellSignals.reduce((sum, s) => sum + s.strength, 0);

    if (buyStrength > sellStrength) {
      direction = "BUY";
      confidence = Math.min(
        90,
        50 + Math.round((buyStrength - sellStrength) / 2)
      );
    } else if (sellStrength > buyStrength) {
      direction = "SELL";
      confidence = Math.min(
        90,
        50 + Math.round((sellStrength - buyStrength) / 2)
      );
    }
  }

  return {
    direction,
    confidence,
    signals,
    values: {
      macd: currentMACD,
      signal: currentSignal,
      histogram: currentHistogram,
    },
  };
}

/**
 * Analyze Bollinger Bands
 * @param {Array} closes - Array of closing prices
 * @returns {Object} Analysis result
 */
function analyzeBollingerBands(closes) {
  const bbPeriod = 20;
  const bbStdDev = 2;

  const bbValues = technicalIndicators.bollingerBands(
    closes,
    bbPeriod,
    bbStdDev
  );
  const middle = bbValues.middle;
  const upper = bbValues.upper;
  const lower = bbValues.lower;

  const currentPrice = closes[closes.length - 1];
  const currentMiddle = middle[middle.length - 1];
  const currentUpper = upper[upper.length - 1];
  const currentLower = lower[lower.length - 1];

  // Calculate Bollinger Band Width and %B
  const bandWidth = (currentUpper - currentLower) / currentMiddle;
  const percentB =
    (currentPrice - currentLower) / (currentUpper - currentLower);

  let direction = "NEUTRAL";
  let confidence = 50;
  const signals = [];

  // Price below lower band (oversold)
  if (currentPrice <= currentLower) {
    signals.push({
      name: "Price Below Lower Band",
      direction: "BUY",
      strength: 70,
    });
  }

  // Price above upper band (overbought)
  if (currentPrice >= currentUpper) {
    signals.push({
      name: "Price Above Upper Band",
      direction: "SELL",
      strength: 70,
    });
  }

  // Price crossing back above lower band (bullish)
  if (
    currentPrice > currentLower &&
    closes[closes.length - 2] <= lower[lower.length - 2]
  ) {
    signals.push({
      name: "Price Crosses Above Lower Band",
      direction: "BUY",
      strength: 65,
    });
  }

  // Price crossing back below upper band (bearish)
  if (
    currentPrice < currentUpper &&
    closes[closes.length - 2] >= upper[upper.length - 2]
  ) {
    signals.push({
      name: "Price Crosses Below Upper Band",
      direction: "SELL",
      strength: 65,
    });
  }

  // Bollinger Band Squeeze (low volatility, potential breakout)
  const previousBandWidth =
    (upper[upper.length - 5] - lower[lower.length - 5]) /
    middle[middle.length - 5];
  if (bandWidth < previousBandWidth * 0.8) {
    signals.push({
      name: "Bollinger Band Squeeze",
      direction: "NEUTRAL",
      strength: 60,
    });
  }

  // Calculate direction and confidence based on signals
  if (signals.length > 0) {
    const buySignals = signals.filter((s) => s.direction === "BUY");
    const sellSignals = signals.filter((s) => s.direction === "SELL");

    const buyStrength = buySignals.reduce((sum, s) => sum + s.strength, 0);
    const sellStrength = sellSignals.reduce((sum, s) => sum + s.strength, 0);

    if (buyStrength > sellStrength) {
      direction = "BUY";
      confidence = Math.min(
        90,
        50 + Math.round((buyStrength - sellStrength) / 2)
      );
    } else if (sellStrength > buyStrength) {
      direction = "SELL";
      confidence = Math.min(
        90,
        50 + Math.round((sellStrength - buyStrength) / 2)
      );
    }
  }

  return {
    direction,
    confidence,
    signals,
    values: {
      middle: currentMiddle,
      upper: currentUpper,
      lower: currentLower,
      bandwidth: bandWidth,
      percentB: percentB,
    },
  };
}

/**
 * Analyze Support and Resistance levels
 * @param {Array} highs - Array of high prices
 * @param {Array} lows - Array of low prices
 * @param {Array} closes - Array of close prices
 * @returns {Object} Analysis result
 */
function analyzeSupportResistance(highs, lows, closes) {
  const currentPrice = closes[closes.length - 1];

  // Find potential support and resistance levels
  const supportLevels = findSupportLevels(lows, closes, 5);
  const resistanceLevels = findResistanceLevels(highs, closes, 5);

  // Sort levels by distance from current price
  supportLevels.sort((a, b) => b.price - a.price); // Descending
  resistanceLevels.sort((a, b) => a.price - b.price); // Ascending

  // Get closest levels
  const closestSupport = supportLevels.find(
    (level) => level.price < currentPrice
  ) || { price: 0, strength: 0 };
  const closestResistance = resistanceLevels.find(
    (level) => level.price > currentPrice
  ) || { price: Infinity, strength: 0 };

  // Calculate price distance to nearest levels
  const distanceToSupport =
    Math.abs(currentPrice - closestSupport.price) / currentPrice;
  const distanceToResistance =
    Math.abs(closestResistance.price - currentPrice) / currentPrice;

  let direction = "NEUTRAL";
  let confidence = 50;
  const signals = [];

  // Near support level (potential bounce)
  if (distanceToSupport < 0.01 && closestSupport.strength >= 3) {
    signals.push({
      name: "Near Strong Support",
      direction: "BUY",
      strength: 60 + closestSupport.strength * 3,
    });
  }

  // Near resistance level (potential rejection)
  if (distanceToResistance < 0.01 && closestResistance.strength >= 3) {
    signals.push({
      name: "Near Strong Resistance",
      direction: "SELL",
      strength: 60 + closestResistance.strength * 3,
    });
  }

  // Breakout above resistance
  if (
    currentPrice > closestResistance.price &&
    closes[closes.length - 2] <= closestResistance.price
  ) {
    signals.push({
      name: "Breakout Above Resistance",
      direction: "BUY",
      strength: 75 + closestResistance.strength * 3,
    });
  }

  // Breakdown below support
  if (
    currentPrice < closestSupport.price &&
    closes[closes.length - 2] >= closestSupport.price
  ) {
    signals.push({
      name: "Breakdown Below Support",
      direction: "SELL",
      strength: 75 + closestSupport.strength * 3,
    });
  }

  // Calculate direction and confidence based on signals
  if (signals.length > 0) {
    const buySignals = signals.filter((s) => s.direction === "BUY");
    const sellSignals = signals.filter((s) => s.direction === "SELL");

    const buyStrength = buySignals.reduce((sum, s) => sum + s.strength, 0);
    const sellStrength = sellSignals.reduce((sum, s) => sum + s.strength, 0);

    if (buyStrength > sellStrength) {
      direction = "BUY";
      confidence = Math.min(
        90,
        50 + Math.round((buyStrength - sellStrength) / 2)
      );
    } else if (sellStrength > buyStrength) {
      direction = "SELL";
      confidence = Math.min(
        90,
        50 + Math.round((sellStrength - buyStrength) / 2)
      );
    }
  }

  return {
    direction,
    confidence,
    signals,
    values: {
      supports: supportLevels.slice(0, 3).map((s) => s.price),
      resistances: resistanceLevels.slice(0, 3).map((r) => r.price),
    },
  };
}

// Helper function to find support levels
function findSupportLevels(lows, closes, lookback) {
  const levels = [];
  const sensitivity = 0.005; // 0.5% tolerance

  for (let i = lookback; i < lows.length - lookback; i++) {
    const current = lows[i];
    let isSupport = true;

    // Check if current point is a local minimum
    for (let j = i - lookback; j < i; j++) {
      if (lows[j] < current * (1 - sensitivity)) {
        isSupport = false;
        break;
      }
    }

    for (let j = i + 1; j <= i + lookback; j++) {
      if (lows[j] < current * (1 - sensitivity)) {
        isSupport = false;
        break;
      }
    }

    if (isSupport) {
      // Check if this level already exists
      const existingLevel = levels.find(
        (level) => Math.abs(level.price - current) / current < sensitivity
      );

      if (existingLevel) {
        existingLevel.strength++;
      } else {
        levels.push({
          price: current,
          strength: 1,
        });
      }
    }
  }

  return levels;
}

// Helper function to find resistance levels
function findResistanceLevels(highs, closes, lookback) {
  const levels = [];
  const sensitivity = 0.005; // 0.5% tolerance

  for (let i = lookback; i < highs.length - lookback; i++) {
    const current = highs[i];
    let isResistance = true;

    // Check if current point is a local maximum
    for (let j = i - lookback; j < i; j++) {
      if (highs[j] > current * (1 + sensitivity)) {
        isResistance = false;
        break;
      }
    }

    for (let j = i + 1; j <= i + lookback; j++) {
      if (highs[j] > current * (1 + sensitivity)) {
        isResistance = false;
        break;
      }
    }

    if (isResistance) {
      // Check if this level already exists
      const existingLevel = levels.find(
        (level) => Math.abs(level.price - current) / current < sensitivity
      );

      if (existingLevel) {
        existingLevel.strength++;
      } else {
        levels.push({
          price: current,
          strength: 1,
        });
      }
    }
  }

  return levels;
}

/**
 * Analyze Volume characteristics
 * @param {Array} closes - Array of closing prices
 * @param {Array} volumes - Array of volume data
 * @returns {Object} Analysis result
 */
function analyzeVolume(closes, volumes) {
  const volumeSMA = technicalIndicators.sma(volumes, 20);
  const currentVolume = volumes[volumes.length - 1];
  const averageVolume = volumeSMA[volumeSMA.length - 1];

  // Calculate volume ratio
  const volumeRatio = currentVolume / averageVolume;

  // Price change
  const priceChange = closes[closes.length - 1] - closes[closes.length - 2];
  const priceDirection =
    priceChange > 0 ? "up" : priceChange < 0 ? "down" : "flat";

  let direction = "NEUTRAL";
  let confidence = 50;
  const signals = [];

  // High volume on price increase (bullish)
  if (priceDirection === "up" && volumeRatio > 1.5) {
    signals.push({
      name: "High Volume Price Increase",
      direction: "BUY",
      strength: 60 + Math.min(20, Math.round((volumeRatio - 1.5) * 10)),
    });
  }

  // High volume on price decrease (bearish)
  if (priceDirection === "down" && volumeRatio > 1.5) {
    signals.push({
      name: "High Volume Price Decrease",
      direction: "SELL",
      strength: 60 + Math.min(20, Math.round((volumeRatio - 1.5) * 10)),
    });
  }

  // Low volume on price movement (weak trend)
  if (volumeRatio < 0.7 && priceDirection !== "flat") {
    signals.push({
      name: "Low Volume Price Movement",
      direction: priceDirection === "up" ? "SELL" : "BUY",
      strength: 55,
    });
  }

  // Volume climax (potential reversal)
  const isVolumePeak =
    currentVolume > volumes[volumes.length - 2] * 2 &&
    currentVolume > volumes[volumes.length - 3] * 2;

  if (isVolumePeak) {
    signals.push({
      name: "Volume Climax",
      direction: priceDirection === "up" ? "SELL" : "BUY",
      strength: 70,
    });
  }

  // Calculate direction and confidence based on signals
  if (signals.length > 0) {
    const buySignals = signals.filter((s) => s.direction === "BUY");
    const sellSignals = signals.filter((s) => s.direction === "SELL");

    const buyStrength = buySignals.reduce((sum, s) => sum + s.strength, 0);
    const sellStrength = sellSignals.reduce((sum, s) => sum + s.strength, 0);

    if (buyStrength > sellStrength) {
      direction = "BUY";
      confidence = Math.min(
        85,
        50 + Math.round((buyStrength - sellStrength) / 2)
      );
    } else if (sellStrength > buyStrength) {
      direction = "SELL";
      confidence = Math.min(
        85,
        50 + Math.round((sellStrength - buyStrength) / 2)
      );
    }
  }

  return {
    direction,
    confidence,
    signals,
    values: {
      currentVolume,
      averageVolume,
      volumeRatio,
    },
  };
}

/**
 * Analyze Candlestick Patterns
 * @param {Array} barData - Array of price bar data
 * @returns {Object} Analysis result
 */
function analyzeCandlestickPatterns(barData) {
  const patterns = [];
  const recentBars = barData.slice(-5);

  // Check for basic candlestick patterns

  // Doji (indecision)
  const lastBar = recentBars[recentBars.length - 1];
  const bodySize = Math.abs(lastBar.open - lastBar.close);
  const totalSize = lastBar.high - lastBar.low;

  if (bodySize / totalSize < 0.1 && totalSize > 0) {
    patterns.push({
      name: "Doji",
      direction: "NEUTRAL",
      strength: 50,
    });
  }

  // Hammer (bullish)
  if (
    bodySize > 0 &&
    Math.min(lastBar.open, lastBar.close) - lastBar.low > bodySize * 2 &&
    lastBar.high - Math.max(lastBar.open, lastBar.close) < bodySize * 0.5
  ) {
    patterns.push({
      name: "Hammer",
      direction: "BUY",
      strength: 65,
    });
  }

  // Shooting Star (bearish)
  if (
    bodySize > 0 &&
    lastBar.high - Math.max(lastBar.open, lastBar.close) > bodySize * 2 &&
    Math.min(lastBar.open, lastBar.close) - lastBar.low < bodySize * 0.5
  ) {
    patterns.push({
      name: "Shooting Star",
      direction: "SELL",
      strength: 65,
    });
  }

  // Engulfing patterns (need at least 2 bars)
  if (recentBars.length >= 2) {
    const previousBar = recentBars[recentBars.length - 2];

    // Bullish Engulfing
    if (
      previousBar.close < previousBar.open && // Previous bar is bearish
      lastBar.close > lastBar.open && // Current bar is bullish
      lastBar.open < previousBar.close && // Current open below previous close
      lastBar.close > previousBar.open
    ) {
      // Current close above previous open
      patterns.push({
        name: "Bullish Engulfing",
        direction: "BUY",
        strength: 70,
      });
    }

    // Bearish Engulfing
    if (
      previousBar.close > previousBar.open && // Previous bar is bullish
      lastBar.close < lastBar.open && // Current bar is bearish
      lastBar.open > previousBar.close && // Current open above previous close
      lastBar.close < previousBar.open
    ) {
      // Current close below previous open
      patterns.push({
        name: "Bearish Engulfing",
        direction: "SELL",
        strength: 70,
      });
    }
  }

  // Morning Star (bullish) - needs 3 bars
  if (recentBars.length >= 3) {
    const firstBar = recentBars[recentBars.length - 3];
    const middleBar = recentBars[recentBars.length - 2];

    if (
      firstBar.close < firstBar.open && // First bar is bearish
      Math.abs(middleBar.open - middleBar.close) <
        Math.abs(firstBar.open - firstBar.close) * 0.3 && // Middle bar is small
      lastBar.close > lastBar.open && // Last bar is bullish
      lastBar.close > (firstBar.open + firstBar.close) / 2
    ) {
      // Last bar closes above midpoint of first bar
      patterns.push({
        name: "Morning Star",
        direction: "BUY",
        strength: 75,
      });
    }
  }

  // Evening Star (bearish) - needs 3 bars
  if (recentBars.length >= 3) {
    const firstBar = recentBars[recentBars.length - 3];
    const middleBar = recentBars[recentBars.length - 2];

    if (
      firstBar.close > firstBar.open && // First bar is bullish
      Math.abs(middleBar.open - middleBar.close) <
        Math.abs(firstBar.open - firstBar.close) * 0.3 && // Middle bar is small
      lastBar.close < lastBar.open && // Last bar is bearish
      lastBar.close < (firstBar.open + firstBar.close) / 2
    ) {
      // Last bar closes below midpoint of first bar
      patterns.push({
        name: "Evening Star",
        direction: "SELL",
        strength: 75,
      });
    }
  }

  // Calculate direction and confidence
  let direction = "NEUTRAL";
  let confidence = 50;

  if (patterns.length > 0) {
    const buyPatterns = patterns.filter((p) => p.direction === "BUY");
    const sellPatterns = patterns.filter((p) => p.direction === "SELL");

    const buyStrength = buyPatterns.reduce((sum, p) => sum + p.strength, 0);
    const sellStrength = sellPatterns.reduce((sum, p) => sum + p.strength, 0);

    if (buyStrength > sellStrength) {
      direction = "BUY";
      confidence = Math.min(
        85,
        50 + Math.round((buyStrength - sellStrength) / 2)
      );
    } else if (sellStrength > buyStrength) {
      direction = "SELL";
      confidence = Math.min(
        85,
        50 + Math.round((sellStrength - buyStrength) / 2)
      );
    }
  }

  return {
    direction,
    confidence,
    patterns,
  };
}

/**
 * Analyze Fibonacci Retracement levels
 * @param {Array} highs - Array of high prices
 * @param {Array} lows - Array of low prices
 * @param {Array} closes - Array of closing prices
 * @returns {Object} Analysis result
 */
function analyzeFibonacciLevels(highs, lows, closes) {
  const currentPrice = closes[closes.length - 1];

  // Find recent significant high and low
  const recentHighs = highs.slice(-30);
  const recentLows = lows.slice(-30);

  const highestPoint = Math.max(...recentHighs);
  const lowestPoint = Math.min(...recentLows);

  // Calculate if we're in an uptrend or downtrend
  const isUptrend = closes[closes.length - 1] > closes[closes.length - 15];

  // Calculate Fibonacci levels
  const fibLevels = calculateFibonacciRetracementLevels(
    highestPoint,
    lowestPoint,
    isUptrend
  );

  // Identify level that price is near
  let nearestLevel = null;
  let nearestDistance = Infinity;

  for (const level of fibLevels) {
    const distance = Math.abs(currentPrice - level.price) / currentPrice;
    if (distance < nearestDistance && distance < 0.01) {
      // Within 1%
      nearestDistance = distance;
      nearestLevel = level;
    }
  }

  let direction = "NEUTRAL";
  let confidence = 50;
  const signals = [];

  if (nearestLevel) {
    // Price at key Fibonacci level
    if (isUptrend) {
      if (nearestLevel.name === "0.618" || nearestLevel.name === "0.5") {
        signals.push({
          name: `Price at ${nearestLevel.name} Retracement in Uptrend`,
          direction: "BUY",
          strength: 65,
        });
      }
    } else {
      if (nearestLevel.name === "0.618" || nearestLevel.name === "0.5") {
        signals.push({
          name: `Price at ${nearestLevel.name} Retracement in Downtrend`,
          direction: "SELL",
          strength: 65,
        });
      }
    }

    // Bouncing off Fibonacci level
    const previousClose = closes[closes.length - 2];
    if (
      isUptrend &&
      previousClose < nearestLevel.price &&
      currentPrice > nearestLevel.price
    ) {
      signals.push({
        name: `Bounce Up from ${nearestLevel.name} Level`,
        direction: "BUY",
        strength: 70,
      });
    } else if (
      !isUptrend &&
      previousClose > nearestLevel.price &&
      currentPrice < nearestLevel.price
    ) {
      signals.push({
        name: `Bounce Down from ${nearestLevel.name} Level`,
        direction: "SELL",
        strength: 70,
      });
    }
  }

  // Breaking through 0.236 level (trend continuation)
  const weakRetracement = fibLevels.find((level) => level.name === "0.236");
  if (weakRetracement) {
    if (
      isUptrend &&
      currentPrice > weakRetracement.price &&
      closes[closes.length - 2] <= weakRetracement.price
    ) {
      signals.push({
        name: "Breaking through 0.236 in Uptrend",
        direction: "BUY",
        strength: 60,
      });
    } else if (
      !isUptrend &&
      currentPrice < weakRetracement.price &&
      closes[closes.length - 2] >= weakRetracement.price
    ) {
      signals.push({
        name: "Breaking through 0.236 in Downtrend",
        direction: "SELL",
        strength: 60,
      });
    }
  }

  // Calculate direction and confidence based on signals
  if (signals.length > 0) {
    const buySignals = signals.filter((s) => s.direction === "BUY");
    const sellSignals = signals.filter((s) => s.direction === "SELL");

    const buyStrength = buySignals.reduce((sum, s) => sum + s.strength, 0);
    const sellStrength = sellSignals.reduce((sum, s) => sum + s.strength, 0);

    if (buyStrength > sellStrength) {
      direction = "BUY";
      confidence = Math.min(
        85,
        50 + Math.round((buyStrength - sellStrength) / 2)
      );
    } else if (sellStrength > buyStrength) {
      direction = "SELL";
      confidence = Math.min(
        85,
        50 + Math.round((sellStrength - buyStrength) / 2)
      );
    }
  }

  return {
    direction,
    confidence,
    signals,
    levels: fibLevels,
    nearestLevel: nearestLevel ? nearestLevel.name : null,
  };
}

// Helper function to calculate Fibonacci retracement levels
function calculateFibonacciRetracementLevels(
  highestPoint,
  lowestPoint,
  isUptrend
) {
  const range = highestPoint - lowestPoint;

  const levels = [
    { name: "0", price: isUptrend ? highestPoint : lowestPoint },
    {
      name: "0.236",
      price: isUptrend
        ? highestPoint - range * 0.236
        : lowestPoint + range * 0.236,
    },
    {
      name: "0.382",
      price: isUptrend
        ? highestPoint - range * 0.382
        : lowestPoint + range * 0.382,
    },
    {
      name: "0.5",
      price: isUptrend ? highestPoint - range * 0.5 : lowestPoint + range * 0.5,
    },
    {
      name: "0.618",
      price: isUptrend
        ? highestPoint - range * 0.618
        : lowestPoint + range * 0.618,
    },
    {
      name: "0.786",
      price: isUptrend
        ? highestPoint - range * 0.786
        : lowestPoint + range * 0.786,
    },
    { name: "1", price: isUptrend ? lowestPoint : highestPoint },
  ];

  return levels;
}

/**
 * Analyze Average Directional Index (ADX) for trend strength
 * @param {Array} highs - Array of high prices
 * @param {Array} lows - Array of low prices
 * @param {Array} closes - Array of closing prices
 * @returns {Object} Analysis result
 */
function analyzeADX(highs, lows, closes) {
  const adxPeriod = 14;
  const adxValues = technicalIndicators.adx(highs, lows, closes, adxPeriod);

  const currentADX = adxValues.adx[adxValues.adx.length - 1];
  const currentPlusDI = adxValues.plusDI[adxValues.plusDI.length - 1];
  const currentMinusDI = adxValues.minusDI[adxValues.minusDI.length - 1];

  let direction = "NEUTRAL";
  let confidence = 50;
  const signals = [];

  // Strong trend (ADX > 25)
  if (currentADX > 25) {
    if (currentPlusDI > currentMinusDI) {
      signals.push({
        name: "Strong Uptrend",
        direction: "BUY",
        strength: 60 + Math.min(30, Math.round((currentADX - 25) / 2)),
      });
    } else {
      signals.push({
        name: "Strong Downtrend",
        direction: "SELL",
        strength: 60 + Math.min(30, Math.round((currentADX - 25) / 2)),
      });
    }
  }

  // Weak trend (ADX < 20)
  if (currentADX < 20) {
    signals.push({
      name: "Weak Trend",
      direction: "NEUTRAL",
      strength: 50,
    });
  }

  // +DI crosses above -DI (bullish)
  if (
    currentPlusDI > currentMinusDI &&
    adxValues.plusDI[adxValues.plusDI.length - 2] <=
      adxValues.minusDI[adxValues.minusDI.length - 2]
  ) {
    signals.push({
      name: "+DI Crosses Above -DI",
      direction: "BUY",
      strength: 65,
    });
  }

  // -DI crosses above +DI (bearish)
  if (
    currentMinusDI > currentPlusDI &&
    adxValues.minusDI[adxValues.minusDI.length - 2] <=
      adxValues.plusDI[adxValues.plusDI.length - 2]
  ) {
    signals.push({
      name: "-DI Crosses Above +DI",
      direction: "SELL",
      strength: 65,
    });
  }

  // Calculate direction and confidence based on signals
  if (signals.length > 0) {
    const buySignals = signals.filter((s) => s.direction === "BUY");
    const sellSignals = signals.filter((s) => s.direction === "SELL");

    const buyStrength = buySignals.reduce((sum, s) => sum + s.strength, 0);
    const sellStrength = sellSignals.reduce((sum, s) => sum + s.strength, 0);

    if (buyStrength > sellStrength) {
      direction = "BUY";
      confidence = Math.min(
        90,
        50 + Math.round((buyStrength - sellStrength) / 2)
      );
    } else if (sellStrength > buyStrength) {
      direction = "SELL";
      confidence = Math.min(
        90,
        50 + Math.round((sellStrength - buyStrength) / 2)
      );
    }
  }

  return {
    direction,
    confidence,
    signals,
    values: {
      adx: currentADX,
      plusDI: currentPlusDI,
      minusDI: currentMinusDI,
    },
  };
}

/**
 * Analyze Market Sentiment from news and social media
 * @param {string} symbol - The trading symbol
 * @returns {Object} Analysis result
 */
async function analyzeMarketSentiment(symbol) {
  try {
    // Get recent news and sentiment for the symbol
    const newsItems = await getMarketNews(symbol, 5);

    if (!newsItems || newsItems.length === 0) {
      return {
        direction: "NEUTRAL",
        confidence: 50,
        signals: [],
        sentiment: "neutral",
      };
    }

    // Calculate overall sentiment
    let sentimentScore = 0;
    const sentimentSignals = [];

    for (const news of newsItems) {
      sentimentScore += news.sentiment;

      if (news.sentiment > 0.3) {
        sentimentSignals.push({
          source: news.source,
          headline: news.headline,
          sentiment: "positive",
        });
      } else if (news.sentiment < -0.3) {
        sentimentSignals.push({
          source: news.source,
          headline: news.headline,
          sentiment: "negative",
        });
      }
    }

    // Average sentiment
    const avgSentiment = sentimentScore / newsItems.length;

    let direction = "NEUTRAL";
    let confidence = 50;
    const signals = [];

    // Determine direction based on sentiment
    if (avgSentiment > 0.2) {
      direction = "BUY";
      confidence = 50 + Math.min(30, Math.round(avgSentiment * 100));

      signals.push({
        name: "Positive Market Sentiment",
        direction: "BUY",
        strength: confidence,
      });
    } else if (avgSentiment < -0.2) {
      direction = "SELL";
      confidence = 50 + Math.min(30, Math.round(Math.abs(avgSentiment) * 100));

      signals.push({
        name: "Negative Market Sentiment",
        direction: "SELL",
        strength: confidence,
      });
    }

    return {
      direction,
      confidence,
      signals,
      sentiment: avgSentiment,
      recentNews: sentimentSignals,
    };
  } catch (error) {
    console.error("Error analyzing market sentiment:", error);

    // Return neutral on error
    return {
      direction: "NEUTRAL",
      confidence: 50,
      signals: [],
      sentiment: "neutral",
    };
  }
}

/**
 * Calculate the final trading direction and confidence level
 * @param {Array} analyses - Array of analysis results
 * @returns {Object} Final direction and confidence
 */
function calculateFinalResult(analyses) {
  let totalBuyWeight = 0;
  let totalSellWeight = 0;
  let totalWeight = 0;
  const dangerSignals = [];

  for (const analysis of analyses) {
    const { result, weight } = analysis;
    totalWeight += weight;

    if (result.direction === "BUY") {
      totalBuyWeight += weight * (result.confidence / 100);
    } else if (result.direction === "SELL") {
      totalSellWeight += weight * (result.confidence / 100);
    }

    // Collect any significant danger signals
    if (
      analysis.name === "Bollinger Bands" &&
      result.signals.some(
        (s) => s.name === "Price Above Upper Band" && s.strength >= 70
      )
    ) {
      dangerSignals.push({
        name: "Extreme Overbought on Bollinger Bands",
        importance: 8,
      });
    }

    if (
      analysis.name === "Bollinger Bands" &&
      result.signals.some(
        (s) => s.name === "Price Below Lower Band" && s.strength >= 70
      )
    ) {
      dangerSignals.push({
        name: "Extreme Oversold on Bollinger Bands",
        importance: 8,
      });
    }

    if (
      analysis.name === "RSI" &&
      result.signals.some(
        (s) => s.name === "RSI Overbought" && s.strength >= 75
      )
    ) {
      dangerSignals.push({
        name: "Extreme Overbought on RSI",
        importance: 7,
      });
    }

    if (
      analysis.name === "RSI" &&
      result.signals.some((s) => s.name === "RSI Oversold" && s.strength >= 75)
    ) {
      dangerSignals.push({
        name: "Extreme Oversold on RSI",
        importance: 7,
      });
    }

    if (
      analysis.name === "Volume" &&
      result.signals.some((s) => s.name === "Volume Climax" && s.strength >= 70)
    ) {
      dangerSignals.push({
        name: "Volume Climax Detected",
        importance: 9,
      });
    }
  }

  // Normalize weights
  const buyScore = totalBuyWeight / totalWeight;
  const sellScore = totalSellWeight / totalWeight;

  let direction, confidence;

  // Require a stronger signal difference to make a decision
  // Added a 0.1 (10%) threshold to avoid conflicting signals
  if (buyScore > sellScore + 0.1) {
    direction = "BUY";
    confidence = Math.round(buyScore * 100);
  } else if (sellScore > buyScore + 0.1) {
    direction = "SELL";
    confidence = Math.round(sellScore * 100);
  } else {
    // If signals are too close, return NEUTRAL
    direction = "NEUTRAL";
    confidence = 50;
  }

  // Adjust confidence to be between 50-100
  confidence = Math.min(100, Math.max(50, confidence));

  return {
    direction,
    confidence,
    dangerSignals,
  };
}

/**
 * Calculate Fibonacci levels for support and resistance
 * Used in trading bot for setting stop loss and take profit levels
 * @param {Array} prices - Array of prices
 * @param {boolean} isUptrend - Whether we're in an uptrend
 * @returns {Object} Support and resistance levels
 */
export function calculateFibonacciLevels(prices, isUptrend) {
  const highestPoint = Math.max(...prices);
  const lowestPoint = Math.min(...prices);
  const range = highestPoint - lowestPoint;

  return {
    resistance: isUptrend
      ? highestPoint + range * 0.272
      : lowestPoint + range * 0.618,
    support: isUptrend
      ? highestPoint - range * 0.382
      : lowestPoint - range * 0.272,
  };
}
