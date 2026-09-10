import { parse } from 'csv-parse';
import fs from 'fs';
//  doesnt trade every day


// Helper function to calculate Simple Moving Averages (SMA)
function calculateSMA(data, window) {
    let sma = [];
    for (let i = 0; i < data.length; i++) {
        if (i >= window - 1) {
            let sum = 0;
            for (let j = i - window + 1; j <= i; j++) {
                sum += data[j].Close;
            }
            sma.push(sum / window);
        } else {
            sma.push(null); // Not enough data for SMA
        }
    }
    return sma;
}

// Helper function to clean and parse CSV data
function cleanData(rawData) {
    return rawData.map(row => {
        return {
            Date: row.Date,
            Close: parseFloat(row['Close/Last'].replace('$', '').replace(',', '')), // Remove dollar sign and commas, then convert to number
            Volume: parseInt(row.Volume.replace(',', '')), // Remove commas and convert to integer
            Open: parseFloat(row.Open.replace('$', '').replace(',', '')),
            High: parseFloat(row.High.replace('$', '').replace(',', '')),
            Low: parseFloat(row.Low.replace('$', '').replace(',', ''))
        };
    });
}

// Function to read and parse the CSV file
function readCSV(filePath) {
    return new Promise((resolve, reject) => {
        const data = [];
        fs.createReadStream(filePath)
            .pipe(parse({ columns: true, skip_empty_lines: true }))
            .on('data', (row) => data.push(row))
            .on('end', () => resolve(cleanData(data))) // Clean data before returning
            .on('error', (err) => reject(err));
    });
}

// Function to simulate a more competitive trading strategy
function runCompetitiveTradingStrategy(data, difficultyLevel) {
    const difficultyParams = {
        easy: { shortSMA: 5, longSMA: 20, riskReward: 1.5 },
        medium: { shortSMA: 10, longSMA: 50, riskReward: 2 },
        hard: { shortSMA: 20, longSMA: 100, riskReward: 0.1 }
    };

    const { shortSMA, longSMA, riskReward } = difficultyParams[difficultyLevel];
    
    const smaShort = calculateSMA(data, shortSMA); // Short-term moving average
    const smaLong = calculateSMA(data, longSMA); // Long-term moving average

    let positions = [];
    let portfolioValue = 10000; // Starting portfolio value
    let shares = 0; // Number of shares owned
    let signal = 0; // 1 for buy, -1 for sell, 0 for no action
    let stopLoss = 0; // To track stop-loss levels
    let entryPrice = 0; // Track entry price for stop-loss and profit-taking

    // Loop through the data, apply strategy, and execute trades
    for (let i = longSMA - 1; i < data.length; i++) {
        const currentPrice = data[i].Close;

        // Log SMA values for debugging
        console.log(`Checking at ${data[i].Date}: SMA Short: ${smaShort[i]}, SMA Long: ${smaLong[i]}`);

        // Simple Moving Average Crossover Strategy: Buy/Sell based on crossover
        if (smaShort[i] > smaLong[i] && signal !== 1) {
            console.log(`Buy condition met at ${data[i].Date} - Price: ${currentPrice}`);
            if (shares === 0) {
                // Execute buy
                shares = portfolioValue / currentPrice;
                portfolioValue = 0;
                entryPrice = currentPrice;
                positions.push({ date: data[i].Date, action: 'BUY', price: currentPrice });
                signal = 1; // Update signal to "buy"
                stopLoss = currentPrice * 0.98; // Set stop-loss 2% below entry price
            }
        } else if (smaShort[i] < smaLong[i] && signal !== -1) {
            console.log(`Sell condition met at ${data[i].Date} - Price: ${currentPrice}`);
            if (shares > 0) {
                // Execute sell
                portfolioValue = shares * currentPrice;
                shares = 0;
                positions.push({ date: data[i].Date, action: 'SELL', price: currentPrice });
                signal = -1; // Update signal to "sell"
            }
        }
    }

    // If still holding shares at the end, sell them at the last available price
    if (shares > 0) {
        portfolioValue = shares * data[data.length - 1].Close;
    }

    return { positions, finalPortfolioValue: portfolioValue };
}

// Example function to simulate the bot with different difficulty levels
async function simulate() {
    try {
        // Assuming you have historical data in a CSV file
        const data = await readCSV('./assets/INTEL.csv');  // Adjust to your data path
        data.reverse() // the data comes in from present to past need to do this or our assumptions are wrong
        console.log(data)
        // Simulate with different difficulty levels
        const easyResult = runCompetitiveTradingStrategy(data, "easy");
        const mediumResult = runCompetitiveTradingStrategy(data, "medium");
        const hardResult = runCompetitiveTradingStrategy(data, "hard");

        console.log("Easy Difficulty Result:", easyResult);
        console.log("Medium Difficulty Result:", mediumResult);
        console.log("Hard Difficulty Result:", hardResult);
    } catch (error) {
        console.error("Error during simulation:", error);
    }
}

// Run the simulation
simulate();
