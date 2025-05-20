// src/services/marketNewsService.js
import axios from "axios";
import natural from "natural";
import dotenv from "dotenv";

dotenv.config();

// Initialize sentiment analyzer using AFINN lexicon from natural
const Analyzer = natural.SentimentAnalyzer;
const stemmer = natural.PorterStemmer;
const analyzer = new Analyzer("English", stemmer, "afinn");

// Create tokenizer
const tokenizer = new natural.WordTokenizer();

/**
 * Get recent news for a trading symbol
 * @param {string} symbol - The trading symbol
 * @param {number} limit - Maximum number of news items to return
 * @returns {Promise<Array>} Array of news items with sentiment analysis
 */
export async function getMarketNews(symbol, limit = 5) {
  try {
    // Use free Alpha Vantage API for news
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || "demo";
    const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${apiKey}&limit=${limit}`;

    const response = await axios.get(url);

    // Check if we have valid response
    if (!response.data || !response.data.feed) {
      console.warn(`No news found for ${symbol}`);
      return getMockNews(symbol, limit);
    }

    // Process each news item and add sentiment analysis
    const news = response.data.feed.slice(0, limit).map((item) => {
      // Perform sentiment analysis on the title and summary
      const titleTokens = tokenizer.tokenize(item.title || "");
      const summaryTokens = tokenizer.tokenize(item.summary || "");

      // Calculate sentiment scores
      const titleSentiment =
        titleTokens.length > 0 ? analyzer.getSentiment(titleTokens) : 0;
      const summarySentiment =
        summaryTokens.length > 0 ? analyzer.getSentiment(summaryTokens) : 0;

      // Calculate overall sentiment (weighted average)
      const sentiment = titleSentiment * 0.4 + summarySentiment * 0.6;

      return {
        title: item.title,
        url: item.url,
        publishedDate: new Date(item.time_published || Date.now()),
        source: item.source,
        summary: item.summary,
        sentiment: sentiment,
      };
    });

    return news;
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error);

    // Fallback to mock news data if API fails
    return getMockNews(symbol, limit);
  }
}

/**
 * Get mock news data as a fallback
 * @param {string} symbol - The trading symbol
 * @param {number} limit - Maximum number of news items
 * @returns {Array} Mock news items
 */
function getMockNews(symbol, limit) {
  const mockNews = [
    {
      title: `${symbol} Reports Strong Quarterly Earnings`,
      url: "#",
      publishedDate: new Date(),
      source: "Market News Today",
      summary: `${symbol} reported earnings that exceeded analyst expectations by 15%. Revenue growth was strong across all segments.`,
      sentiment: 0.8,
    },
    {
      title: `Analysts Upgrade ${symbol} to Buy Rating`,
      url: "#",
      publishedDate: new Date(Date.now() - 86400000), // 1 day ago
      source: "Financial Insights",
      summary: `Multiple analysts have upgraded ${symbol} to a buy rating following recent product announcements and positive market trends.`,
      sentiment: 0.6,
    },
    {
      title: `${symbol} Faces Regulatory Scrutiny`,
      url: "#",
      publishedDate: new Date(Date.now() - 2 * 86400000), // 2 days ago
      source: "Business Daily",
      summary: `Regulatory authorities have announced an investigation into ${symbol}'s business practices, causing uncertainty in the market.`,
      sentiment: -0.7,
    },
    {
      title: `${symbol} Announces New Strategic Partnership`,
      url: "#",
      publishedDate: new Date(Date.now() - 3 * 86400000), // 3 days ago
      source: "Tech News Network",
      summary: `${symbol} has formed a strategic partnership with a major industry player to develop new technologies and expand market reach.`,
      sentiment: 0.5,
    },
    {
      title: `Market Volatility Impacts ${symbol} Stock Price`,
      url: "#",
      publishedDate: new Date(Date.now() - 4 * 86400000), // 4 days ago
      source: "Global Market Watch",
      summary: `Broader market volatility has affected ${symbol}'s stock price, despite the company's solid fundamentals.`,
      sentiment: -0.2,
    },
  ];

  return mockNews.slice(0, limit);
}

export default {
  getMarketNews,
};
