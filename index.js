import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// import {balance} from "client.js";
import { getBalance, updateBalance , updateShares, getShares} from './client.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let stock;
let mainWindow;

let username = "kanye"

let balance = getBalance(username);
console.log(balance)
updateBalance(username, 25);

console.log(balance)

// Function to load stock data
function loadStockData() {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, 'assets', 'APPLE_HistoricalData_1734412988258.csv');
    const resultsDate = [];
    const resultsLast = [];
    const resultsVolume = [];
    const resultsOpen = [];
    const resultsHigh = [];
    const resultsLow = [];

    const fileStream = fs.createReadStream(filePath);
    fileStream
      .pipe(parse({ delimiter: ',', columns: true, skip_empty_lines: true }))
      .on('data', (row) => {
        resultsDate.push(String("'" + row.Date + "'"));
        resultsLast.push(row['Close/Last'].slice(1, -1));
        resultsVolume.push(row.Volume);
        resultsOpen.push(row.Open.slice(1, -1));
        resultsHigh.push(row.High.slice(1, -1));
        resultsLow.push(row.Low.slice(1, -1));
      })
      .on('end', () => {
        resolve({
          Date: resultsDate.reverse(),
          Last: resultsLast.reverse(),
          Volume: resultsVolume.reverse(),
          Open: resultsOpen.reverse(),
          High: resultsHigh.reverse(),
          Low: resultsLow.reverse(),
        });
      })
      .on('error', reject);
  });
}
// Function to create windows
function createWindow(page = 'main') {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (page === 'menu') {
    const menuContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Menu</title>
      </head>
      <body>
        <h1>Menu Page</h1>
        <button onclick="goToChart()">Go to Stock Chart</button>


        <script>
          const { ipcRenderer } = require('electron');
          function goToChart() {
            ipcRenderer.send('navigate-to-main');
          }
        </script>
      </body>
      </html>
    `;
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(menuContent));
  } else {
    loadStockData().then(async (data) => {
      const stock = data;
      const htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Stock Prices</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  </head>
  <body>
    <h1>Stock Prices</h1>
    <button onclick="goToMenu()">Go to Menu</button>
    <div>
      <p>Current Price: $<span id="currentPrice">0</span></p>
      <p>Shares Owned: <span id="sharesOwned">0</span></p>
      <p>Balance: $<span id="balance">${balance}</span></p>
      <input type="number" id="sharesToBuy" value="1000" />
      <button onclick="purchaseStock()">Buy Stock</button>
      <button onclick="sellStock()">Sell Stock</button>
    </div>
    <canvas id="myChart"></canvas>
    <script>
      const { ipcRenderer } = require('electron');
      let stonk = ${JSON.stringify(stock)};
      let sharesOwned = 0;
      let currentPrice = 0; // Will store the current price of the stock
      const ctx = document.getElementById('myChart').getContext('2d');
      
      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: stonk.Date,
          datasets: [
            { data: stonk.Open, label: 'Open Price', borderColor: 'blue' },
            { data: stonk.Last, label: 'Close Price', borderColor: 'green' },
            { data: stonk.Low, label: 'Low Price', borderColor: 'red' }
          ]
        }
      });

      // Update the price in the loop
      // function updatePrice() {
      //   currentPrice = stonk.Last[stonk.Last.length - 1];
      //   document.getElementById('currentPrice').innerText = currentPrice;
      // }

      function purchaseStock() {
        const sharesToBuy = parseInt(document.getElementById('sharesToBuy').value, 10);
        ipcRenderer.send('purchase-stock', { sharesToBuy, price: currentPrice });
      }

      function sellStock() {
        const sharesToSell = parseInt(document.getElementById('sharesToBuy').value, 10);
        ipcRenderer.send('sell-stock', { sharesToSell, price: currentPrice });
      }

      function goToMenu() {
        ipcRenderer.send('navigate-to-menu');
      }

      // Listen for balance updates and update the UI accordingly
      ipcRenderer.on('balance-updated', (event, { balance, sharesOwned }) => {
        document.getElementById('balance').innerText = balance;
        document.getElementById('sharesOwned').innerText = sharesOwned;
      });

      // Listen for error messages
      ipcRenderer.on('error', (event, message) => {
        alert(message);
      });

      // Simulate price updates and animation
      // function animatePrice() {
      //   setInterval(() => {
      //     updatePrice();
      //     chart.update();
      //   }, 1000); // Update every second for demonstration
      // }

      // animatePrice(); // Start the price update animation
// Variables for animation
let currentIndex = 0; // Start from the first data point
const sliceSize = 10; // How many points to show at once in the graph (feel free to change this)
const totalDataPoints = stonk.Date.length; // Total number of data points in the chart


      function updatePrice() {
  // Make sure we're showing a valid data slice
  if (currentIndex + sliceSize <= totalDataPoints) {
    // Get the most recent price from the visible sector (slice) of the data
    currentPrice = stonk.Last[currentIndex]; // Use the first point in the slice for the current price

    // Update the displayed current price in the UI
    document.getElementById('currentPrice').innerText = currentPrice;
  }
}

// Function to update the chart data with a subset (slice) of the data
function updateChartData() {
  const labels = stonk.Date.slice(currentIndex, currentIndex + sliceSize);
  const openData = stonk.Open.slice(currentIndex, currentIndex + sliceSize);
  const lastData = stonk.Last.slice(currentIndex, currentIndex + sliceSize);
  const lowData = stonk.Low.slice(currentIndex, currentIndex + sliceSize);

  // Update the chart's datasets
  chart.data.labels = labels;
  chart.data.datasets[0].data = openData;
  chart.data.datasets[1].data = lastData;
  chart.data.datasets[2].data = lowData;

  // Update the chart (this triggers the re-render)
  chart.update();
}

// Function to animate the chart's data and update the current price
function animateChart() {
  // Only update if we haven't reached the end of the data
  if (currentIndex + sliceSize <= totalDataPoints) {
    // Update the chart with the next slice of data
    updateChartData();
    updatePrice(); // Update the current price based on the current slice of data

    // Increment the current index to show the next slice of data
    currentIndex++;

    // Call the next frame of the animation loop
    requestAnimationFrame(animateChart);
  }
}

// Start the animation loop (start the data scroll)
animateChart();
    </script>
  </body>
  </html>
`;

win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));

    });
  }

  mainWindow = win;
  win.webContents.openDevTools()


}

