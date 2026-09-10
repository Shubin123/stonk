import express from 'express';

const app = express();
const port = 3000;

// Simulated in-memory "database"
const mockDatabase = {
  'drake': { balance: 10000000000.0, sharesOwned: { AAPL: 0, GOOG: 0 } },
  'kanye': { balance: 10000000000.0, sharesOwned: { AAPL: 0, GOOG: 0 } }
};

// Middleware to parse JSON request bodies
app.use(express.json());

// Route to get the balance and shares owned of a user
app.get('/balance/:username', (req, res) => {
  const { username } = req.params;

  // Simulate fetching balance and shares owned from the "mock database"
  const user = mockDatabase[username];
  
  if (!user) {
    return res.status(404).send('User not found');
  }

  res.json({ balance: user.balance, sharesOwned: user.sharesOwned });
});

// Route to update the balance of a user
app.post('/update-balance', (req, res) => {
  const { username, amount } = req.body;

  // Simulate fetching user from the "mock database"
  const user = mockDatabase[username];

  if (!user) {
    return res.status(404).send('User not found');
  }

  // Update the user's balance in the mock database
  user.balance += parseFloat(amount);

  res.send(`Balance updated successfully. New balance: $${user.balance}`);
});

// Route to update the shares owned by a user
app.post('/update-shares-owned', (req, res) => {
  const { username, sharesToBuy, sharesToSell, stock } = req.body;

  // Simulate fetching user from the "mock database"
  const user = mockDatabase[username];

  if (!user) {
    return res.status(404).send('User not found');
  }

  // Initialize the shares for the specific stock if not present
  if (!user.sharesOwned[stock]) {
    user.sharesOwned[stock] = 0;
  }

  // Update the shares owned (buying or selling)
  if (sharesToBuy) {
    user.sharesOwned[stock] += parseInt(sharesToBuy);
  } else if (sharesToSell) {
    if (user.sharesOwned[stock] < sharesToSell) {
      return res.status(400).send('Not enough shares to sell');
    }
    user.sharesOwned[stock] -= parseInt(sharesToSell);
  } else {
    return res.status(400).send('Invalid shares operation');
  }

  res.json({ sharesOwned: user.sharesOwned });
});

// Route to get the number of shares owned by a user for a specific stock
app.get('/shares-owned/:username', (req, res) => {
  const { username } = req.params;

  // Simulate fetching user from the "mock database"
  const user = mockDatabase[username];

  if (!user) {
    return res.status(404).send('User not found');
  }

  // Send back the shares owned for each stock
  res.json({ sharesOwned: user.sharesOwned });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
