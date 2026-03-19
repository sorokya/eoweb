[![Build](https://github.com/sorokya/eoweb/actions/workflows/app.yml/badge.svg?branch=master)](https://github.com/sorokya/eoweb/actions/workflows/app.yml)

# EOWeb

[Click here to play on the test server](https://game.reoserv.net)

[![Screenshot](https://raw.githubusercontent.com/sorokya/eoweb/refs/heads/master/screenshots/eoweb.png)](https://game.reoserv.net)

**EOWeb** is a browser-based client for [Endless Online](https://endless-online.com), offering a modern, accessible way to play the classic 0.0.28 protocol game directly in your web browser.

---

## 🕹️ Features

- Supports the 0.0.28 network protocol (classic Endless Online servers)
- Works with game servers that support WebSocket connections, or via a [WebSocket bridge](https://github.com/sorokya/eo-ws-bridge)

## 🧱 UI Framework Migration Matrix

Current migration strategy is phased compatibility: legacy static dialogs and the new `ui-framework` runtime coexist during rollout.  
`#ui-root` is the new manager-owned mount for dynamic dialogs.

| Current UI element | Target family | Status | Notes |
| --- | --- | --- | --- |
| `small-alert-small-header` | `AlertDialog` | Migrated | Runtime-rendered modal under `#ui-root`, API-compatible wrapper kept. |
| `small-alert-large-header` | `AlertDialog` | Migrated | Runtime-rendered modal under `#ui-root`, API-compatible wrapper kept. |
| `large-alert-small-header` | `AlertDialog` | Migrated | Runtime-rendered modal under `#ui-root`, API-compatible wrapper kept. |
| `small-confirm` | `ConfirmationDialog` | Migrated | Runtime-rendered modal with callback/keep-open compatibility. |
| `large-confirm-small-header` | `ConfirmationDialog` | Migrated | Runtime-rendered modal with callback compatibility. |
| `item-amount-dialog` | `FormDialog` (slider + numeric) | Pending | Still legacy static markup and behavior. |
| `login` | `FormDialog` | Pending | Still legacy static markup and behavior. |
| `create-account` | `FormDialog` | Pending | Still legacy static markup and behavior. |
| `change-password` | `FormDialog` | Pending | Still legacy static markup and behavior. |
| `create-character` | `FormDialog` (+ preview region) | Pending | Still legacy static markup and behavior. |
| `shop` | `ScrollableListDialog` | Pending | Still legacy static list and state flow. |
| `bank` | `ScrollableListDialog` | Pending | Still legacy static list and transfer flow. |
| `locker` | `ScrollableListDialog` | Pending | Still legacy static list and transfer flow. |
| `skill-master` | `ScrollableListDialog` | Pending | Still legacy static list and state flow. |
| `chest` | `ScrollableListDialog` | Pending | Still legacy static list and transfer flow. |
| `quest-dialog` | `ScrollableListDialog` (text/link items) | Pending | Still legacy static dialog state machine. |
| `board` | `ScrollableListDialog` + state controller | Pending | Still legacy static board state controller. |
| `spell-book` | `ScrollableGridDialog` | Pending | Still legacy static grid dialog. |
| `online-list` | `ScrollableGridDialog` | Pending | Still legacy static grid dialog. |
| `party` | `ScrollableGridDialog` (member cards) | Pending | Still legacy static grid/list hybrid dialog. |
| `inventory` | `CustomDialog` | Pending | Drag/drop controller still legacy and static. |
| `paperdoll` | `CustomDialog` | Pending | Equipment layout still legacy and static. |
| `stats` | `CustomDialog` | Pending | Still legacy static dialog. |
| `hud` | Custom managed window | Pending | Persistent legacy window. |
| `hotbar` | Custom managed window | Pending | Persistent legacy window. |
| `chat` | Custom managed window | Pending | Persistent legacy window. |
| `mobile-controls` | Custom managed window | Pending | Persistent legacy window. |
| `in-game-menu` | Custom managed window | Pending | Persistent legacy window. |
| `character-select` | `CustomDialog` | Pending | Pre-game flow still legacy static markup. |
| `main-menu` | `CustomDialog` | Pending | Pre-game flow still legacy static markup. |
| `exit-game` | Custom managed control | Pending | Still legacy static control. |

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
