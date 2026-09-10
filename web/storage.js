export const STORAGE_KEY = "stonk.market.v2";
export function load(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw)
      return {
        state: {
          version: 2,
          selected: "INTC",
          speed: 2,
          range: 60,
          sessions: {},
        },
        warning: "",
      };
    const state = JSON.parse(raw);
    if (
      state.version !== 2 ||
      typeof state.sessions !== "object" ||
      !state.sessions ||
      Array.isArray(state.sessions)
    )
      throw new Error();
    if (!Number.isInteger(state.speed) || state.speed < 1 || state.speed > 20)
      state.speed = 2;
    if (
      !Number.isInteger(state.range) ||
      state.range < 10 ||
      state.range > 250 ||
      state.range % 10
    )
      state.range = 60;
    return { state, warning: "" };
  } catch {
    return {
      state: {
        version: 2,
        selected: "INTC",
        speed: 2,
        range: 60,
        sessions: {},
      },
      warning: "Saved data could not be read. Starting a fresh replay.",
    };
  }
}
export function save(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
