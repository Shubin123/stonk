// Fetch the balance for a user
async function getUserBalance(username) {
    const response = await fetch(`http://localhost:3000/balance/${username}`);
    const data = await response.json();
    console.log(data.balance);
  }
  
  // Update the balance for a user
  async function updateUserBalance(username, amount) {
    const response = await fetch('http://localhost:3000/update-balance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, amount }),
    });
  
    const data = await response.text();
    console.log(data);  // 'Balance updated successfully'
  }
  


  updateUserBalance();