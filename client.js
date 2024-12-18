// client.js

const API_URL = 'http://localhost:3000'; // Change if your server is on a different address

// Function to get the balance
// Fetch the balance for a user
export async function getBalance(username) {
  try {
    const response = await fetch(`${API_URL}/balance/${username}`);

    // Check if the response is not okay (e.g., user not found)
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);  // Throw error message from the server
    }

    // If the response is okay, try parsing it as JSON
    const data = await response.json();

    if (data && data.balance !== undefined) {
      console.log(`Balance for ${username}: $${data.balance}`);
      return data.balance;
    } else {
      throw new Error("Invalid response format");
    }
  } catch (error) {
    console.error("Error fetching balance:", error);
    throw error;  // Re-throw error to handle it further in the calling function
  }
}
export async function updateBalance(username, amount) {
  try {
    const response = await fetch(`${API_URL}/update-balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, amount }),
    });

    // Check if the response is not okay
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);  // Throw error message from the server
    }

    const data = await response.text();
    console.log(data);  // 'Balance updated successfully'
  } catch (error) {
    console.error('Error updating balance:', error);
    throw error;  // Re-throw error to handle it further
  }
}
export async function updateShares(username, stock, sharesToBuy, sharesToSell, price) {
  try {
    // Get the stock price from the server
    const stockPrice = price

    // Calculate the total cost of buying or the value of selling the shares
    let totalAmount = 0;

    if (sharesToBuy > 0) {
      totalAmount = sharesToBuy * stockPrice;
    } else if (sharesToSell > 0) {
      totalAmount = sharesToSell * stockPrice;
    }

    // Check if the user has enough balance to purchase the shares
    const currentBalance = await getBalance(username);
    if (sharesToBuy > 0 && currentBalance < totalAmount) {
      throw new Error('Not enough balance to purchase shares.');
    }

    // Proceed with the transaction: Buy or Sell
    const response = await fetch(`${API_URL}/update-shares-owned`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        sharesToBuy,
        sharesToSell,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);  // Throw error message from the server
    }

    const data = await response.json();
    console.log(`Shares updated. Total shares owned: ${data.sharesOwned}`);

    // If purchasing shares, update balance
    if (sharesToBuy > 0) {
      await updateBalance(username, -totalAmount);  // Deduct the total purchase amount from the balance
    } else if (sharesToSell > 0) {
      await updateBalance(username, totalAmount);  // Add the total selling amount to the balance
    }

    return data.sharesOwned;  // Return updated shares owned

  } catch (error) {
    console.error("Error updating shares:", error);
    throw error;
  }
}



// Function to get the number of shares owned by the user for a specific stock
export async function getShares(username, stock) {
  try {
    // Fetch the shares owned for the user from the server
    const response = await fetch(`${API_URL}/shares-owned/${username}`);

    // Check if the response is okay
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);  // Throw error message from the server
    }

    // Parse the response as JSON
    const data = await response.json();

    // Check if the sharesOwned object contains the stock
    const sharesOwned = data.sharesOwned[stock] || 0;  // Default to 0 if no shares of this stock
    console.log(`Shares owned for ${stock}: ${sharesOwned}`);

    return sharesOwned;
  } catch (error) {
    console.error("Error fetching shares owned:", error);
    throw error;  // Re-throw error to handle it further in the calling function
  }
}

// Function to display the balance (you could render this in the DOM)
export function displayBalance(balance) {
  console.log(`Current Balance: $${balance}`);
}
