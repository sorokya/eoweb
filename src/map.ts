import {
  type CharacterMapInfo,
  Direction,
  Gender,
  MapTileSpec,
  SitState,
} from 'eolib';
import {
  ANIMATION_TICKS,
  CHARACTER_HEIGHT,
  CHARACTER_SIT_GROUND_HEIGHT,
  CHARACTER_SIT_GROUND_WIDTH,
  CHARACTER_WIDTH,
  HALF_CHARACTER_SIT_GROUND_WIDTH,
  HALF_CHARACTER_WIDTH,
  HALF_TILE_HEIGHT,
  HALF_TILE_WIDTH,
  NPC_IDLE_ANIMATION_TICKS,
  TILE_HEIGHT,
  TILE_WIDTH,
} from './consts';
import { GAME_WIDTH, HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from './game-state';
import { GfxType, getBitmapById } from './gfx';
import { isoToScreen } from './utils/iso-to-screen';
import type { Vector2 } from './vector';
import type { Client } from './client';
import { CharacterWalkAnimation } from './character';

enum EntityType {
  Tile = 0,
  Character = 1,
  Cursor = 2,
  Npc = 3,
}

type Entity = {
  x: number;
  y: number;
  type: EntityType;
  typeId: number;
  depth: number;
  layer: number;
};

enum Layer {
  Ground = 0,
  Objects = 1,
  Overlay = 2,
  DownWall = 3,
  RightWall = 4,
  Roof = 5,
  Top = 6,
  Shadow = 7,
  Overlay2 = 8,
  Character = 9,
  Cursor = 10,
  Npc = 11,
}

const TDG = 0.00000001; // gap between depth of each tile on a layer
const RDG = 0.001; // gap between depth of each row of tiles

const layerDepth = [
  -3.0 + TDG * 1, // Ground
  0.0 + TDG * 3, // Objects
  0.0 + TDG * 6, // Overlay
  0.0 + TDG * 7, // Down Wall
  -RDG + TDG * 8, // Right Wall
  0.0 + TDG * 9, // Roof
  0.0 + TDG * 1, // Top
  -1.0 + TDG * 1, // Shadow
  1.0 + TDG * 1, // Overlay 2
  0.0 + TDG * 4, // Characters
  0.0 + TDG * 2, // Cursor
  0.0 + TDG * 5, // NPC
];

const LAYER_GFX_MAP = [
  GfxType.MapTiles,
  GfxType.MapObjects,
  GfxType.MapOverlay,
  GfxType.MapWalls,
  GfxType.MapWalls,
  GfxType.MapWallTop,
  GfxType.MapTiles,
  GfxType.Shadows,
  GfxType.MapOverlay,
];

type StaticTile = { bmpId: number; layer: number; depth: number };

export class MapRenderer {
  client: Client;
  animationFrame = 0;
  animationTicks = ANIMATION_TICKS;
  npcIdleAnimationTicks = NPC_IDLE_ANIMATION_TICKS;
  npcIdleAnimationFrame = 0;
  private staticTileGrid: StaticTile[][][] = [];
  private tileSpecCache: (MapTileSpec | null)[][] = [];

  constructor(client: Client) {
    this.client = client;
  }

  buildCaches() {
    const w = this.client.map.width;
    const h = this.client.map.height;

    this.staticTileGrid = Array.from({ length: h + 1 }, () =>
      Array.from({ length: w + 1 }, () => [] as StaticTile[]),
    );

    for (let layer = 0; layer <= 8; layer++) {
      const layerRows = this.client.map.graphicLayers[layer].graphicRows;
      for (let y = 0; y <= h; y++) {
        const rowTiles = layerRows.find((r) => r.y === y)?.tiles ?? [];
        for (let x = 0; x <= w; x++) {
          let id = rowTiles.find((t) => t.x === x)?.graphic ?? null;
          if (id === null && layer === Layer.Ground && this.client.map.fillTile)
            id = this.client.map.fillTile;
          if (id !== null)
            this.staticTileGrid[y][x].push({
              bmpId: id,
              layer,
              depth: layerDepth[layer] + y * RDG + x * layerDepth.length * TDG,
            });
        }
      }
    }

    this.tileSpecCache = Array.from({ length: h + 1 }, () =>
      new Array<MapTileSpec | null>(w + 1).fill(null),
    );
    for (const row of this.client.map.tileSpecRows)
      for (const t of row.tiles) this.tileSpecCache[row.y][t.x] = t.tileSpec;
  }

  tick() {
    this.animationTicks = Math.max(this.animationTicks - 1, 0);
    if (!this.animationTicks) {
      this.animationFrame = (this.animationFrame + 1) % 3;
      this.animationTicks = ANIMATION_TICKS;
    }

    this.npcIdleAnimationTicks = Math.max(this.npcIdleAnimationTicks - 1, 0);
    if (!this.npcIdleAnimationTicks) {
      this.npcIdleAnimationFrame = (this.npcIdleAnimationFrame + 1) % 2;
      this.npcIdleAnimationTicks = NPC_IDLE_ANIMATION_TICKS;
    }
  }

  calculateDepth(layer: number, x: number, y: number): number {
    return layerDepth[layer] + y * RDG + x * layerDepth.length * TDG;
  }

  getPlayerCoords() {
    const playerCharacter = this.client.nearby.characters.find(
      (c) => c.playerId === this.client.playerId,
    );
    return playerCharacter ? playerCharacter.coords : { x: 0, y: 0 };
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.client.map) {
      return;
    }

    const player = this.getPlayerCoords();
    let playerScreen = isoToScreen(player);
    const mainCharacterAnimation = this.client.characterAnimations.get(
      this.client.playerId,
    );
    if (mainCharacterAnimation instanceof CharacterWalkAnimation) {
      playerScreen = isoToScreen(mainCharacterAnimation.from);
      playerScreen.x += mainCharacterAnimation.walkOffset.x;
      playerScreen.y += mainCharacterAnimation.walkOffset.y;
    }

    const diag = Math.hypot(ctx.canvas.width, ctx.canvas.height);
    const rangeX = Math.min(
      this.client.map.width,
      Math.ceil(diag / HALF_TILE_WIDTH) + 2,
    );
    const rangeY = Math.min(
      this.client.map.height,
      Math.ceil(diag / HALF_TILE_HEIGHT) + 2,
    );
    const entities: Entity[] = [];

    for (let y = player.y - rangeY; y <= player.y + rangeY; y++) {
      if (y < 0 || y > this.client.map.height) continue;
      for (let x = player.x - rangeX; x <= player.x + rangeX; x++) {
        if (x < 0 || x > this.client.map.width) continue;

        entities.push(
          ...this.staticTileGrid[y][x].map((t) => ({
            x,
            y,
            type: EntityType.Tile,
            typeId: t.bmpId,
            layer: t.layer,
            depth: t.depth,
          })),
        );

        for (const c of this.client.nearby.characters.filter(
          (c) => c.coords.x === x && c.coords.y === y,
        )) {
          entities.push({
            x,
            y,
            type: EntityType.Character,
            typeId: c.playerId,
            layer: Layer.Character,
            depth: this.calculateDepth(Layer.Character, x, y),
          });
        }

        for (const n of this.client.nearby.npcs.filter(
          (n) => n.coords.x === x && n.coords.y === y,
        )) {
          entities.push({
            x,
            y,
            type: EntityType.Npc,
            typeId: n.index,
            layer: Layer.Npc,
            depth: this.calculateDepth(Layer.Npc, x, y),
          });
        }
      }
    }

    if (this.client.mouseCoords) {
      const spec = this.getTileSpec(
        this.client.mouseCoords.x,
        this.client.mouseCoords.y,
      );
      if (
        spec === null ||
        ![MapTileSpec.Wall, MapTileSpec.Edge].includes(spec)
      ) {
        const charAt = this.client.nearby.characters.some(
          (c) =>
            c.coords.x === this.client.mouseCoords.x &&
            c.coords.y === this.client.mouseCoords.y,
        );
        entities.push({
          x: this.client.mouseCoords.x,
          y: this.client.mouseCoords.y,
          type: EntityType.Cursor,
          typeId: charAt || spec ? 1 : 0,
          layer: Layer.Cursor,
          depth: this.calculateDepth(
            Layer.Cursor,
            this.client.mouseCoords.x,
            this.client.mouseCoords.y,
          ),
        });
      }
    }

    entities.sort((a, b) => a.depth - b.depth);

    for (const e of entities) {
      switch (e.type) {
        case EntityType.Tile:
          this.renderTile(e, playerScreen, ctx);
          break;
        case EntityType.Character:
          this.renderCharacter(e, playerScreen, ctx);
          break;
        case EntityType.Npc:
          this.renderNpc(e, playerScreen, ctx);
          break;
        case EntityType.Cursor:
          this.renderCursor(e, playerScreen, ctx);
          break;
      }
    }

    const main = entities.find(
      (e) =>
        e.type === EntityType.Character && e.typeId === this.client.playerId,
    );
    if (main) {
      ctx.globalAlpha = 0.4;
      this.renderCharacter(main, playerScreen, ctx);
      ctx.globalAlpha = 1;
    }
  }

  renderTile(
    entity: Entity,
    playerScreen: Vector2,
    ctx: CanvasRenderingContext2D,
  ) {
    const bmp = getBitmapById(LAYER_GFX_MAP[entity.layer], entity.typeId);
    if (!bmp) {
      return;
    }

    const offset = this.getOffset(entity.layer, bmp.width, bmp.height);
    const tileScreen = isoToScreen({ x: entity.x, y: entity.y });

    const screenX = Math.round(
      tileScreen.x -
        HALF_TILE_WIDTH -
        playerScreen.x +
        HALF_GAME_WIDTH +
        offset.x,
    );
    const screenY = Math.round(
      tileScreen.y -
        HALF_TILE_HEIGHT -
        playerScreen.y +
        HALF_GAME_HEIGHT +
        offset.y,
    );

    if (entity.layer === Layer.Shadow) {
      ctx.globalAlpha = 0.2;
    } else {
      ctx.globalAlpha = 1;
    }

    if (entity.layer === Layer.Ground && bmp.width > TILE_WIDTH) {
      ctx.drawImage(
        bmp,
        this.animationFrame * TILE_WIDTH,
        0,
        TILE_WIDTH,
        TILE_HEIGHT,
        screenX,
        screenY,
        TILE_WIDTH,
        TILE_HEIGHT,
      );
    } else if (
      bmp.width > 120 &&
      [Layer.DownWall, Layer.RightWall].includes(entity.layer)
    ) {
      const frameWidth = bmp.width / 4;
      ctx.drawImage(
        bmp,
        this.animationFrame * frameWidth,
        0,
        frameWidth,
        bmp.height,
        screenX,
        screenY,
        frameWidth,
        bmp.height,
      );
    } else {
      ctx.drawImage(bmp, screenX, screenY);
    }
  }

  renderCharacter(
    entity: Entity,
    playerScreen: Vector2,
    ctx: CanvasRenderingContext2D,
  ) {
    const character = this.client.getCharacterById(entity.typeId);
    if (!character) {
      return;
    }

    const animation = this.client.characterAnimations.get(character.playerId);
    if (animation) {
      animation.render(character, playerScreen, ctx);
      return;
    }

    if (character.sitState === SitState.Floor) {
      this.renderCharacterFloor(character, playerScreen, ctx);
      return;
    }

    // TODO: Chair

    this.renderCharacterStanding(character, playerScreen, ctx);
  }

  renderCharacterFloor(
    character: CharacterMapInfo,
    playerScreen: Vector2,
    ctx: CanvasRenderingContext2D,
  ) {
    const bmp = getBitmapById(GfxType.SkinSprites, 6);
    if (!bmp) {
      return;
    }

    const startX =
      character.gender === Gender.Female ? 0 : CHARACTER_SIT_GROUND_WIDTH * 2;
    const sourceX =
      startX +
      ([Direction.Up, Direction.Left].includes(character.direction)
        ? CHARACTER_SIT_GROUND_WIDTH
        : 0);
    const sourceY = character.skin * CHARACTER_SIT_GROUND_HEIGHT;

    const screenCoords = isoToScreen(character.coords);

    const additionalOffset = { x: 0, y: 0 };
    switch (character.direction) {
      case Direction.Up:
        additionalOffset.x = 2;
        additionalOffset.y = 11;
        break;
      case Direction.Down:
        additionalOffset.x = -4;
        additionalOffset.y = 8;
        break;
      case Direction.Left:
        additionalOffset.x = -2;
        additionalOffset.y = 12;
        break;
      case Direction.Right:
        additionalOffset.x = 4;
        additionalOffset.y = 8;
        break;
    }

    const screenX =
      screenCoords.x -
      HALF_CHARACTER_SIT_GROUND_WIDTH -
      playerScreen.x +
      HALF_GAME_WIDTH +
      additionalOffset.x;

    const screenY =
      screenCoords.y -
      CHARACTER_SIT_GROUND_HEIGHT -
      playerScreen.y +
      HALF_GAME_HEIGHT +
      additionalOffset.y;

    const mirrored = [Direction.Right, Direction.Up].includes(
      character.direction,
    );

    if (mirrored) {
      ctx.save(); // Save the current context state
      ctx.translate(GAME_WIDTH, 0); // Move origin to the right edge
      ctx.scale(-1, 1); // Flip horizontally
    }

    const drawX = mirrored
      ? GAME_WIDTH - screenX - CHARACTER_SIT_GROUND_WIDTH
      : screenX;

    ctx.drawImage(
      bmp,
      sourceX,
      sourceY,
      CHARACTER_SIT_GROUND_WIDTH,
      CHARACTER_SIT_GROUND_HEIGHT,
      drawX,
      screenY,
      CHARACTER_SIT_GROUND_WIDTH,
      CHARACTER_SIT_GROUND_HEIGHT,
    );

    if (mirrored) {
      ctx.restore();
    }
  }

  renderCharacterStanding(
    character: CharacterMapInfo,
    playerScreen: Vector2,
    ctx: CanvasRenderingContext2D,
  ) {
    const bmp = getBitmapById(GfxType.SkinSprites, 1);
    if (!bmp) {
      return;
    }

    const startX = character.gender === Gender.Female ? 0 : CHARACTER_WIDTH * 2;
    const sourceX =
      startX +
      ([Direction.Up, Direction.Left].includes(character.direction)
        ? CHARACTER_WIDTH
        : 0);
    const sourceY = character.skin * CHARACTER_HEIGHT;

    const screenCoords = isoToScreen(character.coords);

    const screenX =
      screenCoords.x - HALF_CHARACTER_WIDTH - playerScreen.x + HALF_GAME_WIDTH;

    const screenY =
      screenCoords.y - CHARACTER_HEIGHT - playerScreen.y + HALF_GAME_HEIGHT + 4;

    const mirrored = [Direction.Right, Direction.Up].includes(
      character.direction,
    );

    if (mirrored) {
      ctx.save(); // Save the current context state
      ctx.translate(GAME_WIDTH, 0); // Move origin to the right edge
      ctx.scale(-1, 1); // Flip horizontally
    }

    const drawX = mirrored ? GAME_WIDTH - screenX - CHARACTER_WIDTH : screenX;

    ctx.drawImage(
      bmp,
      sourceX,
      sourceY,
      CHARACTER_WIDTH,
      CHARACTER_HEIGHT,
      drawX,
      screenY,
      CHARACTER_WIDTH,
      CHARACTER_HEIGHT,
    );

    if (mirrored) {
      ctx.restore();
    }
  }

  renderNpc(
    entity: Entity,
    playerScreen: Vector2,
    ctx: CanvasRenderingContext2D,
  ) {
    const npc = this.client.getNpcByIndex(entity.typeId);
    if (!npc) {
      return;
    }

    const record = this.client.getEnfRecordById(npc.id);
    if (!record) {
      return;
    }

    const meta = this.client.getNpcMetadata(record.graphicId);

    const animation = this.client.npcAnimations.get(npc.index);
    if (animation) {
      animation.render(record.graphicId, npc, meta, playerScreen, ctx);
      return;
    }

    let offset = [Direction.Down, Direction.Right].includes(npc.direction)
      ? 1
      : 3;

    if (meta.animatedStanding) {
      offset += this.npcIdleAnimationFrame;
    }

    const bmp = getBitmapById(
      GfxType.NPC,
      (record.graphicId - 1) * 40 + offset,
    );
    if (!bmp) {
      return;
    }

    const screenCoords = isoToScreen(npc.coords);
    const mirrored = [Direction.Right, Direction.Up].includes(npc.direction);

    const screenX =
      screenCoords.x - bmp.width / 2 - playerScreen.x + HALF_GAME_WIDTH;
    const screenY =
      screenCoords.y - (bmp.height - 23) - playerScreen.y + HALF_GAME_HEIGHT;

    if (mirrored) {
      ctx.save(); // Save the current context state
      ctx.translate(GAME_WIDTH, 0); // Move origin to the right edge
      ctx.scale(-1, 1); // Flip horizontally
    }

    const drawX = mirrored
      ? GAME_WIDTH - screenX - bmp.width - meta.xOffset
      : screenX + meta.xOffset;
    const drawY = screenY - meta.yOffset;

    ctx.drawImage(bmp, drawX, drawY);

    if (mirrored) {
      ctx.restore();
    }
  }

  renderCursor(
    entity: Entity,
    playerScreen: Vector2,
    ctx: CanvasRenderingContext2D,
  ) {
    const bmp = getBitmapById(GfxType.PostLoginUI, 24);
    if (bmp && this.client.mouseCoords) {
      const tileScreen = isoToScreen({
        x: this.client.mouseCoords.x,
        y: this.client.mouseCoords.y,
      });

      const sourceX = entity.typeId * TILE_WIDTH;

      const screenX = Math.round(
        tileScreen.x - HALF_TILE_WIDTH - playerScreen.x + HALF_GAME_WIDTH,
      );
      const screenY = Math.round(
        tileScreen.y - HALF_TILE_HEIGHT - playerScreen.y + HALF_GAME_HEIGHT,
      );

      ctx.drawImage(
        bmp,
        sourceX,
        0,
        TILE_WIDTH,
        TILE_HEIGHT,
        screenX,
        screenY,
        TILE_WIDTH,
        TILE_HEIGHT,
      );
    }
  }

  getGraphicId(layer: number, x: number, y: number): number | null {
    const cell = this.staticTileGrid[y]?.[x];
    if (!cell) return null;
    const t = cell.find((t) => t.layer === layer);
    return t ? t.bmpId : null;
  }

  private getTileSpec(x: number, y: number): MapTileSpec | null {
    const row = this.tileSpecCache[y];
    return row ? (row[x] ?? null) : null;
  }

  getOffset(
    layer: number,
    width: number,
    height: number,
  ): { x: number; y: number } {
    if (layer === Layer.Shadow) {
      return { x: -24, y: -12 };
    }

    if ([Layer.Objects, Layer.Overlay, Layer.Overlay2].includes(layer)) {
      return {
        x: -2 - width / 2 + HALF_TILE_WIDTH,
        y: -2 - height + TILE_HEIGHT,
      };
    }

    if (layer === Layer.DownWall) {
      return { x: -32 + HALF_TILE_WIDTH, y: -1 - (height - TILE_HEIGHT) };
    }

    if (layer === Layer.RightWall) {
      return { x: HALF_TILE_WIDTH, y: -1 - (height - TILE_HEIGHT) };
    }

    if (layer === Layer.Roof) {
      return { x: 0, y: -TILE_WIDTH };
    }

    if (layer === Layer.Top) {
      return { x: 0, y: -TILE_HEIGHT };
    }

    return { x: 0, y: 0 };
  }
}
