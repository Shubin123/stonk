# Stonk

An Electron desktop prototype with financial-charting experiments and small game interfaces, including a Plinko entry point.

## Setup

```sh
npm install
npm start
```

To start the Plinko entry point:

```sh
npm run start-plinko
```

## Build packages

The project includes scripts for platform packages:

```sh
npm run build-win
npm run build-mac
```

## Structure

- `index.js`, `client.js`, and `bot*.js` contain Electron and application logic.
- `assets/` and `casino_assets/` contain UI and game resources.
- `server/` contains supporting server material.

Review data sources and any credentials before connecting the prototype to live financial services.