import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { MARKETS, parseCSV } from "../scripts/data.js";
import {
  account,
  trade,
  equity,
  createSession,
  advance,
  placeOrder,
  restoreSession,
  serializeSession,
  visibleRows,
} from "../web/market.js";
import { load, save, STORAGE_KEY } from "../web/storage.js";
const candles = (prices) =>
  prices.map((close, index) => ({
    date: `2024-01-${String(index + 1).padStart(2, "0")}`,
    open: close,
    close,
    low: close - 1,
    high: close + 1,
    volume: 100,
  }));
const run = (data) => {
  let session = createSession(data);
  for (let i = 1; i < data.length; i++) session = advance(session, data);
  return session;
};
test("buy and sell settle cash and shares atomically in cents", () => {
  const original = account();
  const bought = trade(original, "buy", 3, 12.345);
  assert.deepEqual(bought, { cash: 996295, shares: 3 });
  assert.deepEqual(original, account());
  const sold = trade(bought, "sell", 2, 15.12);
  assert.deepEqual(sold, { cash: 999319, shares: 1 });
  assert.equal(equity(sold, 15.12), 1000831);
});
for (const quantity of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
  test(`reject invalid quantity ${quantity}`, () => {
    assert.throws(() => trade(account(), "buy", quantity, 10));
  });
for (const price of [0, -1, NaN, Infinity, 0.00001])
  test(`reject invalid price ${price}`, () => {
    assert.throws(() => trade(account(), "buy", 1, price));
  });
test("overspending, overselling and unknown operations leave account unchanged", () => {
  const initial = account();
  assert.throws(() => trade(initial, "buy", 1001, 10), /cash/);
  assert.throws(() => trade(initial, "sell", 1, 10), /shares/);
  assert.throws(() => trade(initial, "steal", 1, 10));
  assert.deepEqual(initial, account());
  assert.equal(trade(initial, "buy", 1000, 10).cash, 0);
});
test("history never includes future days, including near either boundary", () => {
  const data = candles([10, 11, 12, 13]);
  const session = advance(createSession(data), data);
  assert.deepEqual(visibleRows(session, data, 60), data.slice(0, 2));
  assert.deepEqual(visibleRows(session, data, 1), [data[1]]);
  const final = run(data);
  assert.deepEqual(visibleRows(final, data, 2), data.slice(-2));
  assert.equal(advance(final, data), final);
});
test("trend bot waits for 20 closes and fills at next open, never next close", () => {
  const data = candles(Array.from({ length: 22 }, (_, i) => 10 + i));
  data[20].open = 40;
  data[20].close = 1000;
  let session = createSession(data);
  for (let i = 1; i < 20; i++) session = advance(session, data);
  assert.equal(session.bots.trend.shares, 0);
  session = advance(session, data);
  assert.equal(session.bots.trend.shares, 250);
  assert.equal(session.bots.trend.cash, 0);
  assert.equal(session.bots.trend.entry, 40);
});
test("changing any future candles cannot change current bot decisions", () => {
  const data = candles(
    Array.from({ length: 60 }, (_, i) => 50 + Math.sin(i) * 5),
  );
  const changed = data.map((row, i) =>
    i < 31 ? row : { ...row, close: 99999, open: 99999 },
  );
  let a = createSession(data),
    b = createSession(changed);
  for (let i = 1; i <= 30; i++) {
    a = advance(a, data);
    b = advance(b, changed);
    assert.deepEqual(a, b);
  }
});
test("dip strategy buys on a past dip, then stops out relative to its entry", () => {
  const data = candles([...Array(19).fill(100), 90, 79, 80]);
  data[20].open = 90;
  const atEntry = run(data.slice(0, 21));
  assert.equal(atEntry.bots.dip.shares, 111);
  assert.equal(atEntry.bots.dip.entry, 90);
  const exit = advance(atEntry, data);
  assert.equal(exit.bots.dip.shares, 0);
  assert.equal(exit.bots.dip.cash, 889000);
  assert.equal(exit.bots.dip.trades, 2);
});
test("save replay restores decisions, cash, holdings, index and all bots", () => {
  const data = candles(Array.from({ length: 50 }, (_, i) => 30 + i));
  let session = placeOrder(createSession(data), data, "buy", 10);
  for (let i = 0; i < 30; i++) session = advance(session, data);
  session = placeOrder(session, data, "sell", 3);
  const saved = JSON.parse(JSON.stringify(serializeSession(session)));
  assert.deepEqual(restoreSession(saved, data), session);
  assert.deepEqual(
    restoreSession({ ...saved, player: { cash: 99999999, shares: 999 } }, data),
    session,
  );
});
test("invalid saved orders, chronology, and replay bounds are rejected", () => {
  const data = candles([10, 20, 30]);
  for (const saved of [
    null,
    { index: -1, orders: [] },
    { index: 3, orders: [] },
    { index: 1, orders: null },
    { index: 1, orders: [{ index: 2, side: "buy", quantity: 1 }] },
    {
      index: 1,
      orders: [
        { index: 1, side: "buy", quantity: 1 },
        { index: 0, side: "buy", quantity: 1 },
      ],
    },
    { index: 1, orders: [{ index: 0, side: "sell", quantity: 1 }] },
    { index: 1, orders: [null] },
  ])
    assert.throws(() => restoreSession(saved, data));
});
test("storage recovers from malformed data and denied browser storage", () => {
  const denied = {
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
  };
  assert.equal(load(denied).state.speed, 2);
  assert.ok(load(denied).warning);
  assert.equal(save(denied, {}), false);
  assert.ok(load({ getItem: () => "{broken" }).warning);
  assert.ok(load({ getItem: () => '{"version":2,"sessions":null}' }).warning);
  const recovered = load({
    getItem: () =>
      JSON.stringify({ version: 2, sessions: {}, speed: 99, range: -1 }),
  });
  assert.equal(recovered.state.speed, 2);
  assert.equal(recovered.state.range, 60);
  let item;
  assert.equal(
    save(
      {
        setItem(key, value) {
          assert.equal(key, STORAGE_KEY);
          item = value;
        },
      },
      recovered.state,
    ),
    true,
  );
  assert.deepEqual(load({ getItem: () => item }).state, recovered.state);
});
test("CSV parsing preserves decimal digits, quoted thousands, and chronological order", () => {
  const csv =
    'Date,Close/Last,Volume,Open,High,Low\r\n12/19/2024,$19.06,69117810,$19.53,$19.69,$19.03\r\n12/18/2024,"$1,234.5678","1,200",$1200,$1300,$1100';
  const rows = parseCSV(csv);
  assert.equal(rows[1].close, 19.06);
  assert.equal(rows[0].close, 1234.5678);
  assert.equal(rows[0].volume, 1200);
  assert.equal(rows[0].date, "2024-12-18");
});
test("CSV rejects bad headers, impossible dates, duplicates and malformed prices", () => {
  const header = "Date,Close/Last,Volume,Open,High,Low\n";
  for (const content of [
    "",
    header,
    "Wrong,Header",
    header + "02/30/2024,10,1,10,11,9",
    header + "01/01/2024,NaN,1,10,11,9",
    header + "01/01/2024,10,1,10,11,9\n01/01/2024,10,1,10,11,9",
  ])
    assert.throws(() => parseCSV(content));
});
for (const market of MARKETS)
  test(`${market.symbol}: full bundled history parses and bots preserve account invariants`, async () => {
    const data = parseCSV(
      await readFile(
        new URL(`../assets/${market.file}.csv`, import.meta.url),
        "utf8",
      ),
    );
    assert.ok(data.length > 2000);
    assert.ok(data.every((row, i) => !i || row.date > data[i - 1].date));
    let session = createSession(data);
    for (let i = 1; i < data.length; i++) {
      session = advance(session, data);
      for (const bot of Object.values(session.bots)) {
        assert.ok(Number.isSafeInteger(bot.cash) && bot.cash >= 0);
        assert.ok(Number.isSafeInteger(bot.shares) && bot.shares >= 0);
      }
    }
    assert.equal(session.index, data.length - 1);
    assert.deepEqual(restoreSession(serializeSession(session), data), session);
  });
