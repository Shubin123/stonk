import {
  INITIAL_CASH,
  STRATEGIES,
  createSession,
  advance,
  placeOrder,
  visibleRows,
  equity,
  toCents,
  serializeSession,
  restoreSession,
} from "./market.js";
import { STORAGE_KEY, load, save } from "./storage.js";
import { drawChart } from "./chart.js";
import { setupArcade } from "./arcade.js";
const $ = (id) => document.getElementById(id);
const money = (cents) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
const dateLabel = (date) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = null;
}
const loaded = load(storage);
let state = loaded.state,
  markets,
  data,
  session,
  timer = null,
  symbol,
  requestId = 0;
const cache = new Map();
let storageConflict = false;
function persist() {
  if (storageConflict) {
    $("save-status").textContent =
      "Another tab changed this save. Reload to continue saving.";
    return;
  }
  state.selected = symbol;
  state.sessions[symbol] = serializeSession(session);
  $("save-status").textContent = save(storage, state)
    ? "Saved on this device"
    : "Storage unavailable — progress lasts until this page closes";
}
function message(text, error = false) {
  $("order-message").textContent = text;
  $("order-message").classList.toggle("error", error);
}
function pause() {
  clearInterval(timer);
  timer = null;
  $("play").textContent = "▶ Play";
  $("replay-status").textContent =
    data && session?.index === data.length - 1 ? "REPLAY COMPLETE" : "PAUSED";
}
function tick() {
  session = advance(session, data);
  if (session.index === data.length - 1) pause();
  render();
  persist();
}
function play() {
  if (timer) return pause();
  if (session.index === data.length - 1) return;
  $("play").textContent = "Ⅱ Pause";
  $("replay-status").textContent = "PLAYING";
  timer = setInterval(tick, 1000 / state.speed);
}
async function fetchJSON(path) {
  const response = await fetch(new URL(path, import.meta.url));
  if (!response.ok)
    throw new Error(`Could not load market data (${response.status}).`);
  return response.json();
}
async function selectMarket(next) {
  pause();
  if (session) persist();
  const request = ++requestId;
  $("loading").hidden = false;
  $("workspace").hidden = true;
  $("load-error").hidden = true;
  try {
    const rows = cache.get(next) || (await fetchJSON(`./data/${next}.json`));
    if (request !== requestId) return;
    cache.set(next, rows);
    symbol = next;
    data = rows;
    let warning = loaded.warning;
    loaded.warning = "";
    try {
      session = state.sessions[symbol]
        ? restoreSession(state.sessions[symbol], data)
        : createSession(data);
    } catch {
      session = createSession(data);
      warning = "This market’s saved replay was invalid and has been reset.";
    }
    $("speed").value = state.speed;
    $("range").value = state.range;
    $("workspace").hidden = false;
    $("loading").hidden = true;
    render();
    pause();
    persist();
    message(warning || "Orders fill at the current close.", Boolean(warning));
  } catch (error) {
    if (request !== requestId) return;
    $("loading").hidden = true;
    $("load-error").hidden = false;
    $("load-error").replaceChildren(
      document.createTextNode(`${error.message} `),
    );
    const retry = document.createElement("button");
    retry.textContent = "Retry";
    retry.onclick = () => selectMarket(next);
    $("load-error").append(retry);
  }
}
function render() {
  const row = data[session.index],
    market = markets.find((m) => m.symbol === symbol);
  $("symbol").textContent = symbol;
  $("company").textContent = market.name;
  $("price").textContent = money(toCents(row.close));
  const previous = data[Math.max(0, session.index - 1)].close;
  const change = ((row.close - previous) / previous) * 100;
  $("change").textContent =
    `${change >= 0 ? "+" : ""}${change.toFixed(2)}% today`;
  $("change").className = change >= 0 ? "positive" : "negative";
  $("date").textContent = dateLabel(row.date);
  $("day-count").textContent = `Day ${session.index + 1} / ${data.length}`;
  $("progress").max = data.length;
  $("progress").value = session.index + 1;
  $("play").disabled = $("step").disabled = session.index === data.length - 1;
  $("speed-value").textContent = `${state.speed} days/s`;
  $("range-value").textContent = `${state.range} days`;
  drawChart($("chart"), visibleRows(session, data, state.range));
  const value = equity(session.player, row.close),
    profit = value - INITIAL_CASH;
  $("equity").textContent = money(value);
  $("cash").textContent = money(session.player.cash);
  $("shares").textContent = session.player.shares.toLocaleString("en-US");
  $("return").textContent =
    `${profit >= 0 ? "+" : "−"}${money(Math.abs(profit))} (${((profit / INITIAL_CASH) * 100).toFixed(2)}%)`;
  $("return").className = profit >= 0 ? "positive" : "negative";
  estimate();
  for (const button of $("markets").children) {
    const active = button.dataset.symbol === symbol;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active);
  }
  const ranking = [
    {
      id: "you",
      name: "You",
      description: "Your calls. Your pace.",
      ...session.player,
    },
    ...STRATEGIES.map((bot) => ({ ...bot, ...session.bots[bot.id] })),
  ].sort((a, b) => equity(b, row.close) - equity(a, row.close));
  $("leaderboard").replaceChildren(
    ...ranking.map((bot, index) => {
      const element = document.createElement("div");
      element.className = `bot-row ${bot.id === "you" ? "you" : ""}`;
      const value = equity(bot, row.close),
        change = ((value - INITIAL_CASH) / INITIAL_CASH) * 100;
      // All strings interpolated here are fixed application labels or numeric calculations.
      element.innerHTML = `<span class="bot-rank">0${index + 1}</span><div><div class="bot-name">${bot.name}</div><div class="bot-desc">${bot.description}${bot.id === "you" ? "" : ` · ${bot.trades} orders`}</div></div><div class="bot-value">${money(value)}<small class="${change >= 0 ? "positive" : "negative"}">${change >= 0 ? "+" : ""}${change.toFixed(2)}%</small></div>`;
      return element;
    }),
  );
  $("order-count").textContent = `${session.orders.length} ORDERS`;
  if (!session.orders.length)
    $("orders").innerHTML =
      '<div class="empty-state"><span>↗</span>Your next move starts here.<p>Buy your first share to open the journal.</p></div>';
  else
    $("orders").replaceChildren(
      ...session.orders
        .slice(-100)
        .reverse()
        .map((order) => {
          const element = document.createElement("div");
          element.className = "order-row";
          element.innerHTML = `<div class="${order.side === "buy" ? "positive" : ""}">${order.side === "buy" ? "↗ Bought" : "↙ Sold"} ${order.quantity}<small>${dateLabel(data[order.index].date)}</small></div><div>${symbol}<small>${money(toCents(data[order.index].close))} / share</small></div><strong>${money(order.quantity * toCents(data[order.index].close))}</strong>`;
          return element;
        }),
    );
}
function estimate() {
  const quantity = Number($("quantity").value);
  $("estimate").textContent =
    Number.isSafeInteger(quantity) &&
    quantity > 0 &&
    Number.isSafeInteger(quantity * toCents(data[session.index].close))
      ? money(quantity * toCents(data[session.index].close))
      : "—";
}
for (const side of ["buy", "sell"])
  $(side).onclick = () => {
    try {
      if (session.orders.length >= 10000)
        throw new Error(
          "Journal is full. Reset this market to start a new session.",
        );
      session = placeOrder(session, data, side, Number($("quantity").value));
      message(
        `${side === "buy" ? "Bought" : "Sold"} ${$("quantity").value} ${symbol} at ${money(toCents(data[session.index].close))}.`,
      );
      render();
      persist();
    } catch (error) {
      message(error.message, true);
    }
  };
