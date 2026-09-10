import test from "node:test";
import assert from "node:assert/strict";
import {
  MULTIPLIERS,
  startMines,
  minePayout,
  revealMine,
  collectMines,
  dropPlinko,
} from "../web/games.js";
test("Mines creates unique mines, debits exactly once, and accepts all supported counts", () => {
  for (let count = 1; count <= 24; count++) {
    const result = startMines(1000, 10, count, () => 0);
    assert.equal(result.balance, 990);
    assert.equal(new Set(result.round.mines).size, count);
  }
});
test("invalid game stakes and mine counts are rejected", () => {
  for (const stake of [-1, 0, 1.5, 1001, Infinity, NaN]) {
    assert.throws(() => startMines(1000, stake, 3));
    assert.throws(() => dropPlinko(1000, stake));
  }
  for (const count of [0, 25, 1.5, NaN])
    assert.throws(() => startMines(1000, 10, count));
});
test("Mines payout is inverse cumulative survival probability", () => {
  let round = { stake: 100, mines: [0, 1, 2], revealed: [], status: "active" };
  assert.equal(minePayout(round), 0);
  assert.throws(() => collectMines(round));
  round = revealMine(round, 3);
  round = revealMine(round, 4);
  assert.equal(
    minePayout(round),
    Math.floor((100 * 0.97) / ((22 / 25) * (21 / 24))),
  );
  assert.equal(revealMine(round, 4), round);
  const collected = collectMines(round);
  assert.equal(collected.round.status, "collected");
  assert.throws(() => collectMines(collected.round));
  assert.throws(() => revealMine(collected.round, 5));
});
test("mine loss yields no payout and revealing all safe cells can be collected once", () => {
  const initial = { stake: 10, mines: [0], revealed: [], status: "active" };
  const lost = revealMine(initial, 0);
  assert.equal(lost.status, "lost");
  assert.equal(minePayout(lost), 0);
  assert.throws(() => collectMines(lost));
  let round = initial;
  for (let i = 1; i < 25; i++) round = revealMine(round, i);
  assert.equal(round.status, "won");
  assert.ok(collectMines(round).payout > 0);
});
test("Plinko maps all 256 paths to binomial bins and settles advertised payouts", () => {
  const counts = Array(9).fill(0);
  for (let bits = 0; bits < 256; bits++) {
    let index = 0;
    const result = dropPlinko(1000, 100, () =>
      (bits >> index++) & 1 ? 0.75 : 0.25,
    );
    counts[result.bin]++;
    assert.equal(result.payout, Math.floor(100 * MULTIPLIERS[result.bin]));
    assert.equal(result.balance, 900 + result.payout);
    assert.equal(result.path.length, 8);
  }
  assert.deepEqual(counts, [1, 8, 28, 56, 70, 56, 28, 8, 1]);
});
test("invalid randomness is rejected without hanging", () => {
  for (const value of [-1, 1, NaN]) {
    assert.throws(() => startMines(1000, 10, 3, () => value));
    assert.throws(() => dropPlinko(1000, 10, () => value));
  }
});
