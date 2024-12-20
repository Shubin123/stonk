import { parse } from 'csv-parse';
import fs from 'fs';
//  trades every day

function simulateStrategy(initialCapital, data, lookAheadDays, tradeAllocation = 0.2, stopLoss = 0.1, takeProfit = 0.15, tradeCooldown = 5) {
    let cash = initialCapital; // Start with cash only
    let shares = 0; // Initially, no shares
    let lastTradeDay = -tradeCooldown; // Prevent trades during cooldown

    console.log(`Number of rows in the dataset: ${data.length}`);
    console.log(`Looking ahead by ${lookAheadDays} day(s)`);

    for (let i = 0; i < data.length - lookAheadDays; i++) {
        const day = data[i];
        const closeToday = parseFloat(day['Close/Last']?.replace(/[$,]/g, '') || 'NaN');

        if (isNaN(closeToday) || closeToday <= 0 || i - lastTradeDay < tradeCooldown) {
            continue; // Skip invalid data or respect cooldown
        }

        // Analyze future prices for the look-ahead window
        const futurePrices = data
            .slice(i + 1, i + lookAheadDays + 1)
            .map((d) => parseFloat(d['Close/Last']?.replace(/[$,]/g, '') || 'NaN'))
            .filter((price) => !isNaN(price) && price > 0);

        if (futurePrices.length === 0) continue; // No valid future data
        const closeFutureMax = Math.max(...futurePrices); // Best future selling price

        // Calculate moving average for current trend
        const movingAvgDays = 10;
        const recentPrices = data
            .slice(Math.max(0, i - movingAvgDays + 1), i + 1)
            .map((d) => parseFloat(d['Close/Last']?.replace(/[$,]/g, '') || '0'));

        const movingAvg = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;

        // Decide to Buy
        if (cash > closeToday && closeToday > movingAvg) {
            const allocation = cash * tradeAllocation;
            const potentialShares = Math.floor(allocation / closeToday);
            const potentialProfit = potentialShares * (closeFutureMax - closeToday);

            if (potentialProfit > 0) {
                const cost = potentialShares * closeToday;
                cash -= cost;
                shares += potentialShares;
                lastTradeDay = i; // Mark trade day
                console.log(
                    `Bought ${potentialShares} shares at $${closeToday.toFixed(2)} (Remaining Cash: $${cash.toFixed(2)})`
                );
            }
        }

        // Decide to Sell (Stop-loss or Take-profit)
        if (shares > 0) {
            const currentValue = shares * closeToday;
            const takeProfitPrice = (1 + takeProfit) * closeToday;
            const stopLossPrice = (1 - stopLoss) * closeToday;

            if (closeToday <= stopLossPrice) {
                cash += shares * closeToday; // Sell all shares
                console.log(
                    `Stop-loss triggered! Sold ${shares} shares at $${closeToday.toFixed(2)} (Total Cash: $${cash.toFixed(2)})`
                );
                shares = 0;
                lastTradeDay = i;
            } else if (closeFutureMax >= takeProfitPrice) {
                cash += shares * closeFutureMax; // Sell all shares at best future price
                console.log(
                    `Take-profit triggered! Sold ${shares} shares at $${closeFutureMax.toFixed(
                        2
                    )} (Total Cash: $${cash.toFixed(2)})`
                );
                shares = 0;
                lastTradeDay = i;
            }
        }
    }

    // Calculate final portfolio value
    const finalCapital = cash + shares * parseFloat(data[data.length - 1]['Close/Last']?.replace(/[$,]/g, '') || 0);
    return finalCapital;
}


// Function to start the simulation
function startSimulation(filePath) {
    const initialCapital = 10000;

    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');

    parse(
        fileContent,
        {
            columns: true,
            skip_empty_lines: true,
        },
        (err, data) => {
            if (err) {
                console.error('Error parsing CSV file:', err);
                return;
            }

            if (!data || data.length === 0) {
                console.error('The CSV file appears to be empty or invalid.');
                return;
            }

            const finalCapital = simulateStrategy(initialCapital, data.reverse(), 256);
            console.log(`Initial Capital: $${initialCapital}`);
            console.log(`Final Portfolio Value after ${data.length} days: $${finalCapital.toFixed(2)}`);
        }
    );
}

// Specify the path to the CSV file and the number of look-ahead days
const csvFilePath = './assets/NVIDIA.csv'; // Adjust this path
const lookAheadDays = 1; // Days to look ahead
startSimulation(csvFilePath, lookAheadDays);