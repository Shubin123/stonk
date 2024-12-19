// import { parse } from 'csv-parse';
// import fs from 'fs';

// // Function to simulate the strategy
// // function simulateStrategy(initialCapital, data) {
// // DEFECTIVE BOT DO NOT USE
// // }
// // DEFECTIVE BOT DO NOT USE
// // DEFECTIVE BOT DO NOT USE
// // DEFECTIVE BOT DO NOT USE
// // DEFECTIVE BOT DO NOT USE
// // DEFECTIVE BOT DO NOT USE
// // DEFECTIVE BOT DO NOT USE
// // DEFECTIVE BOT DO NOT USE
// // DEFECTIVE BOT DO NOT USE
// // DEFECTIVE BOT DO NOT USE




// function simulateStrategy(initialCapital, data, lookAheadDays) {
//     let capital = initialCapital;
//     console.log(data.length)
//     for (let i = 0; i < data.length - lookAheadDays; i++) {
//         const day = data[i];
//         const futureDay = data[i + lookAheadDays];

//         const highToday = parseFloat(day.High.replace(/[$,]/g, ''));
//         const lowToday = parseFloat(day.Low.replace(/[$,]/g, ''));
//         const highFuture = parseFloat(futureDay.High.replace(/[$,]/g, ''));
//         const lowFuture = parseFloat(futureDay.Low.replace(/[$,]/g, ''));

//         if (
//             isNaN(highToday) || isNaN(lowToday) ||
//             isNaN(highFuture) || isNaN(lowFuture) ||
//             lowToday === 0 || lowFuture === 0
//         ) {
//             console.warn(`Skipping invalid row at index ${i}: ${JSON.stringify(day)}`);
//             continue;
//         }

//         // Calculate return based on current and future days
//         const priceChange = (highFuture - lowToday) / lowToday;
//         // capital *= (1 + priceChange);
//         if (priceChange > 0) {
//             // console.log(priceChange);

//             console.log(`Trade made on row ${i} with Price Change: ${priceChange.toFixed(6)}`);
//             capital *= (1 + priceChange);
//         }
//     }

//     return capital;
// }

// // Function to start the simulation
// function startSimulation(filePath) {
//     const initialCapital = 10000;

//     // Ensure the file exists
//     if (!fs.existsSync(filePath)) {
//         console.error(`File not found: ${filePath}`);
//         return;
//     }

//     const fileContent = fs.readFileSync(filePath, 'utf8');

//     // Parse the CSV file
//     parse(
//         fileContent,
//         {
//             columns: true, // Treat the first row as headers
//             skip_empty_lines: true,
//         },
//         (err, data) => {
//             if (err) {
//                 console.error('Error parsing CSV file:', err);
//                 return;
//             }

//             if (!data || data.length === 0) {
//                 console.error('The CSV file appears to be empty or invalid.');
//                 return;
//             }

//             // Simulate the strategy and calculate the final capital
//             const finalCapital = simulateStrategy(initialCapital, data.reverse(), 20);
//             console.log(`Initial Capital: $${initialCapital}`);
//             console.log(`Final Capital after ${data.length} days: $${finalCapital.toFixed(2)}`);
//         }
//     );
// }

// // Specify the path to the CSV file (replace with your file path)
// const csvFilePath = './assets/APPLE_HistoricalData_1734412988258.csv'; // Adjust this path as necessary
// startSimulation(csvFilePath);
