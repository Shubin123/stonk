// Mock Database: In-memory data storage
    let userData = {
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
  // console.log(`"${key}"'s balance updated by $${amount}. New balance: $${user.balance}`);
}

// Update the user's shares
export function updateShares(key, stock, sharesTransaction, price) {

  ensureUserExists(key);
  let user = userData[key];

  if (sharesTransaction === 0) return user.shares[stock] || 0;

  console.log(sharesTransaction, Math.abs(sharesTransaction) > user.shares[stock]);
  // // Initialize stock if not already tracked
  // if (!(stock in user.shares)) {
  //   user.shares[stock] = 0;
  // }

  const transactionValue = sharesTransaction * price;

  // Ensure valid transaction
  if (
    (sharesTransaction > 0 && transactionValue > user.balance) || // Insufficient funds
    (sharesTransaction < 0 && Math.abs(sharesTransaction) > user.shares[stock]) // Insufficient shares
  ) {
    return "INSUFFICIENT MONEY/SHARES";
    alert("NOT ALLOWED")
  }

  // Update shares and balance
  console.log(user.shares[stock]);
  user.shares[stock] += sharesTransaction;

  console.log(user.shares[stock]);

  // return user.shares[stock];
}

// Get the shares owned for a specific stock
export function getShares(key, stock) {
  ensureUserExists(key);
  const user = userData[key];
  const shares = user.shares[stock] || 0; // Default to 0 if no shares of this stock
  // console.log(`"${key}" owns ${shares} shares of ${stock}.`);
  return shares;
}

// Display balance
export function displayBalance(key) {
  const balance = getBalance(key);
  console.log(`Current Balance for "${key}": $${balance}`);
}

