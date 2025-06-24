[![Build](https://github.com/sorokya/eoweb/actions/workflows/app.yml/badge.svg?branch=master)](https://github.com/sorokya/eoweb/actions/workflows/app.yml)

# EOWeb

[Click here to play on the test server](https://game.reoserv.net)

[![Screenshot](https://raw.githubusercontent.com/sorokya/eoweb/refs/heads/master/screenshots/eoweb.png)](https://game.reoserv.net)

**EOWeb** is a browser-based client for [Endless Online](https://endless-online.com), offering a modern, accessible way to play the classic 0.0.28 protocol game directly in your web browser.

---

## 🕹️ Features

- Supports the 0.0.28 network protocol (classic Endless Online servers)
- Works with game servers that support WebSocket connections, or via a [WebSocket bridge](https://github.com/sorokya/eo-ws-bridge)

---

## 🔧 Building from Source

### 1. Clone the repository

```sh
git clone https://github.com/sorokya/eoweb.git
cd eoweb
```

### 2. Prepare game data files

You’ll need to copy the game’s `gfx`, `sfx`, and `maps` directories into the `public` folder.

To convert the original `.egf` graphics files into web-friendly `.png` files, use [extract-egf-images](https://github.com/sorokya/extract-egf-images).

The resulting structure should look like this:

```
public/
├── gfx/gfx001/101.png
├── sfx/sfx001.wav
└── maps/00005.emf
```

### 3. Install dependencies

Make sure you have [pnpm](https://pnpm.io/) installed, then run:

```sh
pnpm install
```

### 4. Run the development server

To start the Vite development server with hot reload:

```sh
pnpm dev
```

### 5. Build for production

To compile a static build ready for deployment:

```sh
pnpm build
```

The production-ready output will be in the `dist/` directory, which you can host using any static HTTP server.

---

## 📫 Links

- 🕹 [Play Test Server](https://game.reoserv.net)
- 🔌 [WebSocket Bridge](https://github.com/sorokya/eo-ws-bridge)
- 🖼 [EGF Image Extractor](https://github.com/sorokya/extract-egf-images)

---

## 📜 License

[GNU AGPLv3](https://github.com/sorokya/eoweb/blob/master/LICENSE.txt)