// Client-side request function (POST update balance)
async function updateBalance(username, amount) {
    try {
      const response = await fetch('http://localhost:3000/update-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, amount })
      });
  
      if (response.ok) {
        const message = await response.text();
        console.log(message);
      } else {
        console.error('Error:', await response.text());
      }
    } catch (error) {
      console.error('Network error:', error);
    }
  }
  
  // Example usage: Update balance for "john_doe"
  updateBalance('john_doe', 25);
  