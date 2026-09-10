import { readFile, mkdir, cp, writeFile, rm } from "node:fs/promises";
import { MARKETS, parseCSV } from "./data.js";
await rm(new URL("../dist/", import.meta.url), {
  recursive: true,
  force: true,
});
await mkdir(new URL("../dist/data/", import.meta.url), { recursive: true });
await cp(
  new URL("../web/", import.meta.url),
  new URL("../dist/", import.meta.url),
  { recursive: true },
);
const manifest = [];
for (const market of MARKETS) {
  const rows = parseCSV(
    await readFile(
      new URL(`../assets/${market.file}.csv`, import.meta.url),
      "utf8",
    ),
  );
  await writeFile(
    new URL(`../dist/data/${market.symbol}.json`, import.meta.url),
    JSON.stringify(rows),
  );
  manifest.push({
    ...market,
    count: rows.length,
    start: rows[0].date,
    end: rows.at(-1).date,
  });
}
await writeFile(
  new URL("../dist/data/markets.json", import.meta.url),
  JSON.stringify(manifest),
);
await writeFile(new URL("../dist/.nojekyll", import.meta.url), "");
console.log(
  `Built ${manifest.length} markets and ${manifest.reduce((sum, m) => sum + m.count, 0)} candles into dist/.`,
);
