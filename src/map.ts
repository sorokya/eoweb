import { type Emf, MapTileSpec } from 'eolib';
import type { CharacterRenderer } from './character';
import {
  ANIMATION_TICKS,
  HALF_TILE_HEIGHT,
  HALF_TILE_WIDTH,
  TILE_HEIGHT,
  TILE_WIDTH,
} from './consts';
import { HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from './game-state';
import { GfxType, getBitmapById } from './gfx';
import { isoToScreen } from './utils/iso-to-screen';
import { screenToIso } from './utils/screen-to-iso';
import type { Vector2 } from './vector';

enum EntityType {
  Tile = 0,
  Character = 1,
  Cursor = 2,
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
}

const TDG = 0.00000001; // gap between depth of each tile on a layer
const RDG = 0.001; // gap between depth of each row of tiles

const layerDepth = [
  -3.0 + TDG * 1, // Ground
  0.0 + TDG * 3, // Objects
  0.0 + TDG * 5, // Overlay
  0.0 + TDG * 6, // Down Wall
  -RDG + TDG * 7, // Right Wall
  0.0 + TDG * 8, // Roof
  0.0 + TDG * 1, // Top
  -1.0 + TDG * 1, // Shadow
  1.0 + TDG * 1, // Overlay 2
  0.0 + TDG * 4, // Characters
  0.0 + TDG * 2, // Cursor
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
  emf: Emf;
  animationFrame = 0;
  animationTicks = ANIMATION_TICKS;
  playerId: number;
  characters: CharacterRenderer[] = [];
  mousePosition: Vector2 | undefined;
  mouseCoords: Vector2 | undefined;
  private staticTileGrid: StaticTile[][][] = [];
  private tileSpecCache: (MapTileSpec | null)[][] = [];

  constructor(emf: Emf, playerId: number) {
    this.emf = emf;
    this.playerId = playerId;
    this.buildCaches();
  }

  private buildCaches() {
    const w = this.emf.width;
    const h = this.emf.height;

    this.staticTileGrid = Array.from({ length: h + 1 }, () =>
      Array.from({ length: w + 1 }, () => [] as StaticTile[]),
    );

    for (let layer = 0; layer <= 8; layer++) {
      const layerRows = this.emf.graphicLayers[layer].graphicRows;
      for (let y = 0; y <= h; y++) {
        const rowTiles = layerRows.find((r) => r.y === y)?.tiles ?? [];
        for (let x = 0; x <= w; x++) {
          let id = rowTiles.find((t) => t.x === x)?.graphic ?? null;
          if (id === null && layer === Layer.Ground && this.emf.fillTile)
            id = this.emf.fillTile;
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
    for (const row of this.emf.tileSpecRows)
      for (const t of row.tiles) this.tileSpecCache[row.y][t.x] = t.tileSpec;
  }

  setMousePosition(position: Vector2) {
    this.mousePosition = position;

    const player = this.getPlayerCoords();
    const playerScreen = isoToScreen(player);

    const mouseWorldX = position.x - HALF_GAME_WIDTH + playerScreen.x;
    const mouseWorldY =
      position.y - HALF_GAME_HEIGHT + playerScreen.y + HALF_TILE_HEIGHT;

    this.mouseCoords = screenToIso({ x: mouseWorldX, y: mouseWorldY });

    if (this.mouseCoords.x < 0 || this.mouseCoords.y < 0) {
      this.mouseCoords = undefined;
    }
  }

  addCharacter(character: CharacterRenderer) {
    this.characters.push(character);
  }

  getWidth() {
    return this.emf.width;
  }

  getHeight() {
    return this.emf.height;
  }

  tick() {
    this.animationTicks -= 1;
    if (this.animationTicks <= 0) {
      this.animationFrame += 1;
      if (this.animationFrame > 3) {
        this.animationFrame = 0;
      }

      this.animationTicks = ANIMATION_TICKS;
    }

    for (const character of this.characters) {
      character.tick();
    }
  }

  calculateDepth(layer: number, x: number, y: number): number {
    return layerDepth[layer] + y * RDG + x * layerDepth.length * TDG;
  }

  getPlayerCoords() {
    const playerCharacter = this.characters.find(
      (c) => c.mapInfo.playerId === this.playerId,
    );
    return playerCharacter ? playerCharacter.mapInfo.coords : { x: 0, y: 0 };
  }

  render(ctx: CanvasRenderingContext2D) {
    const player = this.getPlayerCoords();
    const playerScreen = isoToScreen(player);
    const diag = Math.hypot(ctx.canvas.width, ctx.canvas.height);
    const rangeX = Math.min(
      this.emf.width,
      Math.ceil(diag / HALF_TILE_WIDTH) + 2,
    );
    const rangeY = Math.min(
      this.emf.height,
      Math.ceil(diag / HALF_TILE_HEIGHT) + 2,
    );
    const entities: Entity[] = [];

    for (let y = player.y - rangeY; y <= player.y + rangeY; y++) {
      if (y < 0 || y > this.emf.height) continue;
      for (let x = player.x - rangeX; x <= player.x + rangeX; x++) {
        if (x < 0 || x > this.emf.width) continue;

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

        for (const c of this.characters.filter(
          (c) => c.mapInfo.coords.x === x && c.mapInfo.coords.y === y,
        )) {
          if (c.mapInfo.playerId === this.playerId) {
            playerScreen.x += c.walkOffset.x;
            playerScreen.y += c.walkOffset.y;
          }
          entities.push({
            x,
            y,
            type: EntityType.Character,
            typeId: c.mapInfo.playerId,
            layer: Layer.Character,
            depth: this.calculateDepth(Layer.Character, x, y),
          });
        }
      }
    }

    if (this.mouseCoords) {
      const spec = this.getTileSpec(this.mouseCoords.x, this.mouseCoords.y);
      if (
        spec === null ||
        ![MapTileSpec.Wall, MapTileSpec.Edge].includes(spec)
      ) {
        const charAt = this.characters.some(
          (c) =>
            c.mapInfo.coords.x === this.mouseCoords.x &&
            c.mapInfo.coords.y === this.mouseCoords.y,
        );
        entities.push({
          x: this.mouseCoords.x,
          y: this.mouseCoords.y,
          type: EntityType.Cursor,
          typeId: charAt || spec ? 1 : 0,
          layer: Layer.Cursor,
          depth: this.calculateDepth(
            Layer.Cursor,
            this.mouseCoords.x,
            this.mouseCoords.y,
          ),
        });
      }
    }

    entities.sort((a, b) => a.depth - b.depth);

    for (const e of entities) {
      if (e.type === EntityType.Tile) this.renderTile(e, playerScreen, ctx);
      else if (e.type === EntityType.Character)
        this.renderCharacter(e, playerScreen, ctx);
      else this.renderCursor(e, playerScreen, ctx);
    }

    const main = this.characters.find(
      (c) => c.mapInfo.playerId === this.playerId,
    );
    if (main) {
      ctx.globalAlpha = 0.4;
      main.render(ctx, playerScreen);
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
    const renderer = this.characters.find(
      (c) => c.mapInfo.playerId === entity.typeId,
    );
    if (renderer) {
      renderer.render(ctx, playerScreen);
    }
  }

  renderCursor(
    entity: Entity,
    playerScreen: Vector2,
    ctx: CanvasRenderingContext2D,
  ) {
    const bmp = getBitmapById(GfxType.PostLoginUI, 24);
    if (bmp && this.mouseCoords) {
      const tileScreen = isoToScreen({
        x: this.mouseCoords.x,
        y: this.mouseCoords.y,
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
