# Original prototype archive

These files preserve the original Electron, server, bot, and arcade experiments for reference. They are not entry points for the supported app, are not installed by the root package, and are never included in the Pages artifact.

The replacement implementation lives in `../web/`. Use the root README for setup and tests. The old bots in this archive include look-ahead experiments and must not be used as fair backtests. The old account/server code also lacks the validated, atomic trading behavior in the new app.

To run a historical desktop version with its original layout and dependencies, use a separate checkout of commit `36a1609`. Historical data remains in `../assets/`.
