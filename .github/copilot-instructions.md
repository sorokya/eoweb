# EOWeb – Copilot Instructions

EOWeb is a browser-based client for Endless Online (classic MMORPG, 0.0.28 protocol). It connects to game servers over WebSocket and renders the world using Pixi.js, with a Preact UI for menus/dialogs.

## Commands

```sh
pnpm dev          # Vite dev server (port 3000)
pnpm build        # tsc && vite build → dist/
pnpm lint         # biome check .
pnpm format       # biome check --write .
```

There is no test suite.

## Architecture

The app has two rendering layers that serve different purposes:

- **Preact UI** (`src/ui/`) — shown only for non-game screens (main menu, login, character select, change password). Conditionally rendered based on `GameState` enum.
- **Pixi.js** (`src/map.ts`, `src/atlas.ts`, `src/render/`) — handles all in-game rendering: map tiles, characters, NPCs, animations, effects.

The central object is `Client` (`src/client/client.ts`). It owns all game state, every controller, the packet bus, the Pixi.js `Application`, and the `MapRenderer`. Nearly everything receives a `Client` reference.

### Data flow

```
WebSocket → PacketBus → handlers/ → client state / emit events → UI / Pixi render
```

- **`src/bus.ts` (`PacketBus`)** — manages the WebSocket connection and dispatches incoming packets by `PacketFamily + PacketAction` to registered handler functions.
- **`src/handlers/`** — one file per packet family. Each exports a `registerXxxHandlers(client: Client)` function that calls `client.bus.registerPacketHandler(family, action, fn)`. All are registered at startup via `registerAllHandlers(client)`.
- **`src/controllers/`** — encapsulate client-side logic for sending packets and managing related state (e.g., `MovementController`, `InventoryController`). Each takes `Client` in its constructor.
- **`src/client/events.ts`** — typed `ClientEvents` map used by the mitt emitter on `Client`. Handlers call `client.emit(...)`, UI subscribes via `client.on(...)`.

### Persistence

`src/db.ts` wraps IndexedDB (via `idb`) with three stores:
- `pubs` — serialized EIF/ENF/ECF/ESF pub files (keyed by string: `'eif'`, `'enf'`, etc.)
- `maps` — serialized EMF map files (keyed by map ID number)
- `edfs` — EDF dialog/string files (keyed by file ID); fetched from `/data/datNNN.edf` on cache miss

### Game loop

`src/main.tsx` sets up a Pixi.js ticker at 120 ms per tick:
```ts
client.tick();            // game logic
client.render(interp);    // interpolated Pixi render
```

### Graphics

`src/atlas.ts` (`Atlas`) builds a dynamic texture atlas for character/NPC sprites on demand. Graphics files are loaded from `public/gfx/gfxNNN/` (Custom PE Files extracted via gfx-loader). `src/gfx/gfx-loader.worker.ts` loads graphics in a Web Worker.

## Key Conventions

### Imports

- **Always use `@/` path alias** — never `../` relative parent imports. This is enforced by Biome as an error.
- **Import from barrel files**, not deep paths. The following modules have barrels and must be imported from the top level:
  - `@/utils`, `@/render`, `@/controllers`, `@/handlers`, `@/gfx`, `@/fonts`
  - For UI sub-modules: `@/ui/chat` not `@/ui/chat/chat`

### Style

- Single quotes for JS/TS strings and JSX attributes (enforced by Biome).
- Biome (not ESLint/Prettier) is the sole linter/formatter. Run `pnpm lint` to check, `pnpm format` to auto-fix.

### Packet handlers

Register handlers in `src/handlers/<family>.ts`:
```ts
export function registerWalkHandlers(client: Client) {
  client.bus!.registerPacketHandler(PacketFamily.Walk, PacketAction.Player,
    (reader) => handleWalkPlayer(client, reader));
}
```
Each handler function deserializes using the corresponding `eolib` packet class: `XxxServerPacket.deserialize(reader)`.

### Controllers

Controller classes store a private `client: Client` reference. They send packets by constructing `eolib` client packet objects and calling `this.client.bus!.send(packet)`.

### Hair style

`hairStyle` is 1-based. A value of `0` means no hair. Rendering uses `(hairStyle - 1) * 40 + hairColor * 4`.

### Nullable returns

