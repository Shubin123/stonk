import { test, expect } from "@playwright/test";
const ready = async (page) => {
  await page.goto("./");
  await expect(page.locator("#workspace")).toBeVisible();
};
test("loads on a project subpath with no errors, external dependencies, or horizontal overflow", async ({
  page,
}) => {
  const errors = [],
    failed = [],
    external = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => failed.push(request.url()));
  page.on("request", (request) => {
    if (
      !request
        .url()
        .startsWith(process.env.SITE_URL || "http://127.0.0.1:4173/")
    )
      external.push(request.url());
  });
  await ready(page);
  await expect(page.locator("#cash")).toHaveText("$10,000.00");
  await expect(page.locator("#chart")).toHaveAttribute(
    "aria-label",
    /1 revealed trading days/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
  expect(external).toEqual([]);
});
test("buy/sell validation, journal, and persistence survive reload", async ({
  page,
}) => {
  await ready(page);
  await page.locator("#quantity").fill("2");
  await page.locator("#buy").click();
  await expect(page.locator("#shares")).toHaveText("2");
  const cash = await page.locator("#cash").textContent();
  await page.locator("#quantity").fill("3");
  await page.locator("#sell").click();
  await expect(page.locator("#order-message")).toContainText(
    "Not enough shares",
  );
  await expect(page.locator("#cash")).toHaveText(cash);
  await page.locator("#quantity").fill("-1");
  await page.locator("#buy").click();
  await expect(page.locator("#order-message")).toContainText(
    "positive whole number",
  );
  await page.locator("#quantity").fill("1");
  await page.locator("#sell").click();
  await expect(page.locator("#shares")).toHaveText("1");
  await page.reload();
  await expect(page.locator("#workspace")).toBeVisible();
  await expect(page.locator("#shares")).toHaveText("1");
  await expect(page.locator("#order-count")).toHaveText("2 ORDERS");
  await expect(page.locator("#replay-status")).toHaveText("PAUSED");
});
test("play, pause, speed, history range, and final-day controls work", async ({
  page,
}) => {
  await ready(page);
  await page.clock.install();
  await page.locator("#play").click();
  await page.clock.runFor(1600);
  await page.locator("#play").click();
  await expect(page.locator("#day-count")).toContainText("Day 4 /");
  await page.locator("#speed").fill("20");
  await page.locator("#range").fill("10");
  await page.locator("#play").click();
  await page.clock.runFor(1100);
  await page.locator("#play").click();
  await expect(page.locator("#chart")).toHaveAttribute(
    "aria-label",
    /10 revealed trading days/,
  );
  const date = await page.locator("#date").textContent();
  await page.clock.runFor(1000);
  await expect(page.locator("#date")).toHaveText(date);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("stonk.market.v2"));
    state.sessions.INTC.index = 2515;
    localStorage.setItem("stonk.market.v2", JSON.stringify(state));
  });
  await page.reload();
  await expect(page.locator("#workspace")).toBeVisible();
  await page.locator("#step").click();
  await expect(page.locator("#replay-status")).toHaveText("REPLAY COMPLETE");
  await expect(page.locator("#play")).toBeDisabled();
  await expect(page.locator("#step")).toBeDisabled();
  await page.reload();
  await expect(page.locator("#replay-status")).toHaveText("REPLAY COMPLETE");
});
test("market switching isolates portfolios; reset is explicit and scoped", async ({
  page,
}) => {
  await ready(page);
  await page.locator("#buy").click();
  await page.locator("#step").click();
  const intelDate = await page.locator("#date").textContent();
  await page.getByRole("button", { name: "Apple AAPL" }).click();
  await expect(page.locator("#symbol")).toHaveText("AAPL");
  await expect(page.locator("#shares")).toHaveText("0");
  await page.locator("#quantity").fill("3");
  await page.locator("#buy").click();
  await page.getByRole("button", { name: "Intel INTC" }).click();
  await expect(page.locator("#shares")).toHaveText("1");
  await expect(page.locator("#date")).toHaveText(intelDate);
  await page.locator("#reset").click();
  await page.locator("#cancel-reset").click();
  await expect(page.locator("#shares")).toHaveText("1");
  await page.locator("#reset").click();
  await page.locator("#confirm-reset").click();
  await expect(page.locator("#shares")).toHaveText("0");
  await expect(page.locator("#day-count")).toContainText("Day 1 /");
  await page.getByRole("button", { name: "Apple AAPL" }).click();
  await expect(page.locator("#shares")).toHaveText("3");
});
test("corrupt or blocked storage leaves the app usable with feedback", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("stonk.market.v2", "{bad"),
  );
  await ready(page);
  await expect(page.locator("#order-message")).toContainText(
    "could not be read",
  );
  await page.locator("#buy").click();
  await expect(page.locator("#shares")).toHaveText("1");
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  await page.reload();
  await expect(page.locator("#workspace")).toBeVisible();
  await page.locator("#buy").click();
  await expect(page.locator("#save-status")).toContainText(
    "Storage unavailable",
  );
});
test("market fetch failure offers a working retry", async ({ page }) => {
  let fail = true;
  await page.route("**/data/INTC.json", (route) =>
    fail
      ? route.fulfill({ status: 503, body: "unavailable" })
      : route.continue(),
  );
  await page.goto("./");
  await expect(page.locator("#load-error")).toContainText("503");
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator("#workspace")).toBeVisible();
});
test("all six markets load and reveal the current date", async ({ page }) => {
  await ready(page);
  for (const symbol of ["AAPL", "NVDA", "AMZN", "TSLA", "IBM", "INTC"]) {
    await page.locator(`[data-symbol="${symbol}"]`).click();
    await expect(page.locator("#symbol")).toHaveText(symbol);
    await page.locator("#step").click();
    await expect(page.locator("#chart")).toHaveAttribute(
      "aria-label",
      /2 revealed trading days/,
    );
  }
});
test("Mines and Plinko settle once without touching the trading portfolio", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(() => {
    Math.random = () => 0;
  });
  await page.locator("#arcade-tab").click();
  await page.locator("#mine-start").click();
  await expect(page.locator("#credits")).toHaveText("990");
  await expect(page.locator("#mine-start")).toBeDisabled();
  await expect(page.locator("#refill")).toBeDisabled();
  await page.getByRole("button", { name: "Tile 1", exact: true }).click();
  await page.locator("#mine-collect").click();
  await expect(page.locator("#credits")).toHaveText("1,001");
  await expect(page.locator("#mine-collect")).toBeDisabled();
  await page.locator("#drop").click();
  await expect(page.locator("#plinko-message")).toContainText(
    "Returned 50 credits",
  );
  await expect(page.locator("#credits")).toHaveText("1,041");
  await page.locator("#market-tab").click();
  await expect(page.locator("#cash")).toHaveText("$10,000.00");
  await page.locator("#arcade-tab").click();
  await page.locator("#mine-start").click();
  await page.getByRole("button", { name: "Tile 2", exact: true }).click();
  await expect(page.locator("#mine-message")).toContainText("Mine hit");
  await expect(page.locator("#mine-collect")).toBeDisabled();
});
test("a change in another tab pauses playback and prevents overwriting its save", async ({
  page,
  context,
}) => {
  await ready(page);
  const other = await context.newPage();
  await ready(other);
  await other.locator("#buy").click();
  await expect(page.locator("#save-status")).toContainText("Another tab");
  await page.locator("#buy").click();
  await expect(page.locator("#save-status")).toContainText("Another tab");
  await other.reload();
  await expect(other.locator("#shares")).toHaveText("1");
});
