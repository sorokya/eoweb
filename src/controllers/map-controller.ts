import {
  ChairRequestClientPacket,
  Coords,
  DoorOpenClientPacket,
  ItemType,
  LockerOpenClientPacket,
  MapTileSpec,
  SitAction,
} from 'eolib';
import type { Client } from '@/client';
import { Door } from '@/door';
import { EOResourceID } from '@/edf';
import { playSfxById, SfxId } from '@/sfx';
import type { Vector2 } from '@/vector';

export class MapController {
  private client: Client;
  doors: Door[] = [];

  constructor(client: Client) {
    this.client = client;
  }

  loadDoors(): void {
    this.doors = [];
    for (const warpRow of this.client.map!.warpRows) {
      for (const warpTile of warpRow.tiles) {
        if (warpTile.warp.door) {
          const coords = new Coords();
          coords.x = warpTile.x;
          coords.y = warpRow.y;
          this.doors.push(new Door(coords, warpTile.warp.door));
        }
      }
    }
  }

  getDoor(coords: Vector2): Door | undefined {
    return this.doors.find(
      (d) => d.coords.x === coords.x && d.coords.y === coords.y,
    );
  }

  chestAt(coords: Vector2): boolean {
    return this.client.map!.tileSpecRows.some(
      (r) =>
        r.y === coords.y &&
        r.tiles.some(
          (t) => t.x === coords.x && t.tileSpec === MapTileSpec.Chest,
        ),
    );
  }

  lockerAt(coords: Vector2): boolean {
    return this.client.map!.tileSpecRows.some(
      (r) =>
        r.y === coords.y &&
        r.tiles.some(
          (t) => t.x === coords.x && t.tileSpec === MapTileSpec.BankVault,
        ),
    );
  }

  boardAt(coords: Vector2): MapTileSpec | undefined {
    for (const r of this.client.map!.tileSpecRows) {
      if (r.y !== coords.y) continue;
      for (const t of r.tiles) {
        if (
          t.x === coords.x &&
          t.tileSpec >= MapTileSpec.Board1 &&
          t.tileSpec <= MapTileSpec.Board8
        ) {
          return t.tileSpec;
        }
      }
    }
    return undefined;
  }

  isAdjacentToSpec(spec: MapTileSpec): boolean {
    const playerAt = this.client.getPlayerCoords();

    const adjacentTiles = [
      { x: playerAt.x + 1, y: playerAt.y },
      { x: playerAt.x - 1, y: playerAt.y },
      { x: playerAt.x, y: playerAt.y + 1 },
      { x: playerAt.x, y: playerAt.y - 1 },
    ];

    for (const coords of adjacentTiles) {
      const tileSpec = this.client
        .map!.tileSpecRows.find((r) => r.y === coords.y)
        ?.tiles.find((t) => t.x === coords.x);

      if (tileSpec && tileSpec.tileSpec === spec) {
        return true;
      }
    }

    return false;
  }

  isFacingChairAt(coords: Vector2): boolean {
    const spec = this.client
      .map!.tileSpecRows.find((r) => r.y === coords.y)
      ?.tiles.find((t) => t.x === coords.x);

    if (!spec) {
      return false;
    }

    const playerAt = this.client.getPlayerCoords();

    switch (spec.tileSpec) {
      case MapTileSpec.ChairAll:
        return [
          { x: coords.x + 1, y: coords.y },
          { x: coords.x - 1, y: coords.y },
          { x: coords.x, y: coords.y + 1 },
          { x: coords.x, y: coords.y - 1 },
        ].some((p) => p.x === playerAt.x && p.y === playerAt.y);
      case MapTileSpec.ChairDownRight:
        return [
          { x: coords.x + 1, y: coords.y },
          { x: coords.x, y: coords.y + 1 },
        ].some((p) => p.x === playerAt.x && p.y === playerAt.y);
      case MapTileSpec.ChairDown:
        return playerAt.x === coords.x && playerAt.y === coords.y + 1;
      case MapTileSpec.ChairLeft:
        return playerAt.x === coords.x - 1 && playerAt.y === coords.y;
      case MapTileSpec.ChairRight:
        return playerAt.x === coords.x + 1 && playerAt.y === coords.y;
      case MapTileSpec.ChairUp:
        return playerAt.x === coords.x && playerAt.y === coords.y - 1;
      case MapTileSpec.ChairUpLeft:
        return [
          { x: coords.x + 1, y: coords.y },
          { x: coords.x, y: coords.y - 1 },
        ].some((p) => p.x === playerAt.x && p.y === playerAt.y);
    }

    return false;
  }

  openLocker(coords: Vector2): void {
    if (!this.isAdjacentToSpec(MapTileSpec.BankVault)) {
      return;
    }

    const packet = new LockerOpenClientPacket();
    packet.lockerCoords = new Coords();
    packet.lockerCoords.x = coords.x;
    packet.lockerCoords.y = coords.y;
    this.client.bus!.send(packet);
  }

