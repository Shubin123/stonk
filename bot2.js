function simulateStrategy(
    initialCapital,
    data,
    lookAheadDays,
    tradeAllocation = 0.2, // Fraction of cash used per trade
    profitThreshold = 0.05, // Minimum 5% profit margin to sell
    maxHoldDays = 5 // Maximum days to hold shares
) {
    let cash = initialCapital; // Start with cash only
    let shares = 0; // Initially, no shares
    let buyPrice = 0; // Track the price at which shares were bought
    let holdCounter = 0; // Track how long shares have been held

    console.log(`Number of rows in the dataset: ${data.length}`);
    console.log(`Looking ahead by ${lookAheadDays} day(s)`);

    for (let i = 0; i < data.length - lookAheadDays; i++) {
        const day = data[i];
        const futureDay = data[i + lookAheadDays];

        const closeToday = parseFloat(day['Close/Last']?.replace(/[$,]/g, '') || 'NaN');
        const closeFuture = parseFloat(futureDay['Close/Last']?.replace(/[$,]/g, '') || 'NaN');

        if (isNaN(closeToday) || isNaN(closeFuture) || closeToday <= 0) {
            console.warn(`Skipping invalid row at index ${i}`);
            continue;
        }

        // Assess buying opportunity
        if (cash > closeToday && shares === 0) {
            // Check the next few days for a strong upward trend
            let isUpwardTrend = true;
            for (let j = 1; j <= Math.min(maxHoldDays, data.length - i - 1); j++) {
                const futureClose = parseFloat(data[i + j]['Close/Last']?.replace(/[$,]/g, '') || 'NaN');
                if (futureClose < closeToday) {
                    isUpwardTrend = false;
                    break;
                }
            }

            if (isUpwardTrend) {
                const allocation = cash * tradeAllocation;
                const potentialShares = Math.floor(allocation / closeToday);
                const cost = potentialShares * closeToday;

                if (potentialShares > 0) {
                    shares = potentialShares;
                    buyPrice = closeToday;
                    cash -= cost;
                    holdCounter = 0; // Reset hold counter
                    console.log(`Bought ${shares} shares at $${closeToday.toFixed(2)} (Remaining Cash: $${cash.toFixed(2)})`);
                }
            }
        }

        // Assess selling opportunity
        if (shares > 0) {
            holdCounter++;
            const currentProfitMargin = (closeToday - buyPrice) / buyPrice;

            // Sell if profit threshold met or holding time exceeded
            if (currentProfitMargin >= profitThreshold || holdCounter >= maxHoldDays) {
                cash += shares * closeToday;
                console.log(
                    `Sold ${shares} shares at $${closeToday.toFixed(2)} after holding ${holdCounter} days (Profit Margin: ${(currentProfitMargin * 100).toFixed(2)}%)`
                );
                shares = 0; // Reset shares to 0 after selling
                holdCounter = 0; // Reset hold counter
            } else {
                console.log(
                    `Holding ${shares} shares: Current Price $${closeToday.toFixed(2)} (Buy Price: $${buyPrice.toFixed(2)}; Holding ${holdCounter} day(s))`
                );
            }
        }
    }

    // Final portfolio value
    const finalCapital = cash + shares * parseFloat(data[data.length - 1]['Close/Last']?.replace(/[$,]/g, '') || 0);
    console.log(`Final Portfolio Value: $${finalCapital.toFixed(2)}`);
    return finalCapital;
}
