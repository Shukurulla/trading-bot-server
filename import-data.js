// import-data.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  connectToDatabase,
  Trade,
  ActiveSymbol,
  Config,
} from "./src/database/mongodb.js";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file paths
const TRADES_FILE = path.join(__dirname, "data/trades.json");
const ACTIVE_SYMBOLS_FILE = path.join(__dirname, "data/active_symbols.json");
const CONFIG_FILE = path.join(__dirname, "data/config.json");

async function importData() {
  console.log("Starting data import to MongoDB...");

  try {
    // Connect to MongoDB
    const connected = await connectToDatabase();
    if (!connected) {
      console.error("Failed to connect to MongoDB. Aborting import.");
      process.exit(1);
    }

    // Import active symbols
    if (fs.existsSync(ACTIVE_SYMBOLS_FILE)) {
      try {
        const symbolsData = fs.readFileSync(ACTIVE_SYMBOLS_FILE, "utf8");
        const symbols = JSON.parse(symbolsData);

        console.log(`Importing ${symbols.length} active symbols...`);
        for (const symbol of symbols) {
          await ActiveSymbol.findOneAndUpdate(
            { symbol },
            { symbol },
            { upsert: true }
          );
        }
        console.log("Active symbols import completed.");
      } catch (error) {
        console.error("Error importing active symbols:", error);
      }
    } else {
      console.log("No active symbols file found.");
    }

    // Import configuration
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        const configData = fs.readFileSync(CONFIG_FILE, "utf8");
        const config = JSON.parse(configData);

        console.log("Importing configuration...");
        await Config.findOneAndUpdate(
          { _id: { $exists: true } },
          { ...config, lastUpdated: new Date() },
          { upsert: true }
        );
        console.log("Configuration import completed.");
      } catch (error) {
        console.error("Error importing configuration:", error);
      }
    } else {
      console.log("No configuration file found.");
    }

    // Import trades
    if (fs.existsSync(TRADES_FILE)) {
      try {
        const tradesData = fs.readFileSync(TRADES_FILE, "utf8");
        const trades = JSON.parse(tradesData);

        console.log(`Importing ${trades.length} trades...`);
        for (const trade of trades) {
          const tradeData = {
            symbol: trade.symbol,
            entryPrice: trade.entryPrice,
            exitPrice: trade.exitPrice || null,
            quantity: trade.quantity,
            side: trade.side,
            pnl: trade.pnl,
            entryTime: new Date(trade.entryTime),
            exitTime: trade.exitTime ? new Date(trade.exitTime) : null,
            status: trade.status || (trade.exitTime ? "CLOSED" : "OPEN"),
            confidence: trade.confidence,
            stopLoss: trade.stopLoss,
            takeProfit: trade.takeProfit,
            orderId: trade.orderId,
            timestamp: new Date(trade.timestamp || Date.now()),
          };

          await Trade.create(tradeData);
        }
        console.log("Trades import completed.");
      } catch (error) {
        console.error("Error importing trades:", error);
      }
    } else {
      console.log("No trades file found.");
    }

    console.log("Import process completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error during import process:", error);
    process.exit(1);
  }
}

// Run the import
importData();
