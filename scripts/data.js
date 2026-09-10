export const MARKETS = [
  { symbol: "INTC", name: "Intel", file: "INTEL", sector: "Semiconductors" },
  { symbol: "AAPL", name: "Apple", file: "APPLE", sector: "Technology" },
  { symbol: "NVDA", name: "NVIDIA", file: "NVIDIA", sector: "Semiconductors" },
  {
    symbol: "AMZN",
    name: "Amazon",
    file: "AMAZON",
    sector: "Consumer technology",
  },
  { symbol: "TSLA", name: "Tesla", file: "TESLA", sector: "Automotive" },
  { symbol: "IBM", name: "IBM", file: "IBM", sector: "Enterprise technology" },
];
// The bundled Nasdaq exports contain six columns, optionally quoted (including commas).
export function parseCSV(text) {
  const lines = text
    .trim()
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/);
  const fields = (line) => {
    const matches = line.match(/("(?:[^"]|"")*"|[^,]*)(,|$)/g) || [];
    if (matches.at(-1) === "") matches.pop();
    return matches.map((value) =>
      value.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"').trim(),
    );
  };
  if (
    fields(lines.shift()).join(",") !== "Date,Close/Last,Volume,Open,High,Low"
  )
    throw new Error("Unexpected CSV header.");
  const seen = new Set();
  const rows = lines.map((line, index) => {
    const values = fields(line);
    if (values.length !== 6) throw new Error(`Invalid CSV row ${index + 2}.`);
    const [rawDate, ...numbers] = values;
    const match = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) throw new Error("Invalid market date.");
    const date = `${match[3]}-${match[1]}-${match[2]}`;
    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (
      !Number.isFinite(+parsedDate) ||
      parsedDate.toISOString().slice(0, 10) !== date ||
      seen.has(date)
    )
      throw new Error("Invalid or duplicate market date.");
    seen.add(date);
    const [close, volume, open, high, low] = numbers.map((value) =>
      Number(value.replace(/[$,]/g, "")),
    );
    if (
      ![close, open, high, low].every(
        (value) => Number.isFinite(value) && value > 0,
      ) ||
      !Number.isSafeInteger(volume) ||
      volume < 0 ||
      high < low
    )
      throw new Error("Invalid market values.");
    return { date, close, volume, open, high, low };
  });
  if (!rows.length) throw new Error("No market rows.");
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}
