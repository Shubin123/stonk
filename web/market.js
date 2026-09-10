export const INITIAL_CASH = 1_000_000;
export const STRATEGIES = [
  {
    id: "hold",
    name: "Buy & hold",
    description: "Buys at the first close and holds.",
  },
  {
    id: "trend",
    name: "Trend follower",
    description:
      "5 / 20 day averages. Signals use the previous close; orders fill at the next open.",
  },
  {
    id: "dip",
    name: "Dip buyer",
    description:
      "Buys 3% below the 20 day average; exits at the average or a 10% loss from entry. Fills at the next open.",
  },
];
export const toCents = (value) => Math.round(value * 100);
export const account = () => ({ cash: INITIAL_CASH, shares: 0 });
export const equity = (portfolio, price) =>
  portfolio.cash + portfolio.shares * toCents(price);

// Return a new account only after every precondition passes.
export function trade(portfolio, side, quantity, price) {
  const cents = toCents(price);
  if (!["buy", "sell"].includes(side)) throw new Error("Choose buy or sell.");
  if (!Number.isSafeInteger(quantity) || quantity < 1)
    throw new Error("Enter a positive whole number of shares.");
  if (!Number.isFinite(price) || cents < 1 || !Number.isSafeInteger(cents))
    throw new Error("Invalid share price.");
  const total = quantity * cents;
  if (!Number.isSafeInteger(total)) throw new Error("Order is too large.");
  if (side === "buy" && total > portfolio.cash)
    throw new Error("Not enough cash for this order.");
  if (side === "sell" && quantity > portfolio.shares)
    throw new Error("Not enough shares to sell.");
  const cash = portfolio.cash + (side === "buy" ? -total : total);
  const shares = portfolio.shares + (side === "buy" ? quantity : -quantity);
  if (!Number.isSafeInteger(cash) || !Number.isSafeInteger(shares))
    throw new Error("Account limit exceeded.");
  return { cash, shares };
}

export function createSession(data) {
  if (!data.length) throw new Error("Market data is empty.");
  const bots = Object.fromEntries(
    STRATEGIES.map(({ id }) => [id, { ...account(), entry: 0, trades: 0 }]),
  );
  const quantity = Math.floor(INITIAL_CASH / toCents(data[0].close));
  if (quantity)
    bots.hold = {
      ...trade(bots.hold, "buy", quantity, data[0].close),
      entry: data[0].close,
      trades: 1,
    };
  return { index: 0, player: account(), orders: [], bots };
}

function botStep(bot, id, history, open) {
  if (history.length < 20) return bot;
  const average = (size) =>
    history.slice(-size).reduce((sum, row) => sum + row.close, 0) / size;
  const long = average(20),
    last = history.at(-1).close;
  const buy = id === "trend" ? average(5) > long : last < long * 0.97;
  const sell =
    id === "trend"
      ? average(5) < long
      : last >= long || last <= bot.entry * 0.9;
  const side = bot.shares ? (sell ? "sell" : null) : buy ? "buy" : null;
  const quantity =
    side === "buy" ? Math.floor(bot.cash / toCents(open)) : bot.shares;
  if (!side || !quantity) return bot;
  return {
    ...trade(bot, side, quantity, open),
    entry: side === "buy" ? open : 0,
    trades: bot.trades + 1,
  };
}

export function advance(session, data) {
  if (session.index >= data.length - 1) return session;
  const index = session.index + 1;
  // The signal function is never given a future candle or today's close.
  const history = data.slice(Math.max(0, index - 20), index);
  const bots = { ...session.bots };
  for (const id of ["trend", "dip"])
    bots[id] = botStep(bots[id], id, history, data[index].open);
  return { ...session, index, bots };
}

export function placeOrder(session, data, side, quantity) {
  const price = data[session.index].close;
  return {
    ...session,
    player: trade(session.player, side, quantity, price),
    orders: [...session.orders, { index: session.index, side, quantity }],
  };
}

export function visibleRows(session, data, range) {
  return data.slice(Math.max(0, session.index - range + 1), session.index + 1);
}

// Save only decisions, then reconstruct balances and bots from trusted market data.
export function serializeSession(session) {
  return { index: session.index, orders: session.orders };
}
export function restoreSession(saved, data) {
  if (
    !saved ||
    !Number.isInteger(saved.index) ||
    saved.index < 0 ||
    saved.index >= data.length ||
    !Array.isArray(saved.orders) ||
    saved.orders.length > 10000
  )
    throw new Error("Invalid saved replay.");
  let previous = 0;
  for (const order of saved.orders) {
    if (
      !order ||
      !Number.isInteger(order.index) ||
      order.index < previous ||
      order.index > saved.index
    )
      throw new Error("Invalid saved order.");
    previous = order.index;
  }
  let session = createSession(data),
    nextOrder = 0;
  for (let index = 0; index <= saved.index; index++) {
    if (index) session = advance(session, data);
    while (saved.orders[nextOrder]?.index === index) {
      const order = saved.orders[nextOrder++];
      session = placeOrder(session, data, order.side, order.quantity);
    }
  }
  return session;
}
