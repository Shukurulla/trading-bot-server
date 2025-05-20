// src/services/symbolsService.js
import axios from "axios";
import { getAlpacaClient } from "./alpacaService.js";

/**
 * Get available cryptocurrency symbols
 * @returns {Promise<Array>} List of available crypto symbols
 */
export async function getCryptoSymbols() {
  try {
    // Use free CoinGecko API for crypto symbols
    const url =
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1";
    const response = await axios.get(url);

    return response.data.map((coin) => ({
      symbol: coin.symbol.toUpperCase() + "USD",
      name: coin.name,
      image: coin.image,
      currentPrice: coin.current_price,
      marketCap: coin.market_cap,
      priceChange24h: coin.price_change_percentage_24h,
      type: "crypto",
    }));
  } catch (error) {
    console.error("Error fetching crypto symbols:", error);
    return getMockCryptoSymbols();
  }
}

/**
 * Get available forex pairs
 * @returns {Promise<Array>} List of available forex pairs
 */
export async function getForexSymbols() {
  try {
    // Common forex pairs
    const forexPairs = [
      { base: "EUR", quote: "USD", name: "Euro / US Dollar" },
      { base: "USD", quote: "JPY", name: "US Dollar / Japanese Yen" },
      { base: "GBP", quote: "USD", name: "British Pound / US Dollar" },
      { base: "USD", quote: "CHF", name: "US Dollar / Swiss Franc" },
      { base: "AUD", quote: "USD", name: "Australian Dollar / US Dollar" },
      { base: "USD", quote: "CAD", name: "US Dollar / Canadian Dollar" },
      { base: "NZD", quote: "USD", name: "New Zealand Dollar / US Dollar" },
      { base: "EUR", quote: "GBP", name: "Euro / British Pound" },
      { base: "EUR", quote: "JPY", name: "Euro / Japanese Yen" },
      { base: "GBP", quote: "JPY", name: "British Pound / Japanese Yen" },
    ];

    // Get latest exchange rates from ExchangeRate-API
    const apiKey = process.env.EXCHANGE_RATE_API_KEY || "demo";
    const url = `https://api.exchangerate-api.com/v4/latest/USD`;

    const response = await axios.get(url);
    const rates = response.data.rates;

    return forexPairs.map((pair) => {
      // Calculate current rate based on USD rates
      let rate;
      if (pair.base === "USD") {
        rate = rates[pair.quote];
      } else if (pair.quote === "USD") {
        rate = 1 / rates[pair.base];
      } else {
        rate = rates[pair.quote] / rates[pair.base];
      }

      return {
        symbol: pair.base + pair.quote,
        name: pair.name,
        baseSymbol: pair.base,
        quoteSymbol: pair.quote,
        rate: rate,
        type: "forex",
      };
    });
  } catch (error) {
    console.error("Error fetching forex symbols:", error);
    return getMockForexSymbols();
  }
}

/**
 * Get trending stock symbols
 * @returns {Promise<Array>} List of trending stock symbols
 */
export async function getTrendingStocks() {
  try {
    // Use Alpaca to get asset information
    const alpaca = getAlpacaClient();
    const assets = await alpaca.getAssets({
      status: "active",
      asset_class: "us_equity",
    });

    // Filter for tradable and top market cap stocks
    const tradableStocks = assets.filter(
      (asset) =>
        asset.tradable &&
        asset.status === "active" &&
        asset.exchange !== "OTC" &&
        ["NASDAQ", "NYSE"].includes(asset.exchange)
    );

    // Popular stocks (limited to 30)
    const popularStocks = tradableStocks.slice(0, 100);

    return popularStocks.map((stock) => ({
      symbol: stock.symbol,
      name: stock.name,
      exchange: stock.exchange,
      type: "stock",
    }));
  } catch (error) {
    console.error("Error fetching trending stocks:", error);
    return getMockStockSymbols();
  }
}

/**
 * Search for symbols by keyword
 * @param {string} keyword - Search keyword
 * @returns {Promise<Array>} Matching symbols
 */
export async function searchSymbols(keyword) {
  try {
    if (!keyword || keyword.length < 2) {
      return [];
    }

    // Search across all symbol types
    const [cryptos, forex, stocks] = await Promise.all([
      getCryptoSymbols(),
      getForexSymbols(),
      getTrendingStocks(),
    ]);

    const normalizedKeyword = keyword.toUpperCase();

    // Filter symbols that match the keyword
    const matches = [
      ...cryptos.filter(
        (c) =>
          c.symbol.includes(normalizedKeyword) ||
          c.name.toUpperCase().includes(normalizedKeyword)
      ),
      ...forex.filter(
        (f) =>
          f.symbol.includes(normalizedKeyword) ||
          f.name.toUpperCase().includes(normalizedKeyword)
      ),
      ...stocks.filter(
        (s) =>
          s.symbol.includes(normalizedKeyword) ||
          s.name.toUpperCase().includes(normalizedKeyword)
      ),
    ];

    return matches.slice(0, 20); // Limit to 20 results
  } catch (error) {
    console.error("Error searching symbols:", error);
    return [];
  }
}

/**
 * Get mock crypto symbols as fallback
 * @returns {Array} Mock crypto symbols
 */
