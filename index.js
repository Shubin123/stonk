import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let mainWindow;

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

    fs.createReadStream(filePath)
      .pipe(parse({ delimiter: ',', columns: true, skip_empty_lines: true }))
      .on('data', (row) => {
        resultsDate.push(`'${row.Date}'`);
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

function createWindow(page = 'main') {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true, // Allow Node.js integration
      contextIsolation: false, // Disable context isolation
    },
  });

  if (page === 'gambling') {
    // Load the external HTML file
    win.loadFile(path.join(__dirname, 'mines.html'));
  } else if (page === 'menu') {
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
  } else {
    // Default to 'main' page
    loadStockData().then((data) => {
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
        <canvas id="myChart"></canvas>
        <script>
          const ctx = document.getElementById('myChart');
          new Chart(ctx, {
            type: 'line',
            data: {
              labels: [${String(stock.Date)}],
              datasets: [
                { data: [${String(stock.Open)}], label: 'Open Price', borderColor: 'blue' },
                { data: [${String(stock.Last)}], label: 'Close Price', borderColor: 'green' },
                { data: [${String(stock.Low)}], label: 'Low Price', borderColor: 'red' }
              ]
            }
          });
          const { ipcRenderer } = require('electron');
          function goToMenu() {
            ipcRenderer.send('navigate-to-menu');
          }
        </script>
      </body>
      </html>
      `;
      win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
    });
  }

  mainWindow = win;
}


// Electron app lifecycle
app.whenReady().then(() => {
  createWindow('main');

  ipcMain.on('navigate-to-gambling', () => {
    if (mainWindow) mainWindow.close();
    createWindow('gambling');
  });
  
  ipcMain.on('navigate-to-main', () => {
    if (mainWindow) mainWindow.close();
    createWindow('main');
  });
  
  ipcMain.on('navigate-to-menu', () => {
    if (mainWindow) mainWindow.close();
    createWindow('menu');
  });
  
  globalShortcut.register('cmd+e', () => {
    mainWindow.webContents.executeJavaScript(`
      chart.data.datasets[0].borderColor = 'red';
      chart.update();
    `);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow('main');
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
});
