// Mock Database: In-memory data storage
    const userData = {
    "kanye": { balance: 10000, shares: { 'AAPL': 0, 'GOOG': 0 } }
};



// Initialize user data for offline gameplay
function initializeUser(key, initialBalance = 10000) {
  if (userData[key]) {
    throw new Error(`User "${key}" already exists.`);
  }
  userData[key] = {
    balance: initialBalance,
    shares: {},
  };
  console.log(`Initialized user "${key}" with balance: $${initialBalance}`);
}

// Ensure user exists
function ensureUserExists(key) {
  if (!userData[key]) {
    throw new Error(`User "${key}" not found. Please initialize the user first.`);
  }
}

// Get the user's balance
export function getBalance(key) {
  ensureUserExists(key);
  const user = userData[key];
  console.log(`Balance for "${key}": $${user.balance}`);
  return user.balance;
}

// Update the user's balance
export function updateBalance(key, amount) {
  ensureUserExists(key);
  const user = userData[key];
  user.balance += amount;
  if (user.balance < 0) {
    throw new Error(`Balance for "${key}" cannot go below $0.`);
  }
  console.log(`"${key}"'s balance updated by $${amount}. New balance: $${user.balance}`);
}

// Update the user's shares
export function updateShares(key, stock, sharesToBuy, sharesToSell, price) {
  ensureUserExists(key);
  const user = userData[key];

  // Initialize stock if not already tracked
  if (!(stock in user.shares)) {
    user.shares[stock] = 0;
  }

  // Calculate transaction cost
  const totalCost = sharesToBuy * price;
  const totalSaleValue = sharesToSell * price;

  // Ensure sufficient balance and shares
  if (sharesToBuy > 0 && totalCost > user.balance) {
    throw new Error(`Not enough balance to purchase ${sharesToBuy} shares of ${stock}.`);
  }
  if (sharesToSell > 0 && sharesToSell > user.shares[stock]) {
    throw new Error(`Not enough shares of ${stock} to sell.`);
  }

  // Process transaction
  if (sharesToBuy > 0) {
    user.shares[stock] += sharesToBuy;
    updateBalance(key, -totalCost); // Deduct purchase amount
  }
  if (sharesToSell > 0) {
    user.shares[stock] -= sharesToSell;
    updateBalance(key, totalSaleValue); // Add sale amount
  }

  console.log(`"${key}" now owns ${user.shares[stock]} shares of ${stock}.`);
  return user.shares[stock];
}

// Get the shares owned for a specific stock
export function getShares(key, stock) {
  ensureUserExists(key);
  const user = userData[key];
  const shares = user.shares[stock] || 0; // Default to 0 if no shares of this stock
  console.log(`"${key}" owns ${shares} shares of ${stock}.`);
  return shares;
}

// Display balance
export function displayBalance(key) {
  const balance = getBalance(key);
  console.log(`Current Balance for "${key}": $${balance}`);
}

// Offline Example Gameplay
(function offlineGameDemo() {
  const key = "kanye";

  try {
    initializeUser(key, 10000); // Initialize user with $10,000
    displayBalance(key);
    updateShares(key, "AAPL", 10, 0, 150); // Buy 10 shares at $150
    updateShares(key, "AAPL", 0, 5, 160);  // Sell 5 shares at $160
    getShares(key, "AAPL");
    displayBalance(key);
  } catch (error) {
    console.error(error.message);
  }
})();