function getMockCryptoSymbols() {
  return [
    {
      symbol: "BTCUSD",
      name: "Bitcoin",
      currentPrice: 50000,
      marketCap: 1000000000000,
      priceChange24h: 2.5,
      type: "crypto",
    },
    {
      symbol: "ETHUSD",
      name: "Ethereum",
      currentPrice: 3000,
      marketCap: 350000000000,
      priceChange24h: 1.8,
      type: "crypto",
    },
    {
      symbol: "SOLUSD",
      name: "Solana",
      currentPrice: 150,
      marketCap: 50000000000,
      priceChange24h: 3.2,
      type: "crypto",
    },
    {
      symbol: "ADAUSD",
      name: "Cardano",
      currentPrice: 1.2,
      marketCap: 40000000000,
      priceChange24h: -0.9,
      type: "crypto",
    },
    {
      symbol: "DOTUSD",
      name: "Polkadot",
      currentPrice: 25,
      marketCap: 25000000000,
      priceChange24h: 2.1,
      type: "crypto",
    },
    {
      symbol: "DOGEUD",
      name: "Dogecoin",
      currentPrice: 0.25,
      marketCap: 30000000000,
      priceChange24h: 5.7,
      type: "crypto",
    },
    {
      symbol: "XRPUSD",
      name: "XRP",
      currentPrice: 0.9,
      marketCap: 45000000000,
      priceChange24h: 0.5,
      type: "crypto",
    },
    {
      symbol: "LTCUSD",
      name: "Litecoin",
      currentPrice: 180,
      marketCap: 12000000000,
      priceChange24h: 1.2,
      type: "crypto",
    },
    {
      symbol: "BNBUSD",
      name: "Binance Coin",
      currentPrice: 450,
      marketCap: 75000000000,
      priceChange24h: 2.8,
      type: "crypto",
    },
    {
      symbol: "UNIUSD",
      name: "Uniswap",
      currentPrice: 22,
      marketCap: 14000000000,
      priceChange24h: -1.5,
      type: "crypto",
    },
  ];
}

/**
 * Get mock forex symbols as fallback
 * @returns {Array} Mock forex symbols
 */
function getMockForexSymbols() {
  return [
    {
      symbol: "EURUSD",
      name: "Euro / US Dollar",
      baseSymbol: "EUR",
      quoteSymbol: "USD",
      rate: 1.13,
      type: "forex",
    },
    {
      symbol: "USDJPY",
      name: "US Dollar / Japanese Yen",
      baseSymbol: "USD",
      quoteSymbol: "JPY",
      rate: 114.5,
      type: "forex",
    },
    {
      symbol: "GBPUSD",
      name: "British Pound / US Dollar",
      baseSymbol: "GBP",
      quoteSymbol: "USD",
      rate: 1.35,
      type: "forex",
    },
    {
      symbol: "USDCHF",
      name: "US Dollar / Swiss Franc",
      baseSymbol: "USD",
      quoteSymbol: "CHF",
      rate: 0.92,
      type: "forex",
    },
    {
      symbol: "AUDUSD",
      name: "Australian Dollar / US Dollar",
      baseSymbol: "AUD",
      quoteSymbol: "USD",
      rate: 0.72,
      type: "forex",
    },
    {
      symbol: "USDCAD",
      name: "US Dollar / Canadian Dollar",
      baseSymbol: "USD",
      quoteSymbol: "CAD",
      rate: 1.27,
      type: "forex",
    },
    {
      symbol: "NZDUSD",
      name: "New Zealand Dollar / US Dollar",
      baseSymbol: "NZD",
      quoteSymbol: "USD",
      rate: 0.68,
      type: "forex",
    },
    {
      symbol: "EURGBP",
      name: "Euro / British Pound",
      baseSymbol: "EUR",
      quoteSymbol: "GBP",
      rate: 0.84,
      type: "forex",
    },
    {
      symbol: "EURJPY",
      name: "Euro / Japanese Yen",
      baseSymbol: "EUR",
      quoteSymbol: "JPY",
      rate: 129.5,
      type: "forex",
    },
    {
      symbol: "GBPJPY",
      name: "British Pound / Japanese Yen",
      baseSymbol: "GBP",
      quoteSymbol: "JPY",
      rate: 154.7,
      type: "forex",
    },
  ];
}

/**
 * Get mock stock symbols as fallback
 * @returns {Array} Mock stock symbols
 */
function getMockStockSymbols() {
  return [
    { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", type: "stock" },
    {
      symbol: "MSFT",
      name: "Microsoft Corporation",
      exchange: "NASDAQ",
      type: "stock",
    },
    {
      symbol: "AMZN",
      name: "Amazon.com, Inc.",
      exchange: "NASDAQ",
      type: "stock",
    },
    {
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      exchange: "NASDAQ",
      type: "stock",
    },
    {
      symbol: "FB",
      name: "Meta Platforms, Inc.",
      exchange: "NASDAQ",
      type: "stock",
    },
    { symbol: "TSLA", name: "Tesla, Inc.", exchange: "NASDAQ", type: "stock" },
    {
      symbol: "NVDA",
      name: "NVIDIA Corporation",
      exchange: "NASDAQ",
      type: "stock",
    },
    {
      symbol: "JPM",
      name: "JPMorgan Chase & Co.",
      exchange: "NYSE",
      type: "stock",
    },
    { symbol: "V", name: "Visa Inc.", exchange: "NYSE", type: "stock" },
    {
      symbol: "JNJ",
      name: "Johnson & Johnson",
      exchange: "NYSE",
      type: "stock",
    },
  ];
}

export default {
  getCryptoSymbols,
  getForexSymbols,
  getTrendingStocks,
  searchSymbols,
};
