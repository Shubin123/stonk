const NS = "http://www.w3.org/2000/svg";
export function svgNode(tag, attributes, text) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes))
    node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}
export function drawChart(svg, rows) {
  svg.replaceChildren();
  const width = svg.clientWidth < 480 ? 400 : 800;
  svg.setAttribute("viewBox", `0 0 ${width} 300`);
  const left = 12,
    right = width - 79,
    top = 20,
    bottom = 263;
  let min = Math.min(...rows.map((row) => row.low)),
    max = Math.max(
      ...rows.map((row) => Math.max(row.open, row.close, row.low)),
    );
  const pad = (max - min) * 0.15 || max * 0.04;
  min -= pad;
  max += pad;
  const x = (i) =>
    rows.length === 1 ? right : left + (i / (rows.length - 1)) * (right - left);
  const y = (price) => bottom - ((price - min) / (max - min)) * (bottom - top);
  for (let i = 0; i < 5; i++) {
    const value = min + ((max - min) * i) / 4,
      pos = y(value);
    svg.append(
      svgNode("line", {
        x1: left,
        x2: right,
        y1: pos,
        y2: pos,
        stroke: "#2b3730",
        "stroke-dasharray": "3 5",
      }),
    );
    svg.append(
      svgNode(
        "text",
        { x: right + 12, y: pos + 4, fill: "#94a393", "font-size": 10 },
        `$${value.toFixed(2)}`,
      ),
    );
  }
  const defs = svgNode("defs", {}),
    gradient = svgNode("linearGradient", {
      id: "area",
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 1,
    });
  gradient.append(
    svgNode("stop", {
      offset: "0%",
      "stop-color": "#d7fc70",
      "stop-opacity": 0.13,
    }),
    svgNode("stop", {
      offset: "100%",
      "stop-color": "#d7fc70",
      "stop-opacity": 0,
    }),
  );
  defs.append(gradient);
  svg.append(defs);
  const points = (key) =>
    rows.map((row, i) => `${x(i)},${y(row[key])}`).join(" ");
  svg.append(
    svgNode("polygon", {
      points: `${x(0)},${bottom} ${points("close")} ${right},${bottom}`,
      fill: "url(#area)",
    }),
  );
  for (const [key, color] of [
    ["low", "#b29da7"],
    ["open", "#91b8cf"],
    ["close", "#d7fc70"],
  ]) {
    svg.append(
      svgNode("polyline", {
        points: points(key),
        fill: "none",
        stroke: color,
        "stroke-width": key === "close" ? 2.5 : 1,
        "stroke-linejoin": "round",
        opacity: key === "close" ? 1 : 0.6,
      }),
    );
  }
  svg.append(
    svgNode("line", {
      x1: right,
      x2: right,
      y1: top,
      y2: bottom,
      stroke: "#d7fc70",
      opacity: 0.5,
      "stroke-dasharray": "4 4",
    }),
  );
  svg.append(
    svgNode("circle", {
      cx: right,
      cy: y(rows.at(-1).close),
      r: 4,
      fill: "#d7fc70",
    }),
  );
  const date = (value) =>
    new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  if (rows.length > 1)
    svg.append(
      svgNode(
        "text",
        { x: left, y: 289, fill: "#94a393", "font-size": 10 },
        date(rows[0].date),
      ),
    );
  svg.append(
    svgNode(
      "text",
      {
        x: right,
        y: 289,
        fill: "#d7fc70",
        "font-size": 10,
        "text-anchor": "end",
      },
      date(rows.at(-1).date),
    ),
  );
  svg.setAttribute(
    "aria-label",
    `${rows.length} revealed trading days through ${rows.at(-1).date}. Close $${rows.at(-1).close.toFixed(2)}.`,
  );
  if (rows.length === 1) {
    svg.append(
      svgNode(
        "text",
        {
          x: (left + right) / 2,
          y: 140,
          fill: "#c5cfc6",
          "font-size": width === 400 ? 11 : 14,
          "text-anchor": "middle",
        },
        "Press Play to reveal market history",
      ),
    );
  }
}
