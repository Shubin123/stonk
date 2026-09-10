import {
  MULTIPLIERS,
  startMines,
  revealMine,
  minePayout,
  collectMines,
  dropPlinko,
} from "./games.js";
import { svgNode } from "./chart.js";
export function setupArcade() {
  const $ = (id) => document.getElementById(id);
  let balance = 1000,
    round = null,
    dropping = false;
  const update = () => {
    $("credits").textContent = balance.toLocaleString("en-US");
    $("mine-start").disabled = round?.status === "active";
    $("mine-collect").disabled =
      round?.status !== "active" || !round?.revealed.length;
    $("mine-collect").textContent =
      round?.status === "active" && round.revealed.length
        ? `Collect ${minePayout(round)} credits`
        : "Collect";
    $("mine-stake").disabled = $("mine-count").disabled =
      round?.status === "active";
    $("drop").disabled = dropping;
    $("refill").disabled = dropping || round?.status === "active";
    $("mine-grid").replaceChildren(
      ...Array.from({ length: 25 }, (_, index) => {
        const button = document.createElement("button");
        const revealed = round?.revealed.includes(index),
          ended = round && round.status !== "active";
        const mine = round?.mines.includes(index) && (revealed || ended);
        button.textContent = mine ? "×" : revealed ? "◆" : "·";
        button.className = mine ? "mine" : revealed ? "revealed" : "";
        button.disabled = !round || round.status !== "active" || revealed;
        button.setAttribute(
          "aria-label",
          `Tile ${index + 1}${mine ? ", mine" : revealed ? ", gem" : ""}`,
        );
        button.onclick = () => {
          round = revealMine(round, index);
          if (round.status === "lost")
            $("mine-message").textContent =
              "Mine hit. Round over — try a fresh board.";
          else if (round.status === "won") collect();
          else
            $("mine-message").textContent =
              `${round.revealed.length} gems found. Collect now or keep exploring.`;
          update();
        };
        return button;
      }),
    );
  };
  function collect() {
    const result = collectMines(round);
    round = result.round;
    balance += result.payout;
    $("mine-message").textContent =
      `Collected ${result.payout} credits. Nicely played.`;
    update();
  }
  $("mine-start").onclick = () => {
    try {
      const result = startMines(
        balance,
        Number($("mine-stake").value),
        Number($("mine-count").value),
      );
      balance = result.balance;
      round = result.round;
      $("mine-message").textContent = "Round started. Reveal a tile.";
      update();
    } catch (error) {
      $("mine-message").textContent = error.message;
    }
  };
  $("mine-collect").onclick = collect;
  $("refill").onclick = () => {
    balance = 1000;
    round = null;
    $("mine-message").textContent = "Fresh credits. Choose your first move.";
    $("plinko-message").textContent =
      "Every bounce has an equal left or right chance.";
    update();
  };
  const board = $("plinko-board");
  for (let row = 0; row < 8; row++)
    for (let col = 0; col <= row; col++) {
      board.append(
        svgNode("circle", {
          cx: 250 + (col - row / 2) * 49,
          cy: 40 + row * 35,
          r: 4,
          fill: "#63755a",
        }),
      );
    }
  $("plinko-bins").replaceChildren(
    ...MULTIPLIERS.map((value) => {
      const span = document.createElement("span");
      span.textContent = `${value}×`;
      return span;
    }),
  );
  $("drop").onclick = async () => {
    try {
      const stake = Number($("plinko-stake").value),
        result = dropPlinko(balance, stake);
      balance -= stake;
      dropping = true;
      update();
      $("plinko-message").textContent = "Ball in play…";
      for (const bin of $("plinko-bins").children)
        bin.classList.remove("landed");
      const ball = svgNode("circle", {
        cx: 250,
        cy: 16,
        r: 8,
        fill: "#d7fc70",
      });
      board.append(ball);
      let rights = 0;
      for (let row = 0; row < result.path.length; row++) {
        rights += result.path[row];
        ball.setAttribute("cx", 250 + (rights - (row + 1) / 2) * 49);
        ball.setAttribute("cy", 60 + row * 35);
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
          await new Promise((resolve) => setTimeout(resolve, 100));
      }
      ball.remove();
      balance += result.payout;
      dropping = false;
      $("plinko-bins").children[result.bin].classList.add("landed");
      $("plinko-message").textContent =
        `Landed at ${result.multiplier}×. Returned ${result.payout} credits.`;
      update();
    } catch (error) {
      dropping = false;
      $("plinko-message").textContent = error.message;
      update();
    }
  };
  update();
}