$("quantity").oninput = () => {
  if (session) estimate();
};
$("max").onclick = () => {
  $("quantity").value = Math.floor(
    session.player.cash / toCents(data[session.index].close),
  );
  estimate();
};
$("play").onclick = play;
$("step").onclick = () => {
  pause();
  tick();
};
$("speed").oninput = () => {
  state.speed = Number($("speed").value);
  if (timer) {
    pause();
    play();
  }
  render();
  persist();
};
$("range").oninput = () => {
  state.range = Number($("range").value);
  render();
  persist();
};
$("reset").onclick = () => {
  pause();
  $("reset-dialog").showModal();
};
$("cancel-reset").onclick = () => $("reset-dialog").close();
$("confirm-reset").onclick = () => {
  session = createSession(data);
  $("reset-dialog").close();
  pause();
  render();
  persist();
  message("Fresh start. $10,000 and a world of possibilities.");
};
for (const tab of ["market", "arcade"])
  $(`${tab}-tab`).onclick = () => {
    pause();
    for (const name of ["market", "arcade"]) {
      $(`${name}-view`).hidden = name !== tab;
      $(`${name}-tab`).classList.toggle("active", name === tab);
      $(`${name}-tab`).setAttribute("aria-pressed", name === tab);
    }
  };
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY || event.key === null) {
    pause();
    storageConflict = true;
    $("save-status").textContent =
      "Another tab changed this save. Reload to continue saving.";
  }
});
setupArcade();
window.addEventListener("resize", () => {
  if (session && !$("market-view").hidden) {
    drawChart($("chart"), visibleRows(session, data, state.range));
  }
});
async function init() {
  try {
    markets = await fetchJSON("./data/markets.json");
    $("markets").replaceChildren(
      ...markets.map((market) => {
        const button = document.createElement("button");
        button.className = "market-button";
        button.dataset.symbol = market.symbol;
        button.innerHTML = `<span class="ticker-icon">${market.symbol[0]}</span><span><strong>${market.symbol}</strong><small>${market.name}</small></span>`;
        button.setAttribute("aria-label", `${market.name} ${market.symbol}`);
        button.onclick = () => selectMarket(market.symbol);
        return button;
      }),
    );
    await selectMarket(
      markets.some((m) => m.symbol === state.selected)
        ? state.selected
        : "INTC",
    );
  } catch (error) {
    $("loading").hidden = true;
    $("load-error").hidden = false;
    $("load-error").replaceChildren(
      document.createTextNode(`${error.message} `),
    );
    const retry = document.createElement("button");
    retry.textContent = "Retry";
    retry.onclick = init;
    $("load-error").append(retry);
  }
}
init();
