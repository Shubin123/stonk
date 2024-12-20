import { parse } from 'csv-parse';
import fs from 'fs';
//  trades every day

function simulateStrategy(initialCapital, data, lookAheadDays) {
    let cash = initialCapital; // Start with cash only
    let shares = 0; // Initially, no shares
    console.log(`Number of rows in the dataset: ${data.length}`);
    console.log(`Looking ahead by ${lookAheadDays} day(s)`);

    for (let i = 0; i < data.length - lookAheadDays; i++) {
        const day = data[i];
        const futureDay = data[i + lookAheadDays];

        // Parse prices
        const closeToday = parseFloat(day['Close/Last']?.replace(/[$,]/g, '') || 'NaN');
        const closeFuture = parseFloat(futureDay['Close/Last']?.replace(/[$,]/g, '') || 'NaN');

        console.log(`Row ${i}: Close Today=${closeToday}, Close Future=${closeFuture}`);

        if (isNaN(closeToday) || isNaN(closeFuture) || closeToday <= 0) {
            console.warn(`Skipping invalid row at index ${i}: ${JSON.stringify(day)}`);
            continue;
        }

        // Simulated strategy: Buy on close today, sell on close in the future
        if (cash > closeToday) {
            // Buy shares with all available cash
            shares = Math.floor(cash / closeToday); // Integer shares only
            cash -= shares * closeToday;
            console.log(`Bought ${shares} shares at $${closeToday.toFixed(2)} (Remaining Cash: $${cash.toFixed(2)})`);
        }

        if (shares > 0) {
            // Sell shares at the future close
            cash += shares * closeFuture;
            console.log(`Sold ${shares} shares at $${closeFuture.toFixed(2)} (Total Cash: $${cash.toFixed(2)})`);
            shares = 0; // Reset shares to 0 after selling
        }
    }

    // Final portfolio value: cash + value of any remaining shares
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

            const finalCapital = simulateStrategy(initialCapital, data.reverse(), 12);
            console.log(`Initial Capital: $${initialCapital}`);
            console.log(`Final Portfolio Value after ${data.length} days: $${finalCapital.toFixed(2)}`);
        }
    );
}

// Specify the path to the CSV file and the number of look-ahead days
const csvFilePath = './assets/INTEL.csv'; // Adjust this path
const lookAheadDays = 1; // Days to look ahead
startSimulation(csvFilePath, lookAheadDays);