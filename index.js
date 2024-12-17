import { app, BrowserWindow, globalShortcut} from 'electron';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';  // Import csv-parse for CSV parsing

import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Enable live-reload for development
// if (process.env.NODE_ENV === 'development') {
//   import('electron-reload') // Dynamically import electron-reload only in development
//     .then((module) => {
//       module.default(__dirname, {
//         electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
//       });
//     })
//     .catch((err) => console.error('Error setting up live-reload:', err));
// }

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let stock;

let mainWindow;


// Read and parse the CSV file
function loadStockData() {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, 'assets', 'APPLE_HistoricalData_1734412988258.csv');
    
    const resultsDate = [] ;  // This will hold the parsed CSV rows
    const resultsLast = [];  // This will hold the parsed CSV rows
    const resultsVolume = [];  // This will hold the parsed CSV rows
    const resultsOpen = [];  // This will hold the parsed CSV rows
    const resultsHigh = [];  // This will hold the parsed CSV rows
    const resultsLow = [];  // This will hold the parsed CSV rows

    // const results = [];  // This will hold the parsed CSV rows
    let res;


    // Create a readable stream from the CSV file
    const fileStream = fs.createReadStream(filePath);

    // Parse the CSV file
    fileStream.pipe(parse({
      delimiter: ',',   // Delimiter (default is ',')
      columns: true,     // Convert the CSV rows into objects using the header row
      skip_empty_lines: true  // Skip empty lines
    }))
    .on('data', (row) => {


      resultsDate.push(String("'"+ row.Date + "'"));  // Push each row (parsed as an object) into the results array
      resultsLast.push(row['Close/Last'].slice(1,-1));  // get rid of $ in text
      resultsVolume.push(row.Volume);  
      resultsOpen.push(row.Open.slice(1,-1));  
      resultsHigh.push(row.High.slice(1,-1));  
      resultsLow.push(row.Low.slice(1,-1));  

      

    })
    .on('end', () => {
      res = {
        Date : resultsDate.reverse(),
        Last : resultsLast.reverse(),
        Volume : resultsVolume.reverse(),
        Open : resultsOpen.reverse(),
        High : resultsHigh.reverse(),
        Low : resultsLow.reverse(),
      }

      resolve(res);  // Resolve the promise with the parsed data when parsing is done
    })
    .on('error', (err) => {
      reject(err);  // Reject the promise if there's an error during parsing
    });
  });
}

// Create the Electron window
function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,  // Allow Node.js integration in the renderer process
      contextIsolation: false, // Disable context isolation (not recommended for production)
    },
  });

  // Open DevTools in development mode
  // if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools();
  // }

  loadStockData().then((data)=>{
    // console.log(data)
    stock = data; // holds sequence datestamped

    // console.log(stock)
      // Load an HTML string into the window
  const htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stock Prices</title>
   <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

  </head>
  <body>
    <h1>Stock Prices</h1>
    <table border="1">
      <thead>
        <tr>
          <th>Date</th>
          <th>Close/Last</th>
          <th>Volume</th>
          <th>Open</th>
          <th>High</th>
          <th>Low</th>
        </tr>
      </thead>
      <tbody id="stock-data-body">
        <!-- Stock data rows will be injected here -->

        <td>${stock.Date[0]}</td>
            <td>${stock.Last[0]}</td>
            <td>${stock.Volume[0]}</td>
            <td>${stock.Open[0]}</td>
            <td>${stock.High[0]}</td>
            <td>${stock.Low[0]}</td>


      </tbody>
    </table>

<div>
  <canvas id="myChart"></canvas>
</div>

    <script>
  const ctx = document.getElementById('myChart');


 
  ${console.log(String(stock.Date))}



  let chart = new Chart("myChart", {
  type: "line",
  data: {
    
    datasets: [{
      data: [${String(stock.Open)}],
      borderColor: "blue",
      fill: false,
      label: "open price"
    }
      
      ,{
      data: [${String(stock.Last)}],
      borderColor: "green",
      fill: false,
      label: "closing price"
    },
    {
      data: [${String(stock.Low)}],
      borderColor: "red",
      fill: false,
      label: "low price"
    }
      
    ]
  },
  options: {
    legend: {display: false},
   scales: {
            x: {
                // ticks: {
                //     // Only show if n'th
                //     callback: function(value, index, ticks) {
                //         return index;
                //     }
                // },
                      type: 'category',
                 labels: [${String(stock.Date)}]
            }
        }
  }
});

  
  
</script>

  </body>
  </html>
`;
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
    mainWindow = win;
  })  

}

// Electron app lifecycle
app.whenReady().then(() => {
  globalShortcut.register('e', () => {
    
    mainWindow.focus();
    console.log("e");
    mainWindow.webContents.executeJavaScript(`
      console.log(chart, chart.data.datasets[0].borderColor);
        
      chart.data.datasets[0].borderColor = 'red'
      chart.update();

      `);
  });
  createWindow();


  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });




});


