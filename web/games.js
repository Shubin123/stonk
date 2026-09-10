export const MULTIPLIERS = [5, 2, 1.2, 0.8, 0.5, 0.8, 1.2, 2, 5];
function randomUnit(rng) {
  const value = rng();
  if (!Number.isFinite(value) || value < 0 || value >= 1)
    throw new Error("Invalid random source.");
  return value;
}
export function validateStake(balance, stake) {
  if (!Number.isSafeInteger(stake) || stake < 1 || stake > balance)
    throw new Error("Enter a whole-number stake within your credit balance.");
}
export function startMines(balance, stake, count, rng = Math.random) {
  validateStake(balance, stake);
  if (!Number.isInteger(count) || count < 1 || count > 24)
    throw new Error("Choose between 1 and 24 mines.");
  const cells = Array.from({ length: 25 }, (_, i) => i);
  // Bounded shuffle: even a constant random source cannot hang the game.
  for (let i = 24; i > 0; i--) {
    const j = Math.floor(randomUnit(rng) * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return {
    balance: balance - stake,
    round: {
      stake,
      mines: cells.slice(0, count),
      revealed: [],
      status: "active",
    },
  };
}
export function minePayout(round) {
  if (!round.revealed.length || round.status === "lost") return 0;
  let probability = 1;
  for (let i = 0; i < round.revealed.length; i++)
    probability *= (25 - round.mines.length - i) / (25 - i);
  return Math.floor((round.stake * 0.97) / probability);
}
export function revealMine(round, index) {
  if (round.status !== "active") throw new Error("Start a new round first.");
  if (!Number.isInteger(index) || index < 0 || index >= 25)
    throw new Error("Invalid tile.");
  if (round.revealed.includes(index)) return round;
  const revealed = [...round.revealed, index];
  const status = round.mines.includes(index)
    ? "lost"
    : revealed.length === 25 - round.mines.length
      ? "won"
      : "active";
  return { ...round, revealed, status };
}
export function collectMines(round) {
  if (!["active", "won"].includes(round.status) || !round.revealed.length)
    throw new Error("Reveal a safe tile before collecting.");
  return {
    payout: minePayout(round),
    round: { ...round, status: "collected" },
  };
}
export function dropPlinko(balance, stake, rng = Math.random) {
  validateStake(balance, stake);
  const path = Array.from({ length: 8 }, () => (randomUnit(rng) < 0.5 ? 0 : 1));
  const bin = path.reduce((sum, value) => sum + value, 0);
  const payout = Math.floor(stake * MULTIPLIERS[bin]);
  return {
    balance: balance - stake + payout,
    path,
    bin,
    payout,
    multiplier: MULTIPLIERS[bin],
  };
}