- `getEmf(id)` returns `Promise<Emf | null>` — always handle the null case.
- `client.getDialogStrings(id)` always returns a 2-element `string[]` (fallback `['', '']`).

### UI Look and Feel

The UI uses DaisyUI components with Tailwind CSS. Reference @.github/daisyui-llms.txt for component usage and styling conventions.

Shared components (e.g., `Button`) are in `src/ui/components/`. Container components for each screen are in `src/ui/containers/`.

### In game UI elements

All in-game UI elements should be movable by the player (Toggle in settings, then drag to reposition) with default
positions based on screen size.

A global UI Scale setting should allow the player to adjust the size of all UI elements (except the main game canvas) for better readability on different screen sizes.

The following elements are planned:
- Hotbar (assignable item/skill slots) (Not implemented)
- HUD (character name/level/HP/TP/TNL display (numeric & bars)) (Not implemented)
- Side menu (inventory, map, stats, skills, quests, settings, etc.) (Not implemented)
  - Collapsed to hamburger menu for mobile screens
- Touch controls (virtual joystick + buttons, shown only on mobile) (Not implemented)
- Chat (Not implemented)
  - All messages have a name (optional), icon (optional), and text.
  - The client tracks timestamp for each message and displays as local time (e.g., `[12:34:56]`).
  - Chat messages are saved in IndexedDB for chat history to view/search in the Chat Log window.
  - WoW style (Color coded, optionally open in separate tabs)
  - Local channel (nearby characters, and npcs)
  - Global channel (all players, messages prefixed with `~` to send to global)
  - Group channel (party messages, prefixed with `'` to send to group)
  - Guild channel (guild messages, prefixed with `&` to send to guild)
  - Admin channel (GMs only, prefixed with `+` to send to admin)
  - Whisper channel(s) (private messages, prefixed with `!recipientName` to send a whisper)
  - System messages (Combat log, item pickups, etc. system generated)
- Dialog windows
  - Flex positions by default (centered with gap), but allow dragging to reposition (and save position per dialog type).
  - Support multiple open dialogs at once (e.g., Inventory + Paperdoll + Chest) with proper z-index stacking when clicked.
  - Base dialog types:
    - Scrolling List
      - Layout:
        - Title
        - Scrollable content area (e.g., list of items, quests, skills, etc.)
        - Action buttons (e.g., Cancel, OK, etc.)
      - Push/Pop state for nested dialogs (e.g items for sale -> list of items)
      - Dialogs using this layout: Shop, Skill master, Inn keeper, Lawyer (for marriage/divorce), Guild master
    - Scrolling grid:
      - Layout:
        - Title
        - Scrollable grid content area (e.g., inventory grid, skill grid, etc.)
        - Action buttons (e.g., Cancel, OK, etc.)
      - Push/Pop state for nested dialogs (e.g., inventory -> item details)
      - Dialogs using this layout: Chest, Locker, Skill list
  - Custom Dialog Types:
    - Paperdoll
      - Displays player information and equipment
      - Layout:
        - Character info (name, title, home, class, partner, guild name, guild rank name, admin badge)
        - Equipment slots (hat, necklace, weapon, armor, shield, gloves, belt, boots, ring 1, ring 2, armlet 1, armlet 2, bracer 1, bracer 2, accessory)
          - Displayed in a grid with empty slots for unequipped items
          - Image is loaded from gfx-loader
          - Hovering over an equipped item shows a tooltip with item details
        - OK button to close the dialog
    - More to come

## Public assets

Game data files must be placed in `public/` before running:
- `public/gfx/gfxNNN.egf` — Custom PE Files for graphics (extracted via gfx-loader)
- `public/sfx/sfxNNN.wav` — sound effects
- `public/maps/NNNNN.emf` — map files (_only_ used for the title screen, in-game maps are loaded via protocol over WebSocket and cached in IndexedDB)
- `public/data/datNNN.edf` — dialog/string data files

# Refactoring notes

- Currently a lot of game state is stored in `Client`. Some things have been extracted into controllers but there's still
a lot that need to be moved out.
- The `ClientEvent` type is being phased out in favor of controller specific events (e.g., `CharacterSelectEvent`) that are emitted by controllers instead of the client. This allows for better separation of concerns and more modular code.
- The `GameState` enum is being expanded to include more specific states (e.g., `CharacterSelect`, `ChangePassword`) instead of the generic `LoggedIn`. This allows for more precise control over the UI and game flow.