// Electron app lifecycle
app.whenReady().then(() => {
  createWindow('main');

  ipcMain.on('navigate-to-menu', () => {
    if (mainWindow) mainWindow.close();
    createWindow('menu');
  });

  ipcMain.on('navigate-to-main', () => {
    if (mainWindow) mainWindow.close();
    createWindow('main');
  });

  ipcMain.on('update-balance', async (event, { amount }) => {
    try {
      // Call the updateBalance function from client.js
      const response = await updateBalance(username, amount);
      // After updating the balance, fetch the new balance
      const updatedBalance = await getBalance(username);
      // Send the updated balance to the renderer process
      event.sender.send('balance-updated', { balance: updatedBalance });
    } catch (error) {
      console.error('Error updating balance:', error);
      event.sender.send('error', 'Failed to update balance.');
    }
  });
  
  // Handle stock purchase event
  ipcMain.on('purchase-stock', async (event, {  sharesToBuy, price }) => {
    try {
      console.log(username);
      const balance = await getBalance(username);
      const totalPrice = sharesToBuy * price;
  
      if (balance >= totalPrice) {
        // Deduct the balance first
        await updateBalance(username, -totalPrice);
        await updateShares(username, 'AAPL', sharesToBuy, 0, price);
        
        event.sender.send('balance-updated', { balance });

        // Now we update the sharesOwned on the server (you'll need an endpoint for this in the API)
         
      // {
          // event.sender.send('error', 'Failed to update shares owned.');
        
      } else {
        event.sender.send('error', 'Not enough balance to purchase shares.');
      }


    } catch (error) {
      console.error('Error purchasing stock:', error);
      event.sender.send('error',  error);
    }
    
  });
  
  // Handle stock sell event
  ipcMain.on('sell-stock', async (event, {  sharesToSell, price }) => {
    try {
      console.log(username);
  
      // Fetch the number of shares owned by the user
      const sharesOwned = await getShares(username, "AAPL");  // Use getShares to fetch shares for a stock
  
      // Check if the user has enough shares to sell
      if (sharesOwned >= sharesToSell) {
        const totalSaleAmount = sharesToSell * price;
  
        // Proceed with updating balance and shares
        await updateBalance(username, totalSaleAmount);
        await updateShares(username, "AAPL", 0, sharesToSell, price);
  
        // Send the updated balance and shares owned to the renderer
        const updatedBalance = await getBalance(username);
        event.sender.send('balance-updated', { balance: updatedBalance, sharesOwned: sharesOwned - sharesToSell });
      } else {
        event.sender.send('error', 'Not enough shares to sell.');
      }
    } catch (error) {
      console.error('Error selling stock:', error);
      event.sender.send('error', 'Failed to sell stock.');
    }
  });
  

  globalShortcut.register('cmd+e', () => {
    mainWindow.webContents.executeJavaScript(`
      chart.data.datasets[0].borderColor = 'red';
      chart.update();
      startGameLoop();


    `);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow('main');
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
});