  openDoor(coords: Vector2): void {
    const door = this.getDoor(coords);
    if (!door || door.open) {
      return;
    }

    if (
      door.key > 1 &&
      !this.client.items.some((i) => {
        const record = this.client.getEifRecordById(i.id);
        if (!record) {
          return false;
        }

        return record.spec1 === door.key;
      })
    ) {
      const keyName =
        this.client.eif!.items.find(
          (i) => i.type === ItemType.Key && i.spec1 === door.key,
        )?.name || 'Unknown';
      playSfxById(SfxId.DoorOrChestLocked);
      this.client.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_WARNING,
        `${this.client.getResourceString(EOResourceID.STATUS_LABEL_THE_DOOR_IS_LOCKED_EXCLAMATION)} - ${keyName}`,
      );
      return;
    }

    const packet = new DoorOpenClientPacket();
    packet.coords = new Coords();
    packet.coords.x = coords.x;
    packet.coords.y = coords.y;
    this.client.bus!.send(packet);
  }

  sitChair(coords: Vector2): void {
    const packet = new ChairRequestClientPacket();
    packet.sitAction = SitAction.Sit;
    packet.sitActionData = new ChairRequestClientPacket.SitActionDataSit();
    packet.sitActionData.coords = new Coords();
    packet.sitActionData.coords.x = coords.x;
    packet.sitActionData.coords.y = coords.y;
    this.client.bus!.send(packet);
  }

  occupied(coords: Vector2): boolean {
    if (
      this.client.nearby.characters.some(
        (c) => c.coords.x === coords.x && c.coords.y === coords.y,
      )
    ) {
      return true;
    }

    if (
      this.client.nearby.npcs.some(
        (n) => n.coords.x === coords.x && n.coords.y === coords.y,
      )
    ) {
      return true;
    }

    return false;
  }

  findPathTo(target: Vector2): Vector2[] {
    const start = this.client.getPlayerCoords();

    if (!this.canWalk(target, true)) {
      return [];
    }

    // A* pathfinding implementation
    interface PathNode {
      x: number;
      y: number;
      g: number; // Cost from start
      h: number; // Heuristic cost to target
      f: number; // Total cost (g + h)
      parent: PathNode | null;
    }

    const openSet: PathNode[] = [];
    const closedSet = new Set<string>();

    // Helper function to calculate Manhattan distance
    const heuristic = (a: Vector2, b: Vector2): number => {
      return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    };

    // Helper function to get node key for set operations
    const getKey = (x: number, y: number): string => `${x},${y}`;

    // Helper function to check if coordinates are within map bounds
    const isInBounds = (x: number, y: number): boolean => {
      return (
        x >= 0 &&
        y >= 0 &&
        x <= this.client.map!.width &&
        y <= this.client.map!.height
      );
    };

    // Create start node
    const startNode: PathNode = {
      x: start.x,
      y: start.y,
      g: 0,
      h: heuristic(start, target),
      f: heuristic(start, target),
      parent: null,
    };

    openSet.push(startNode);

    // Movement directions (4-directional movement)
    const directions = [
      { x: 0, y: -1 }, // Up
      { x: 1, y: 0 }, // Right
      { x: 0, y: 1 }, // Down
      { x: -1, y: 0 }, // Left
    ];

    while (openSet.length > 0) {
      // Find node with lowest f cost
      let currentIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[currentIndex].f) {
          currentIndex = i;
        }
      }

      const current = openSet.splice(currentIndex, 1)[0];
      closedSet.add(getKey(current.x, current.y));

      // Check if we reached the target
      if (current.x === target.x && current.y === target.y) {
        // Reconstruct path
        const path: Vector2[] = [];
        let node: PathNode | null = current;

        while (node?.parent) {
          path.unshift({ x: node.x, y: node.y });
          node = node.parent;
        }

        return path;
      }

      // Check all neighbors
      for (const dir of directions) {
        const neighborX = current.x + dir.x;
        const neighborY = current.y + dir.y;
        const neighborKey = getKey(neighborX, neighborY);

        // Skip if already processed, out of bounds, or not walkable
        if (
          closedSet.has(neighborKey) ||
          !isInBounds(neighborX, neighborY) ||
          !this.canWalk({ x: neighborX, y: neighborY }, true)
        ) {
          continue;
        }

        const gCost = current.g + 1;
        const hCost = heuristic({ x: neighborX, y: neighborY }, target);
        const fCost = gCost + hCost;

        // Check if this neighbor is already in openSet
        const existingNode = openSet.find(
          (node) => node.x === neighborX && node.y === neighborY,
        );

        if (existingNode) {
          // If we found a better path to this node, update it
          if (gCost < existingNode.g) {
            existingNode.g = gCost;
            existingNode.f = fCost;
            existingNode.parent = current;
          }
        } else {
          // Add new node to openSet
          const neighborNode: PathNode = {
            x: neighborX,
            y: neighborY,
            g: gCost,
            h: hCost,
            f: fCost,
            parent: current,
          };
          openSet.push(neighborNode);
        }
      }
    }

    // No path found

    return [];
  }

  canWalk(coords: Vector2, silent = false): boolean {
    if (
      coords.x < 0 ||
      coords.y < 0 ||
      coords.x > this.client.map!.width ||
      coords.y > this.client.map!.height
    ) {
      return false;
    }

    if (this.client.commandController.nowall) {
      return true;
    }

    if (
      this.client.nearby.npcs.some(
        (n) => n.coords.x === coords.x && n.coords.y === coords.y,
      )
    ) {
      return false;
    }

    if (
      this.client.nearby.characters.some(
        (c) => c.coords.x === coords.x && c.coords.y === coords.y,
      )
    ) {
      // TODO: Ghost
      return false;
    }

    const spec = this.client
      .map!.tileSpecRows.find((r) => r.y === coords.y)
      ?.tiles.find((t) => t.x === coords.x);
    if (
      spec &&
      [
        MapTileSpec.Wall,
        MapTileSpec.ChairDown,
        MapTileSpec.ChairLeft,
        MapTileSpec.ChairRight,
        MapTileSpec.ChairUp,
        MapTileSpec.ChairDownRight,
        MapTileSpec.ChairUpLeft,
        MapTileSpec.ChairAll,
        MapTileSpec.Chest,
        MapTileSpec.BankVault,
        MapTileSpec.Edge,
        MapTileSpec.Board1,
        MapTileSpec.Board2,
        MapTileSpec.Board3,
        MapTileSpec.Board4,
        MapTileSpec.Board5,
        MapTileSpec.Board6,
        MapTileSpec.Board7,
        MapTileSpec.Board8,
        MapTileSpec.Jukebox,
      ].includes(spec.tileSpec)
    ) {
      return false;
    }

    const warp = this.client
      .map!.warpRows.find((r) => r.y === coords.y)
      ?.tiles.find((t) => t.x === coords.x);
    if (warp) {
      if (warp.warp.levelRequired > this.client.level) {
        if (!silent) {
          this.client.setStatusLabel(
            EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
            `${this.client.getResourceString(EOResourceID.STATUS_LABEL_NOT_READY_TO_USE_ENTRANCE)} - LVL ${warp.warp.levelRequired}`,
          );
        }
        return false;
      }
    }

    return true;
  }

  cursorInDropRange(): boolean {
    if (!this.client.mouseCoords) {
      return false;
    }

    const spec = this.client
      .map!.tileSpecRows.find((r) => r.y === this.client.mouseCoords!.y)
      ?.tiles.find((t) => t.x === this.client.mouseCoords!.x);
    if (
      spec &&
      [
        MapTileSpec.Wall,
        MapTileSpec.ChairDown,
        MapTileSpec.ChairLeft,
        MapTileSpec.ChairRight,
        MapTileSpec.ChairUp,
        MapTileSpec.ChairDownRight,
        MapTileSpec.ChairUpLeft,
        MapTileSpec.ChairAll,
        MapTileSpec.Chest,
        MapTileSpec.BankVault,
        MapTileSpec.Edge,
        MapTileSpec.Board1,
        MapTileSpec.Board2,
        MapTileSpec.Board3,
        MapTileSpec.Board4,
        MapTileSpec.Board5,
        MapTileSpec.Board6,
        MapTileSpec.Board7,
        MapTileSpec.Board8,
        MapTileSpec.Jukebox,
      ].includes(spec.tileSpec)
    ) {
      return false;
    }

    const player = this.client.getPlayerCoords();
    const validCoords = [
      player,
      { x: player.x + 1, y: player.y }, // Right
      { x: player.x + 1, y: player.y + 1 }, // Down Right
      { x: player.x - 1, y: player.y }, // Left
      { x: player.x - 1, y: player.y - 1 }, // Up Left
      { x: player.x - 1, y: player.y + 1 }, // Down Left
      { x: player.x, y: player.y + 1 }, // Down
      { x: player.x + 1, y: player.y - 1 }, // Up Right
      { x: player.x, y: player.y - 1 }, // Up
      { x: player.x, y: player.y - 2 }, // Up + 1
      { x: player.x, y: player.y + 2 }, // Down + 1
      { x: player.x - 2, y: player.y }, // Left + 1
      { x: player.x + 2, y: player.y }, // Right + 1
    ];

    return validCoords.some(
      (c) =>
        c.x === this.client.mouseCoords!.x &&
        c.y === this.client.mouseCoords!.y,
    );
  }

  tick(): void {
    for (const door of this.doors) {
      if (!door.open) {
        continue;
      }

      door.openTicks = Math.max(door.openTicks - 1, 0);
      if (!door.openTicks) {
        door.open = false;
        playSfxById(SfxId.DoorClose);
      }
    }
  }
}
