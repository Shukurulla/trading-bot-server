// src/services/technicalIndicators.js
import * as math from "mathjs";

/**
 * Technical indicators service
 * Implements various technical analysis indicators
 */
export const technicalIndicators = {
  /**
   * Calculate Simple Moving Average (SMA)
   * @param {Array} data - Price data
   * @param {number} period - Period for calculation
   * @returns {Array} SMA values
   */
  sma(data, period) {
    const result = [];

    // Need at least 'period' data points
    if (data.length < period) {
      return result;
    }

    // Calculate initial SMA (first 'period' points)
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i];
    }

    result.push(sum / period);

    // Calculate subsequent SMAs
    for (let i = period; i < data.length; i++) {
      sum = sum - data[i - period] + data[i];
      result.push(sum / period);
    }

    return result;
  },

  /**
   * Calculate Exponential Moving Average (EMA)
   * @param {Array} data - Price data
   * @param {number} period - Period for calculation
   * @returns {Array} EMA values
   */
  ema(data, period) {
    const result = [];

    // Need at least 'period' data points
    if (data.length < period) {
      return result;
    }

    // Calculate multiplier
    const multiplier = 2 / (period + 1);

    // Calculate initial EMA (using SMA for first value)
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i];
    }

    let ema = sum / period;
    result.push(ema);

    // Calculate subsequent EMAs
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
      result.push(ema);
    }

    return result;
  },

  /**
   * Calculate Relative Strength Index (RSI)
   * @param {Array} data - Price data
   * @param {number} period - Period for calculation
   * @returns {Array} RSI values
   */
  rsi(data, period) {
    const result = [];
    const gains = [];
    const losses = [];

    // Need at least 'period' + 1 data points
    if (data.length < period + 1) {
      return result;
    }

    // Calculate price changes
    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate initial average gain and average loss
    let avgGain = 0;
    let avgLoss = 0;

    for (let i = 0; i < period; i++) {
      avgGain += gains[i];
      avgLoss += losses[i];
    }

    avgGain /= period;
    avgLoss /= period;

    // Calculate first RSI value
    let rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // Avoid division by zero
    let rsi = 100 - 100 / (1 + rs);
    result.push(rsi);

    // Calculate subsequent RSI values
    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

      rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss);
      rsi = 100 - 100 / (1 + rs);
      result.push(rsi);
    }

    return result;
  },

  /**
   * Calculate Moving Average Convergence Divergence (MACD)
   * @param {Array} data - Price data
   * @param {number} fastPeriod - Fast EMA period
   * @param {number} slowPeriod - Slow EMA period
   * @param {number} signalPeriod - Signal line period
   * @returns {Object} MACD lines and histogram
   */
  macd(data, fastPeriod, slowPeriod, signalPeriod) {
    // Calculate fast and slow EMAs
    const fastEMA = this.ema(data, fastPeriod);
    const slowEMA = this.ema(data, slowPeriod);

    // Need at least 'slowPeriod' data points for both EMAs
    if (fastEMA.length < 1 || slowEMA.length < 1) {
      return {
        macd: [],
        signal: [],
        histogram: [],
      };
    }

    // Calculate MACD line (fast EMA - slow EMA)
    const macdLine = [];
    const slicedFastEMA = fastEMA.slice(slowPeriod - fastPeriod);

    for (let i = 0; i < slowEMA.length; i++) {
      macdLine.push(slicedFastEMA[i] - slowEMA[i]);
    }

    // Calculate signal line (EMA of MACD line)
    const signalLine = this.ema(macdLine, signalPeriod);

    // Calculate histogram (MACD line - signal line)
    const histogram = [];
    const slicedMACDLine = macdLine.slice(macdLine.length - signalLine.length);

    for (let i = 0; i < signalLine.length; i++) {
      histogram.push(slicedMACDLine[i] - signalLine[i]);
    }

    return {
      macd: macdLine,
      signal: signalLine,
      histogram: histogram,
    };
  },

  /**
   * Calculate Bollinger Bands
   * @param {Array} data - Price data
   * @param {number} period - Period for SMA
   * @param {number} stdDev - Number of standard deviations
   * @returns {Object} Upper, middle, and lower bands
   */
  bollingerBands(data, period, stdDev) {
    // Calculate middle band (SMA)
    const middleBand = this.sma(data, period);

    const upperBand = [];
    const lowerBand = [];

    // Calculate standard deviation for each point
    for (let i = period - 1; i < data.length; i++) {
      // Get subset of data for standard deviation calculation
      const subset = data.slice(i - period + 1, i + 1);

      // Calculate standard deviation
      const sum = subset.reduce((acc, val) => acc + val, 0);
      const mean = sum / period;
      const squaredDiffs = subset.map((val) => Math.pow(val - mean, 2));
      const sumSquaredDiffs = squaredDiffs.reduce((acc, val) => acc + val, 0);
      const variance = sumSquaredDiffs / period;
      const std = Math.sqrt(variance);

      const bandIndex = i - period + 1;

      // Calculate upper and lower bands
      upperBand.push(middleBand[bandIndex] + std * stdDev);
      lowerBand.push(middleBand[bandIndex] - std * stdDev);
    }

    return {
      upper: upperBand,
      middle: middleBand,
      lower: lowerBand,
    };
  },

  /**
   * Calculate Average Directional Index (ADX)
   * @param {Array} highs - High prices
   * @param {Array} lows - Low prices
   * @param {Array} closes - Close prices
   * @param {number} period - Period for calculation
   * @returns {Object} ADX, +DI, and -DI values
   */
  adx(highs, lows, closes, period) {
    // Need at least 'period' + 2 data points
    if (
      highs.length < period + 2 ||
      lows.length < period + 2 ||
      closes.length < period + 2
    ) {
      return {
        adx: [],
        plusDI: [],
        minusDI: [],
      };
    }

    const trueRanges = [];
    const plusDMs = [];
    const minusDMs = [];

    // Calculate True Range and Directional Movement
    for (let i = 1; i < highs.length; i++) {
      // True Range
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      const tr = Math.max(tr1, tr2, tr3);
      trueRanges.push(tr);

      // Plus Directional Movement
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];

      let plusDM = 0;
      let minusDM = 0;

      if (upMove > downMove && upMove > 0) {
        plusDM = upMove;
      }

      if (downMove > upMove && downMove > 0) {
        minusDM = downMove;
      }

      plusDMs.push(plusDM);
      minusDMs.push(minusDM);
    }

    // Calculate smoothed values
    const smoothedTR = this.smoothedSum(trueRanges, period);
    const smoothedPlusDM = this.smoothedSum(plusDMs, period);
    const smoothedMinusDM = this.smoothedSum(minusDMs, period);

    // Calculate Plus and Minus Directional Indicators
    const plusDIs = [];
    const minusDIs = [];

    for (let i = 0; i < smoothedTR.length; i++) {
      const plusDI = (smoothedPlusDM[i] / smoothedTR[i]) * 100;
      const minusDI = (smoothedMinusDM[i] / smoothedTR[i]) * 100;

      plusDIs.push(plusDI);
      minusDIs.push(minusDI);
    }

    // Calculate Directional Movement Index (DX)
    const dxs = [];

    for (let i = 0; i < plusDIs.length; i++) {
      const dx =
        (Math.abs(plusDIs[i] - minusDIs[i]) / (plusDIs[i] + minusDIs[i])) * 100;
      dxs.push(dx);
    }

    // Calculate ADX (Average Directional Index)
    const adxValues = this.ema(dxs, period);

    return {
      adx: adxValues,
      plusDI: plusDIs,
      minusDI: minusDIs,
    };
  },

  /**
   * Helper method to calculate smoothed sum for ADX
   * @param {Array} data - Input data
   * @param {number} period - Period for smoothing
   * @returns {Array} Smoothed values
   */
  smoothedSum(data, period) {
    const result = [];

    // Calculate first smoothed value
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i];
    }

    result.push(sum);

    // Calculate subsequent smoothed values
    for (let i = period; i < data.length; i++) {
      sum = sum - sum / period + data[i];
      result.push(sum);
    }

    return result;
  },

  /**
   * Calculate Stochastic Oscillator
   * @param {Array} highs - High prices
   * @param {Array} lows - Low prices
   * @param {Array} closes - Close prices
   * @param {number} kPeriod - %K period
   * @param {number} dPeriod - %D period
   * @returns {Object} %K and %D values
   */
  stochastic(highs, lows, closes, kPeriod, dPeriod) {
    const kValues = [];

    // Calculate %K
    for (let i = kPeriod - 1; i < closes.length; i++) {
      const currentClose = closes[i];

      // Find highest high and lowest low in the period
      let highestHigh = -Infinity;
      let lowestLow = Infinity;

      for (let j = i - kPeriod + 1; j <= i; j++) {
        highestHigh = Math.max(highestHigh, highs[j]);
        lowestLow = Math.min(lowestLow, lows[j]);
      }

      // Calculate %K
      const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
      kValues.push(k);
    }

    // Calculate %D (SMA of %K)
    const dValues = this.sma(kValues, dPeriod);

    return {
      k: kValues,
      d: dValues,
    };
  },

  /**
   * Calculate On-Balance Volume (OBV)
   * @param {Array} closes - Close prices
   * @param {Array} volumes - Volume data
   * @returns {Array} OBV values
   */
  obv(closes, volumes) {
    const result = [0]; // Start with 0

    for (let i = 1; i < closes.length; i++) {
      const currentOBV = result[i - 1];
      const currentClose = closes[i];
      const previousClose = closes[i - 1];
      const currentVolume = volumes[i];

      let newOBV;

      if (currentClose > previousClose) {
        // Price up, add volume
        newOBV = currentOBV + currentVolume;
      } else if (currentClose < previousClose) {
        // Price down, subtract volume
        newOBV = currentOBV - currentVolume;
      } else {
        // Price unchanged, OBV unchanged
        newOBV = currentOBV;
      }

      result.push(newOBV);
    }

    return result;
  },

  /**
   * Calculate Ichimoku Cloud
   * @param {Array} highs - High prices
   * @param {Array} lows - Low prices
   * @param {Array} closes - Close prices
   * @param {number} conversionPeriod - Conversion line period (Tenkan-sen)
   * @param {number} basePeriod - Base line period (Kijun-sen)
   * @param {number} laggingSpanPeriod - Lagging span period (Chikou Span)
   * @param {number} displacement - Displacement period
   * @returns {Object} Ichimoku components
   */
  ichimoku(
    highs,
    lows,
    closes,
    conversionPeriod,
    basePeriod,
    laggingSpanPeriod,
    displacement
  ) {
    const conversionLine = [];
    const baseLine = [];
    const leadingSpanA = [];
    const leadingSpanB = [];
    const laggingSpan = [];

    // Calculate Conversion Line (Tenkan-sen)
    for (let i = conversionPeriod - 1; i < highs.length; i++) {
      const highSlice = highs.slice(i - conversionPeriod + 1, i + 1);
      const lowSlice = lows.slice(i - conversionPeriod + 1, i + 1);

      const highestHigh = Math.max(...highSlice);
      const lowestLow = Math.min(...lowSlice);

      conversionLine.push((highestHigh + lowestLow) / 2);
    }

    // Calculate Base Line (Kijun-sen)
    for (let i = basePeriod - 1; i < highs.length; i++) {
      const highSlice = highs.slice(i - basePeriod + 1, i + 1);
      const lowSlice = lows.slice(i - basePeriod + 1, i + 1);

      const highestHigh = Math.max(...highSlice);
      const lowestLow = Math.min(...lowSlice);

      baseLine.push((highestHigh + lowestLow) / 2);
    }

    // Ensure both arrays are same length (use the shorter one as reference)
    const shorterLength = Math.min(conversionLine.length, baseLine.length);
    const adjustedConversionLine = conversionLine.slice(
      conversionLine.length - shorterLength
    );
    const adjustedBaseLine = baseLine.slice(baseLine.length - shorterLength);

    // Calculate Leading Span A (Senkou Span A)
    for (let i = 0; i < shorterLength; i++) {
      leadingSpanA.push((adjustedConversionLine[i] + adjustedBaseLine[i]) / 2);
    }

    // Calculate Leading Span B (Senkou Span B)
    for (let i = laggingSpanPeriod - 1; i < highs.length; i++) {
      const highSlice = highs.slice(i - laggingSpanPeriod + 1, i + 1);
      const lowSlice = lows.slice(i - laggingSpanPeriod + 1, i + 1);

      const highestHigh = Math.max(...highSlice);
      const lowestLow = Math.min(...lowSlice);

      leadingSpanB.push((highestHigh + lowestLow) / 2);
    }

    // Calculate Lagging Span (Chikou Span)
    for (let i = 0; i < closes.length; i++) {
      if (i - displacement >= 0) {
        laggingSpan.push(closes[i]);
      }
    }

    return {
      conversionLine,
      baseLine,
      leadingSpanA,
      leadingSpanB,
      laggingSpan,
    };
  },

  /**
   * Calculate Fibonacci retracement levels
   * @param {number} highPrice - Highest price in range
   * @param {number} lowPrice - Lowest price in range
   * @returns {Object} Fibonacci retracement levels
   */
  fibonacciRetracement(highPrice, lowPrice) {
    const range = highPrice - lowPrice;

    return {
      level0: highPrice,
      level23_6: highPrice - range * 0.236,
      level38_2: highPrice - range * 0.382,
      level50: highPrice - range * 0.5,
      level61_8: highPrice - range * 0.618,
      level78_6: highPrice - range * 0.786,
      level100: lowPrice,
    };
  },
};
