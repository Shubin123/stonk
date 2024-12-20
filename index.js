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

let username = "kanye";

let balance = getBalance(username);

let sharesOwned;
// console.log(balance);
// updateBalance(username, 25);


// Function to load stock data
function loadStockData() {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, 'assets', 'INTEL.csv');

    const resultsDate =   [];
    const resultsLast =   [];

    const resultsVolume = [];
    const resultsOpen =   [];
    const resultsHigh =   [];
    const resultsLow =    [];

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
     <button onclick="goToGambling()">Go to Gambling Page</button>


        <script>
          const { ipcRenderer } = require('electron');
          function goToChart() {
            ipcRenderer.send('navigate-to-main');
          }
              function goToGambling() {
            ipcRenderer.send('navigate-to-gambling');
          }
        </script>
      </body>
      </html>
    `;
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(menuContent));
  } 
  else if  (page === 'gambling') {
    // Load the external HTML file
    win.loadFile(path.join(__dirname, 'mines.html'));
  }
  else {
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
    <input type="number" id="sharesToBuy" value="5" />
    <button onclick="purchaseStock()">Buy Stock</button>
    <button onclick="sellStock()">Sell Stock</button>
  </div>
  <canvas id="myChart"></canvas>
  <div>
    <label for="speedSlider">Ticker Speed:</label>
        <input type="range" id="speedSlider" min="1" max="60" value="2" />
        <span id="speedValue">10</span> Speed
    
    <label for="rangeSlider">View Range:</label>
    <input type="range" id="rangeSlider" min="1" max="256" value="2" />
    <span id="rangeValue">2</span> Range
  </div>
  <script>
    const { ipcRenderer } = require('electron');
    let stonk = ${JSON.stringify(stock)};
    let sharesOwned =  ${JSON.stringify(sharesOwned)};
    let currentPrice = 0;
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

    let currentIndex = 0;
    
    let sliceSize = 10;    
    let slizeSizeValue = document.getElementById('rangeSlider');
    const totalDataPoints = stonk.Date.length;

    // Add slider event listener
    const slider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');

    const slice = document.getElementById('rangeSlider');
    sliceValue = document.getElementById('rangeValue');

    let isAnimating = true; // A flag to control animation

    function updatePrice() {
      console.log(sliceSize);
      if (currentIndex + sliceSize <= totalDataPoints) {
        currentPrice = stonk.Last[currentIndex];
        document.getElementById('currentPrice').innerText = currentPrice;
      }
    }

    function updateChartData() {
  const labels = stonk.Date.slice(currentIndex, currentIndex + parseInt(sliceSize));
  const openData = stonk.Open.slice(currentIndex, currentIndex + parseInt(sliceSize));
  const lastData = stonk.Last.slice(currentIndex, currentIndex + parseInt(sliceSize));
  const lowData = stonk.Low.slice(currentIndex, currentIndex + parseInt(sliceSize));

  chart.data.labels = labels;
  chart.data.datasets[0].data = openData;
  chart.data.datasets[1].data = lastData;
  chart.data.datasets[2].data = lowData;

  chart.update();
    }

    function animateChart() {
     if (!isAnimating) return; // Skip updates if animation is paused

  if (currentIndex + parseInt(sliceSize) <= totalDataPoints) {
    updateChartData();
    updatePrice();
    currentIndex++;
  } else {
    isAnimating = false; // stops auto restart !!!
    currentIndex = 0; // Reset to the start when we reach the end
  }
    }

    let fps = 10;
    let fpsInterval = 1000 / fps;
    let then = Date.now();



    function animate() {
      if (!isAnimating) return; // Stop the animation if the flag is false

      requestAnimationFrame(animate); 

      const now = Date.now();
      const elapsed = now - then;

      if (elapsed > fpsInterval) {
        then = now - (elapsed % fpsInterval);
        animateChart();
      }
    }

    //methods for event listeners
    
// Handle the range slider input
slice.addEventListener('input', () => {
  isAnimating = false; // Pause animation temporarily
  sliceSize = parseInt(slice.value); // Update slice size
  sliceValue.innerText = sliceSize;
  updateChartData(); // Update the chart with the new slice size
  isAnimating = true; // Restart animation after update
});

// Handle speed slider input
slider.addEventListener('input', () => {
  fps = parseInt(slider.value); // Update FPS value
  speedValue.innerText = fps;
  fpsInterval = 1000 / fps;
});


    animate();

    
    function purchaseStock() {
      const sharesToBuy = parseFloat(document.getElementById('sharesToBuy').value);
      ipcRenderer.send('purchase-stock', {  sharesToBuy, price: currentPrice });
    }

    function sellStock() {
      const sharesToSell = parseFloat(document.getElementById('sharesToBuy').value);
      ipcRenderer.send('sell-stock', { sharesToSell, price: currentPrice });
    }

    function goToMenu() {
      ipcRenderer.send('navigate-to-menu');
    }

        ipcRenderer.on('balance-updated', (event, { balance, sharesOwned }) => {
          console.log(balance)

        document.getElementById('balance').innerText = balance;
        document.getElementById('sharesOwned').innerText = sharesOwned;
    });

     
  </script>
</body>
</html>
`;


win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));

    });
  }

  mainWindow = win;
  // win.webContents.openDevTools()


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


  ipcMain.on('navigate-to-gambling', () => {
    if (mainWindow) mainWindow.close();
    createWindow('gambling');
  });

 
  
  // Handle stock purchase event
  ipcMain.on('purchase-stock', async (event, {  sharesToBuy, price }) => {
    try {
      // console.log(username, "purchases", sharesToBuy );
      let balance = await getBalance(username);
      const totalPrice = sharesToBuy * price;
  
      if (balance >= totalPrice) {
        // Deduct the balance first
        await updateBalance(username, -totalPrice);
        await updateShares(username, 'AAPL', sharesToBuy, 0, price);
        let balance = await getBalance(username);

        // event.sender.send('balance-updated', { balance });

        // Now we update the sharesOwned on the server (you'll need an endpoint for this in the API)
         
      // {
          // event.sender.send('error', 'Failed to update shares owned.');
         let sharesOwned = await getShares(username, "AAPL");  // Use getShares to fetch shares for a stock

          event.sender.send('balance-updated', { balance: balance, sharesOwned: sharesOwned });
          // console.log(sharesToBuy)

      } else {
        event.sender.send('error', 'Not enough balance to purchase shares.');
      }


    } catch (error) {
      console.error('Error purchasing stock:', error);
      event.sender.send('error',  error);
    }
    
  });
  
  // Handle stock sell event
  ipcMain.on('sell-stock', async (event, { sharesToSell, price }) => {
    try {
  
      // Fetch the number of shares owned by the user
      sharesOwned = await getShares(username, "AAPL");  // Use getShares to fetch shares for a stock
      // Check if the user has enough shares to sell
      // console.log(sharesOwned, sharesOwned >= sharesToSell);
      if (sharesOwned >= sharesToSell) {
        const totalSaleAmount = sharesToSell * price;
        

        // Proceed with updating balance and shares
        await updateBalance(username, totalSaleAmount);
        await updateShares(username, "AAPL", -sharesToSell, price);
        let updatedBalance = await getBalance(username);
        let updatedShares = await getShares(username, "AAPL");


        // Send the updated balance and shares owned to the renderer
        event.sender.send('balance-updated', { balance: updatedBalance, sharesOwned: updatedShares });
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
