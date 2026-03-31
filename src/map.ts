import {
  AdminLevel,
  Coords,
  Direction,
  ItemSpecial,
  MapTileSpec,
  NpcType,
  SitState,
} from 'eolib';
import { CanvasSource, Rectangle as PixiRect, Sprite, Texture } from 'pixi.js';
import {
  CHARACTER_FRAME_OFFSETS,
  CharacterFrame,
  NpcFrame,
  StaticAtlasEntryType,
} from './atlas';
import type { Client } from './client';
import {
  getCharacterIntersecting,
  getCharacterRectangle,
  getNpcIntersecting,
  Rectangle,
  setBoardRectangle,
  setCharacterRectangle,
  setDoorRectangle,
  setLockerRectangle,
  setNpcRectangle,
  setSignRectangle,
} from './collision';
import {
  ANIMATION_TICKS,
  COLORS,
  DEATH_TICKS,
  DOOR_HEIGHT,
  EMOTE_ANIMATION_TICKS,
  HALF_TILE_HEIGHT,
  HALF_TILE_WIDTH,
  NPC_IDLE_ANIMATION_TICKS,
  PLAYER_MENU_HEIGHT,
  PLAYER_MENU_ITEM_HEIGHT,
  PLAYER_MENU_OFFSET_Y,
  PLAYER_MENU_WIDTH,
  TILE_HEIGHT,
  TILE_WIDTH,
  WALK_HEIGHT_FACTOR,
  WALK_WIDTH_FACTOR,
} from './consts';
import { TextAlign } from './fonts/base';
import { GfxType } from './gfx';
import { CharacterAttackAnimation } from './render/character-attack';
import { CharacterRangedAttackAnimation } from './render/character-attack-ranged';
import { CharacterDeathAnimation } from './render/character-death';
import { CharacterSpellChantAnimation } from './render/character-spell-chant';
import { CharacterWalkAnimation } from './render/character-walk';
import {
  type EffectAnimation,
  EffectTargetCharacter,
  EffectTargetNpc,
  EffectTargetTile,
} from './render/effect';
import type { Emote } from './render/emote';
import type { HealthBar } from './render/health-bar';
import { NpcAttackAnimation } from './render/npc-attack';
import { NpcDeathAnimation } from './render/npc-death';
import { NpcWalkAnimation } from './render/npc-walk';
import { GameState } from './types';
import { capitalize } from './utils/capitalize';
import { getItemGraphicId } from './utils/get-item-graphic-id';
import { isoToScreen } from './utils/iso-to-screen';
import type { Vector2 } from './vector';

enum EntityType {
  Tile = 0,
  Character = 1,
  Cursor = 2,
  Npc = 3,
  Item = 4,
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
  Item = 12,
}

const TDG = 0.00000001; // gap between depth of each tile on a layer
const RDG = 0.001; // gap between depth of each row of tiles

const layerDepth = [
  -3.0 + TDG * 1, // Ground
  0.0 + TDG * 4, // Objects
  0.0 + TDG * 7, // Overlay
  0.0 + TDG * 8, // Down Wall
  -RDG + TDG * 9, // Right Wall
  0.0 + TDG * 10, // Roof
  0.0 + TDG * 1, // Top
  -1.0 + TDG * 1, // Shadow
  1.0 + TDG * 1, // Overlay 2
  0.0 + TDG * 5, // Characters
  0.0 + TDG * 2, // Cursor
  0.0 + TDG * 6, // NPC
  0.0 + TDG * 3, // Item
];

export const LAYER_GFX_MAP = [
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

const WALK_OFFSETS = [
  {
    [Direction.Down]: { x: -WALK_WIDTH_FACTOR, y: WALK_HEIGHT_FACTOR },
    [Direction.Right]: { x: WALK_WIDTH_FACTOR, y: WALK_HEIGHT_FACTOR },
    [Direction.Up]: { x: WALK_WIDTH_FACTOR, y: -WALK_HEIGHT_FACTOR },
    [Direction.Left]: { x: -WALK_WIDTH_FACTOR, y: -WALK_HEIGHT_FACTOR },
  },
  {
    [Direction.Down]: { x: -WALK_WIDTH_FACTOR * 2, y: WALK_HEIGHT_FACTOR * 2 },
    [Direction.Right]: { x: WALK_WIDTH_FACTOR * 2, y: WALK_HEIGHT_FACTOR * 2 },
    [Direction.Up]: { x: WALK_WIDTH_FACTOR * 2, y: -WALK_HEIGHT_FACTOR * 2 },
    [Direction.Left]: { x: -WALK_WIDTH_FACTOR * 2, y: -WALK_HEIGHT_FACTOR * 2 },
  },
  {
    [Direction.Down]: { x: -WALK_WIDTH_FACTOR * 3, y: WALK_HEIGHT_FACTOR * 3 },
    [Direction.Right]: { x: WALK_WIDTH_FACTOR * 3, y: WALK_HEIGHT_FACTOR * 3 },
    [Direction.Up]: { x: WALK_WIDTH_FACTOR * 3, y: -WALK_HEIGHT_FACTOR * 3 },
    [Direction.Left]: { x: -WALK_WIDTH_FACTOR * 3, y: -WALK_HEIGHT_FACTOR * 3 },
  },
  {
    [Direction.Down]: { x: -WALK_WIDTH_FACTOR * 4, y: WALK_HEIGHT_FACTOR * 4 },
    [Direction.Right]: { x: WALK_WIDTH_FACTOR * 4, y: WALK_HEIGHT_FACTOR * 4 },
    [Direction.Up]: { x: WALK_WIDTH_FACTOR * 4, y: -WALK_HEIGHT_FACTOR * 4 },
    [Direction.Left]: { x: -WALK_WIDTH_FACTOR * 4, y: -WALK_HEIGHT_FACTOR * 4 },
  },
];

class SpritePool {
  private pool: Sprite[] = [];
  private head = 0;

  reset() {
    this.head = 0;
  }

  acquire(): Sprite {
    if (this.head < this.pool.length) {
      const s = this.pool[this.head++];
      s.alpha = 1;
      s.scale.set(1);
      s.visible = true;
      return s;
    }
    const s = new Sprite();
    s.eventMode = 'none';
    this.pool.push(s);
    this.head++;
    return s;
  }
}

export class MapRenderer {
  client: Client;
  animationFrame = 0;
  animationTicks = ANIMATION_TICKS;
  timedSpikesTicks = 0;
  npcIdleAnimationTicks = NPC_IDLE_ANIMATION_TICKS;
  npcIdleAnimationFrame = 0;
  buildingCache = false;
  private topLayer: (() => void)[] = [];
  private staticTileGrid: StaticTile[][][] = [];
  private tileSpecCache: (MapTileSpec | null)[][] = [];
  private signCache: ({ title: string; message: string } | null)[][] = [];
  private damageNumberCanvas: HTMLCanvasElement;
  private damageNumberCtx: CanvasRenderingContext2D;
  private damageNumberSource: CanvasSource | null = null;
  private damageNumberTexture: Texture | null = null;
  private interpolation = 0;
  // Viewport-cached sorted static entities — only rebuilt when player moves
  private cachedStaticEntities: Entity[] = [];
  private cachedViewportKey = '';
  // Pre-rendered ground+shadow offscreen images — one per animation frame (1 or 4)
  // Rendered once per map change; stored as HTMLImageElement for GPU-friendly blitting
  private groundCanvas: HTMLCanvasElement; // temp rendering surface
  private groundCtx: CanvasRenderingContext2D;
  private groundDirty = true;
  private groundImages: (HTMLImageElement | null)[] = [];
  private groundImagesLoaded = 0;
  private groundFrameCount = 1;
  // PixiJS ground sources/textures (parallel to groundImages)
  private groundSources: (CanvasSource | null)[] = [];
  private groundTextures: (Texture | null)[] = [];
  private allGroundEntities: Entity[] = [];
  private allShadowEntities: Entity[] = [];
  private groundOriginX = 0;
  private groundOriginY = 0;
  // Per-frame render caches — updated once at the top of render() to avoid repeated lookups
  private _halfGameWidth = 0;
  private _halfGameHeight = 0;
  private _gameWidth = 0;
  // Reusable Coords buffer — avoids allocating a new eolib Coords per renderTile call
  private readonly _coordsBuffer = new Coords();
  // Per-frame effects maps — built once to avoid O(entities × effects) filter calls
  private readonly _tileEffects: EffectAnimation[] = [];
  private readonly _charEffects = new Map<number, EffectAnimation[]>();
  private readonly _npcEffects = new Map<number, EffectAnimation[]>();
  // Sprite pool for PixiJS scene-graph rendering
  private readonly _spritePool = new SpritePool();

  constructor(client: Client) {
    this.client = client;
    this.damageNumberCanvas = document.createElement('canvas');
    this.damageNumberCtx = this.damageNumberCanvas.getContext('2d')!;
    this.groundCanvas = document.createElement('canvas');
    this.groundCtx = this.groundCanvas.getContext('2d')!;
  }

  buildCaches() {
    const w = this.client.map!.width;
    const h = this.client.map!.height;

    this.staticTileGrid = Array.from({ length: h + 1 }, () =>
      Array.from({ length: w + 1 }, () => [] as StaticTile[]),
    );

    for (let layer = 0; layer <= 8; layer++) {
      const layerRows = this.client.map!.graphicLayers[layer].graphicRows;
      for (let y = 0; y <= h; y++) {
        const rowTiles = layerRows.find((r) => r.y === y)?.tiles ?? [];
        for (let x = 0; x <= w; x++) {
          let id = rowTiles.find((t) => t.x === x)?.graphic ?? null;
          if (
            id === null &&
            layer === Layer.Ground &&
            this.client.map!.fillTile
          )
            id = this.client.map!.fillTile;
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
    for (const row of this.client.map!.tileSpecRows)
      for (const t of row.tiles) this.tileSpecCache[row.y][t.x] = t.tileSpec;

    this.signCache = Array.from({ length: h + 1 }, () =>
      new Array<{ title: string; message: string } | null>(w + 1).fill(null),
    );
    for (const sign of this.client.map!.signs) {
      const title = sign.stringData.substring(0, sign.titleLength);
      const message = sign.stringData.substring(sign.titleLength);
      this.signCache[sign.coords.y][sign.coords.x] = { title, message };
    }

    // Build full-map ground and shadow entity lists for pre-rendering
    this.allGroundEntities = [];
    this.allShadowEntities = [];
    for (let y = 0; y <= h; y++) {
      for (let x = 0; x <= w; x++) {
        for (const t of this.staticTileGrid[y][x]) {
          if (t.layer === Layer.Ground || t.layer === Layer.Shadow) {
            const list =
              t.layer === Layer.Ground
                ? this.allGroundEntities
                : this.allShadowEntities;
            list.push({
              x,
              y,
              type: EntityType.Tile,
              typeId: t.bmpId,
              layer: t.layer,
              depth: t.depth,
            });
          }
        }
      }
    }

    // Compute offscreen canvas dimensions to cover the full isometric map extents.
    // isoToScreen(x,y) = { x: (x-y)*HW, y: (x+y)*HH }
    // bigX = tileScreen.x - HW + originX  →  originX = (h+1)*HW makes min ground bigX = 0
    // Shadow offset is {x:-24, y:-12} so we pad by TILE_WIDTH/TILE_HEIGHT on each side.
    const PAD_X = TILE_WIDTH;
    const PAD_Y = TILE_HEIGHT;
    this.groundOriginX = (h + 1) * HALF_TILE_WIDTH + PAD_X;
    this.groundOriginY = HALF_TILE_HEIGHT + PAD_Y;
    this.groundCanvas.width = (w + h + 2) * HALF_TILE_WIDTH + PAD_X * 2;
    this.groundCanvas.height =
      (w + h) * HALF_TILE_HEIGHT + TILE_HEIGHT + PAD_Y * 2;

    this.groundImages = [];
    this.groundImagesLoaded = 0;
    this.groundFrameCount = 1;

    this.buildingCache = false;
    this.cachedViewportKey = ''; // Invalidate viewport cache on map change
    this.groundDirty = true;
  }

  getRequiredTileIds(): { gfxType: GfxType; graphicId: number }[] {
    const seen = new Set<string>();
    const result: { gfxType: GfxType; graphicId: number }[] = [];
    for (const row of this.staticTileGrid) {
      for (const cell of row) {
        for (const tile of cell) {
          if (tile.bmpId === 0) continue; // Ground fill with id 0 is not rendered
          const gfxType = LAYER_GFX_MAP[tile.layer];
          const key = `${gfxType}:${tile.bmpId}`;
          if (!seen.has(key)) {
            seen.add(key);
            result.push({ gfxType, graphicId: tile.bmpId });
          }
          // Door tiles (DownWall/RightWall) render bmpId+1 when open
          if (tile.layer === Layer.DownWall || tile.layer === Layer.RightWall) {
            const openKey = `${gfxType}:${tile.bmpId + 1}`;
            if (!seen.has(openKey)) {
              seen.add(openKey);
              result.push({ gfxType, graphicId: tile.bmpId + 1 });
            }
          }
        }
      }
    }
    return result;
  }

  tick() {
    this.animationTicks = Math.max(this.animationTicks - 1, 0);
    this.timedSpikesTicks = Math.max(this.timedSpikesTicks - 1, 0);
    if (!this.animationTicks) {
      this.animationFrame = (this.animationFrame + 1) % 4;
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

  private interpolateWalkOffset(frame: number, direction: Direction): Vector2 {
    const prevOffset =
      frame > 0 ? WALK_OFFSETS[frame - 1][direction] : { x: 0, y: 0 };
    const walkOffset = WALK_OFFSETS[frame][direction];

    return {
      x: Math.floor(
        prevOffset.x + (walkOffset.x - prevOffset.x) * this.interpolation,
      ),
      y: Math.floor(
        prevOffset.y + (walkOffset.y - prevOffset.y) * this.interpolation,
      ),
    };
  }

  render(ctx: CanvasRenderingContext2D, interpolation: number) {
    if (!this.client.map || this.buildingCache) {
      return;
    }

    this.interpolation = interpolation;

    // Cache viewport dimensions once — used throughout all render helpers
    this._halfGameWidth = this.client.viewportController.getHalfGameWidth();
    this._halfGameHeight = this.client.viewportController.getHalfGameHeight();
    this._gameWidth = this.client.viewportController.getGameWidth();

    // Build per-frame effects maps — avoids O(entities × effects) filter in each render helper
    this._tileEffects.length = 0;
    this._charEffects.clear();
    this._npcEffects.clear();
    for (const effect of this.client.animationController.effects) {
      if (effect.target instanceof EffectTargetCharacter) {
        const arr = this._charEffects.get(effect.target.playerId);
        if (arr) {
          arr.push(effect);
        } else {
          this._charEffects.set(effect.target.playerId, [effect]);
        }
      } else if (effect.target instanceof EffectTargetNpc) {
        const arr = this._npcEffects.get(effect.target.index);
        if (arr) {
          arr.push(effect);
        } else {
          this._npcEffects.set(effect.target.index, [effect]);
        }
      } else if (effect.target instanceof EffectTargetTile) {
        this._tileEffects.push(effect);
      }
    }

    const player = this.client.getPlayerCoords();
    let playerScreen = isoToScreen(player);
    let mainCharacterAnimation =
      this.client.animationController.characterAnimations.get(
        this.client.playerId,
      );

    if (
      mainCharacterAnimation instanceof CharacterDeathAnimation &&
      mainCharacterAnimation.base
    ) {
      mainCharacterAnimation = mainCharacterAnimation.base;
    }

    if (mainCharacterAnimation instanceof CharacterWalkAnimation) {
      playerScreen = isoToScreen(mainCharacterAnimation.from);
      const interOffset = this.interpolateWalkOffset(
        mainCharacterAnimation.animationFrame,
        mainCharacterAnimation.direction,
      );

      playerScreen.x += interOffset.x;
      playerScreen.y += interOffset.y;
    }

    playerScreen.x += this.client.quakeController.quakeOffset;

    // Compute visible tile range by inverting the iso→screen transform at screen corners.
    // A tile at (px+dx, py+dy) renders at screen ((dx-dy)*HW, (dx+dy)*HH).
    // Inverting: dx = (sx/HW + sy/HH)/2, dy = (-sx/HW + sy/HH)/2.
    // Both dx and dy have the same symmetric max at the screen corners: (W/TW + H/TH)/2.
    const range =
      Math.ceil(
        (ctx.canvas.width / TILE_WIDTH + ctx.canvas.height / TILE_HEIGHT) / 2,
      ) + 2;
    const rangeX = Math.min(this.client.map.width, range);
    const rangeY = Math.min(this.client.map.height, range);
    // --- Static entity caching: only rebuild when viewport changes ---
    const viewportKey = `${player.x},${player.y},${rangeX},${rangeY}`;
    if (viewportKey !== this.cachedViewportKey) {
      this.cachedStaticEntities.length = 0;
      const groundReady =
        this.groundImagesLoaded >= this.groundFrameCount &&
        this.groundFrameCount > 0;
      for (let y = player.y - rangeY; y <= player.y + rangeY; y++) {
        if (y < 0 || y > this.client.map.height) continue;
        for (let x = player.x - rangeX; x <= player.x + rangeX; x++) {
          if (x < 0 || x > this.client.map.width) continue;
          if (!this.staticTileGrid[y]?.[x]) return;
          for (const t of this.staticTileGrid[y][x]) {
            const entity: Entity = {
              x,
              y,
              type: EntityType.Tile,
              typeId: t.bmpId,
              layer: t.layer,
              depth: t.depth,
            };
            if (t.layer === Layer.Ground || t.layer === Layer.Shadow) {
              // Ground and shadow are pre-rendered into groundImages.
              // Fall back to the merge loop while images are not yet ready.
              if (!groundReady) {
                this.cachedStaticEntities.push(entity);
              }
            } else {
              this.cachedStaticEntities.push(entity);
            }
          }
        }
      }
      this.cachedStaticEntities.sort((a, b) => a.depth - b.depth);
      this.cachedViewportKey = viewportKey;
    }

    // --- Collect dynamic entities (characters, npcs, items, cursor) ---
    const dynamics: Entity[] = [];

    const inGame = this.client.state === GameState.InGame;
    if (inGame) {
      const minX = Math.max(player.x - rangeX, 0);
      const maxX = Math.min(player.x + rangeX, this.client.map.width);
      const minY = Math.max(player.y - rangeY, 0);
      const maxY = Math.min(player.y + rangeY, this.client.map.height);

      for (const character of this.client.nearby.characters) {
        const { x, y } = character.coords;
        if (x < minX || x > maxX || y < minY || y > maxY) continue;
        dynamics.push({
          x,
          y,
          type: EntityType.Character,
          typeId: character.playerId,
          layer: Layer.Character,
          depth: this.calculateDepth(Layer.Character, x, y),
        });
      }

      for (const npc of this.client.nearby.npcs) {
        const { x, y } = npc.coords;
        if (x < minX || x > maxX || y < minY || y > maxY) continue;
        dynamics.push({
          x,
          y,
          type: EntityType.Npc,
          typeId: npc.index,
          layer: Layer.Npc,
          depth: this.calculateDepth(Layer.Npc, x, y),
        });
      }

      for (const item of this.client.nearby.items) {
        const { x, y } = item.coords;
        if (x < minX || x > maxX || y < minY || y > maxY) continue;
        dynamics.push({
          x,
          y,
          type: EntityType.Item,
          typeId: item.uid,
          layer: Layer.Item,
          depth: this.calculateDepth(Layer.Item, x, y),
        });
      }
    }

    if (this.client.mouseCoords && inGame) {
      const spec = this.getTileSpec(
        this.client.mouseCoords.x,
        this.client.mouseCoords.y,
      );
      if (
        spec === null ||
        ![MapTileSpec.Wall, MapTileSpec.Edge].includes(spec)
      ) {
        let typeId = 0;

        if (
          [
            MapTileSpec.Chest,
            MapTileSpec.ChairAll,
            MapTileSpec.ChairDown,
            MapTileSpec.ChairDownRight,
            MapTileSpec.ChairLeft,
            MapTileSpec.ChairRight,
            MapTileSpec.ChairUp,
            MapTileSpec.ChairUpLeft,
            MapTileSpec.BankVault,
            MapTileSpec.Jukebox,
            MapTileSpec.Board1,
            MapTileSpec.Board2,
            MapTileSpec.Board3,
            MapTileSpec.Board4,
            MapTileSpec.Board5,
            MapTileSpec.Board6,
            MapTileSpec.Board7,
            MapTileSpec.Board8,
          ].includes(spec!) ||
          this.client.nearby.characters.some(
            (c) =>
              c.coords.x === this.client.mouseCoords!.x &&
              c.coords.y === this.client.mouseCoords!.y,
          ) ||
          this.client.nearby.npcs.some(
            (n) =>
              n.coords.x === this.client.mouseCoords!.x &&
              n.coords.y === this.client.mouseCoords!.y,
          )
        ) {
          typeId = 1;
        } else if (
          this.client.nearby.items.some(
            (i) =>
              i.coords.x === this.client.mouseCoords!.x &&
              i.coords.y === this.client.mouseCoords!.y,
          )
        ) {
          typeId = 2;
        }

        dynamics.push({
          x: this.client.mouseCoords.x,
          y: this.client.mouseCoords.y,
          type: EntityType.Cursor,
          typeId,
          layer: Layer.Cursor,
          depth: this.calculateDepth(
            Layer.Cursor,
            this.client.mouseCoords.x,
            this.client.mouseCoords.y,
          ),
        });
      }
    }

    // --- Blit visible section of the pre-rendered full-map ground image ---
    if (this.groundDirty) {
      this.renderGround();
    }
    const halfGameWidth = this._halfGameWidth;
    const halfGameHeight = this._halfGameHeight;
    if (
      this.groundImagesLoaded >= this.groundFrameCount &&
      this.groundFrameCount > 0
    ) {
      const srcX = Math.round(
        playerScreen.x - halfGameWidth + this.groundOriginX,
      );
      const srcY = Math.round(
        playerScreen.y - halfGameHeight + this.groundOriginY,
      );
      const dw = ctx.canvas.width;
      const dh = ctx.canvas.height;
      // Frame 0: static ground base (non-animated maps: also includes shadows).
      ctx.drawImage(this.groundImages[0]!, srcX, srcY, dw, dh, 0, 0, dw, dh);
      // Animated maps: overlay frame [1 + animationFrame] which contains the animated
      // tiles at the current frame plus all shadows.
      if (this.groundFrameCount > 1) {
        ctx.drawImage(
          this.groundImages[1 + this.animationFrame]!,
          srcX,
          srcY,
          dw,
          dh,
          0,
          0,
          dw,
          dh,
        );
      }
    }

    // --- O(n+m) merge of pre-sorted statics with sorted dynamics ---
    dynamics.sort((a, b) => a.depth - b.depth);

    let staticIndex = 0;
    let dynamicIndex = 0;
    const statics = this.cachedStaticEntities;
    while (staticIndex < statics.length || dynamicIndex < dynamics.length) {
      let entity: Entity;
      if (
        dynamicIndex >= dynamics.length ||
        (staticIndex < statics.length &&
          statics[staticIndex].depth <= dynamics[dynamicIndex].depth)
      ) {
        entity = statics[staticIndex++];
      } else {
        entity = dynamics[dynamicIndex++];
      }
      switch (entity.type) {
        case EntityType.Tile:
          this.renderTile(entity, playerScreen, ctx);
          break;
        case EntityType.Character:
          this.renderCharacter(entity, playerScreen, ctx);
          break;
        case EntityType.Npc:
          this.renderNpc(entity, playerScreen, ctx);
          break;
        case EntityType.Item:
          this.renderItem(entity, playerScreen, ctx);
          break;
        case EntityType.Cursor:
          this.renderCursor(entity, playerScreen, ctx);
          break;
      }
    }

    if (!inGame) {
      return;
    }

    for (const effect of this._tileEffects) {
      const target = effect.target as EffectTargetTile;
      const tileScreenX = (target.coords.x - target.coords.y) * HALF_TILE_WIDTH;
      const tileScreenY =
        (target.coords.x + target.coords.y) * HALF_TILE_HEIGHT;
      effect.target.rect = new Rectangle(
        {
          x: Math.floor(
            tileScreenX -
              HALF_TILE_WIDTH -
              playerScreen.x +
              this._halfGameWidth,
          ),
          y: Math.floor(
            tileScreenY -
              HALF_TILE_HEIGHT -
              playerScreen.y +
              this._halfGameHeight,
          ),
        },
        TILE_WIDTH,
        TILE_HEIGHT,
      );
      effect.renderedFirstFrame = true;
      this.renderEffectBehind(effect, ctx);
      this.renderEffectTransparent(effect, ctx);
      this.renderEffectFront(effect, ctx);
    }

    const main = dynamics.find(
      (e) =>
        e.type === EntityType.Character && e.typeId === this.client.playerId,
    );
    if (main) {
      ctx.globalAlpha = 0.4;

      this.renderCharacter(main, playerScreen, ctx, true);

      ctx.globalAlpha = 1;
    }

    this.renderNameplate(playerScreen, ctx);
    for (const renderTopLayerEntity of this.topLayer) {
      renderTopLayerEntity();
    }
    this.topLayer.length = 0;
    this.renderPlayerMenu(ctx);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PixiJS scene-graph rendering path (replaces render())
  // ────────────────────────────────────────────────────────────────────────────

  update(interpolation: number) {
    if (!this.client.map || this.buildingCache) {
      return;
    }

    this.interpolation = interpolation;

    this._halfGameWidth = this.client.viewportController.getHalfGameWidth();
    this._halfGameHeight = this.client.viewportController.getHalfGameHeight();
    this._gameWidth = this.client.viewportController.getGameWidth();

    // Build per-frame effects maps
    this._tileEffects.length = 0;
    this._charEffects.clear();
    this._npcEffects.clear();
    for (const effect of this.client.animationController.effects) {
      if (effect.target instanceof EffectTargetCharacter) {
        const arr = this._charEffects.get(effect.target.playerId);
        if (arr) {
          arr.push(effect);
        } else {
          this._charEffects.set(effect.target.playerId, [effect]);
        }
      } else if (effect.target instanceof EffectTargetNpc) {
        const arr = this._npcEffects.get(effect.target.index);
        if (arr) {
          arr.push(effect);
        } else {
          this._npcEffects.set(effect.target.index, [effect]);
        }
      } else if (effect.target instanceof EffectTargetTile) {
        this._tileEffects.push(effect);
      }
    }

    const player = this.client.getPlayerCoords();
    let playerScreen = isoToScreen(player);
    let mainCharacterAnimation =
      this.client.animationController.characterAnimations.get(
        this.client.playerId,
      );

    if (
      mainCharacterAnimation instanceof CharacterDeathAnimation &&
      mainCharacterAnimation.base
    ) {
      mainCharacterAnimation = mainCharacterAnimation.base;
    }

    if (mainCharacterAnimation instanceof CharacterWalkAnimation) {
      playerScreen = isoToScreen(mainCharacterAnimation.from);
      const interOffset = this.interpolateWalkOffset(
        mainCharacterAnimation.animationFrame,
        mainCharacterAnimation.direction,
      );
      playerScreen.x += interOffset.x;
      playerScreen.y += interOffset.y;
    }

    playerScreen.x += this.client.quakeController.quakeOffset;

    const gameWidth = this._gameWidth;
    const gameHeight = this._halfGameHeight * 2;
    const range =
      Math.ceil((gameWidth / TILE_WIDTH + gameHeight / TILE_HEIGHT) / 2) + 2;
    const rangeX = Math.min(this.client.map.width, range);
    const rangeY = Math.min(this.client.map.height, range);

    const viewportKey = `${player.x},${player.y},${rangeX},${rangeY}`;
    if (viewportKey !== this.cachedViewportKey) {
      this.cachedStaticEntities.length = 0;
      for (let y = player.y - rangeY; y <= player.y + rangeY; y++) {
        if (y < 0 || y > this.client.map.height) continue;
        for (let x = player.x - rangeX; x <= player.x + rangeX; x++) {
          if (x < 0 || x > this.client.map.width) continue;
          if (!this.staticTileGrid[y]?.[x]) return;
          for (const t of this.staticTileGrid[y][x]) {
            const entity: Entity = {
              x,
              y,
              type: EntityType.Tile,
              typeId: t.bmpId,
              layer: t.layer,
              depth: t.depth,
            };
            this.cachedStaticEntities.push(entity);
          }
        }
      }
      this.cachedStaticEntities.sort((a, b) => a.depth - b.depth);
      this.cachedViewportKey = viewportKey;
    }

    // Collect dynamic entities
    const dynamics: Entity[] = [];
    const inGame = this.client.state === GameState.InGame;
    if (inGame) {
      const minX = Math.max(player.x - rangeX, 0);
      const maxX = Math.min(player.x + rangeX, this.client.map.width);
      const minY = Math.max(player.y - rangeY, 0);
      const maxY = Math.min(player.y + rangeY, this.client.map.height);

      for (const character of this.client.nearby.characters) {
        const { x, y } = character.coords;
        if (x < minX || x > maxX || y < minY || y > maxY) continue;
        dynamics.push({
          x,
          y,
          type: EntityType.Character,
          typeId: character.playerId,
          layer: Layer.Character,
          depth: this.calculateDepth(Layer.Character, x, y),
        });
      }

      for (const npc of this.client.nearby.npcs) {
        const { x, y } = npc.coords;
        if (x < minX || x > maxX || y < minY || y > maxY) continue;
        dynamics.push({
          x,
          y,
          type: EntityType.Npc,
          typeId: npc.index,
          layer: Layer.Npc,
          depth: this.calculateDepth(Layer.Npc, x, y),
        });
      }

      for (const item of this.client.nearby.items) {
        const { x, y } = item.coords;
        if (x < minX || x > maxX || y < minY || y > maxY) continue;
        dynamics.push({
          x,
          y,
          type: EntityType.Item,
          typeId: item.uid,
          layer: Layer.Item,
          depth: this.calculateDepth(Layer.Item, x, y),
        });
      }
    }

    if (this.client.mouseCoords && inGame) {
      const spec = this.getTileSpec(
        this.client.mouseCoords.x,
        this.client.mouseCoords.y,
      );
      if (
        spec === null ||
        ![MapTileSpec.Wall, MapTileSpec.Edge].includes(spec)
      ) {
        let typeId = 0;
        if (
          [
            MapTileSpec.Chest,
            MapTileSpec.ChairAll,
            MapTileSpec.ChairDown,
            MapTileSpec.ChairDownRight,
            MapTileSpec.ChairLeft,
            MapTileSpec.ChairRight,
            MapTileSpec.ChairUp,
            MapTileSpec.ChairUpLeft,
            MapTileSpec.BankVault,
            MapTileSpec.Jukebox,
            MapTileSpec.Board1,
            MapTileSpec.Board2,
            MapTileSpec.Board3,
            MapTileSpec.Board4,
            MapTileSpec.Board5,
            MapTileSpec.Board6,
            MapTileSpec.Board7,
            MapTileSpec.Board8,
          ].includes(spec!) ||
          this.client.nearby.characters.some(
            (c) =>
              c.coords.x === this.client.mouseCoords!.x &&
              c.coords.y === this.client.mouseCoords!.y,
          ) ||
          this.client.nearby.npcs.some(
            (n) =>
              n.coords.x === this.client.mouseCoords!.x &&
              n.coords.y === this.client.mouseCoords!.y,
          )
        ) {
          typeId = 1;
        } else if (
          this.client.nearby.items.some(
            (i) =>
              i.coords.x === this.client.mouseCoords!.x &&
              i.coords.y === this.client.mouseCoords!.y,
          )
        ) {
          typeId = 2;
        }

        dynamics.push({
          x: this.client.mouseCoords.x,
          y: this.client.mouseCoords.y,
          type: EntityType.Cursor,
          typeId,
          layer: Layer.Cursor,
          depth: this.calculateDepth(
            Layer.Cursor,
            this.client.mouseCoords.x,
            this.client.mouseCoords.y,
          ),
        });
      }
    }

    // Clear scene graph containers and reset sprite pool
    this.client.worldContainer.removeChildren();
    this.client.uiContainer.removeChildren();
    this._spritePool.reset();

    // Merge-sort static + dynamic entities
    dynamics.sort((a, b) => a.depth - b.depth);
    let staticIndex = 0;
    let dynamicIndex = 0;
    const statics = this.cachedStaticEntities;
    while (staticIndex < statics.length || dynamicIndex < dynamics.length) {
      let entity: Entity;
      if (
        dynamicIndex >= dynamics.length ||
        (staticIndex < statics.length &&
          statics[staticIndex].depth <= dynamics[dynamicIndex].depth)
      ) {
        entity = statics[staticIndex++];
      } else {
        entity = dynamics[dynamicIndex++];
      }
      switch (entity.type) {
        case EntityType.Tile:
          this.addTileSprite(entity, playerScreen);
          break;
        case EntityType.Character:
          this.addCharacterSprites(entity, playerScreen);
          break;
        case EntityType.Npc:
          this.addNpcSprites(entity, playerScreen);
          break;
        case EntityType.Item:
          this.addItemSprite(entity, playerScreen);
          break;
        case EntityType.Cursor:
          this.addCursorSprites(entity, playerScreen);
          break;
      }
    }

    if (!inGame) {
      return;
    }

    for (const effect of this._tileEffects) {
      const target = effect.target as EffectTargetTile;
      const tileScreenX = (target.coords.x - target.coords.y) * HALF_TILE_WIDTH;
      const tileScreenY =
        (target.coords.x + target.coords.y) * HALF_TILE_HEIGHT;
      effect.target.rect = new Rectangle(
        {
          x: Math.floor(
            tileScreenX -
              HALF_TILE_WIDTH -
              playerScreen.x +
              this._halfGameWidth,
          ),
          y: Math.floor(
            tileScreenY -
              HALF_TILE_HEIGHT -
              playerScreen.y +
              this._halfGameHeight,
          ),
        },
        TILE_WIDTH,
        TILE_HEIGHT,
      );
      effect.renderedFirstFrame = true;
      this.addEffectBehindSprite(effect);
      this.addEffectTransparentSprite(effect);
      this.addEffectFrontSprite(effect);
    }

    // Player body at 40% alpha (ghost trail effect)
    const main = dynamics.find(
      (e) =>
        e.type === EntityType.Character && e.typeId === this.client.playerId,
    );
    if (main) {
      this.addCharacterSprites(main, playerScreen, true, 0.4);
    }

    this.addNameplateSprites(playerScreen);
    this.addPlayerMenuSprites();
  }

  private addTileSprite(entity: Entity, playerScreen: Vector2) {
    if (entity.layer === Layer.Ground && entity.typeId === 0) {
      return;
    }

    this._coordsBuffer.x = entity.x;
    this._coordsBuffer.y = entity.y;

    let bmpOffset = 0;
    if (entity.layer === Layer.DownWall || entity.layer === Layer.RightWall) {
      const door = this.client.mapController.getDoor(this._coordsBuffer);
      if (door?.open) {
        bmpOffset = 1;
      }
    }

    const spec = this.getTileSpec(entity.x, entity.y);
    if (entity.layer === Layer.Objects) {
      if (spec === MapTileSpec.TimedSpikes && !this.timedSpikesTicks) {
        return;
      }
      if (spec !== null && !Object.values(MapTileSpec).includes(spec)) {
        return;
      }
    }

    const gfxType = LAYER_GFX_MAP[entity.layer];
    const tile = this.client.atlas.getTile(gfxType, entity.typeId + bmpOffset);
    if (!tile) return;

    const { screenX, screenY } = this.tileScreenPosition(
      entity,
      playerScreen,
      tile,
    );

    let texture: Texture | undefined;

    if (entity.layer === Layer.Ground && tile.w > TILE_WIDTH) {
      texture = this.client.atlas.getFrameTexture({
        atlasIndex: tile.atlasIndex,
        x: tile.x + this.animationFrame * TILE_WIDTH,
        y: tile.y,
        w: TILE_WIDTH,
        h: TILE_HEIGHT,
      });
    } else if (
      tile.w > 120 &&
      [Layer.DownWall, Layer.RightWall].includes(entity.layer)
    ) {
      const frameWidth = tile.w / 4;
      texture = this.client.atlas.getFrameTexture({
        atlasIndex: tile.atlasIndex,
        x: tile.x + this.animationFrame * frameWidth,
        y: tile.y,
        w: frameWidth,
        h: tile.h,
      });
    } else {
      texture = this.client.atlas.getFrameTexture(tile);
    }

    if (!texture) return;

    const sprite = this._spritePool.acquire();
    sprite.texture = texture;
    sprite.position.set(screenX, screenY);
    if (entity.layer === Layer.Shadow) {
      sprite.alpha = 0.2;
    }
    this.client.worldContainer.addChild(sprite);

    if (this.client.mapController.getDoor(this._coordsBuffer)) {
      setDoorRectangle(
        this._coordsBuffer,
        new Rectangle(
          { x: screenX, y: screenY + tile.h - DOOR_HEIGHT },
          tile.w,
          DOOR_HEIGHT,
        ),
      );
    } else if (this.getSign(entity.x, entity.y)) {
      setSignRectangle(
        this._coordsBuffer,
        new Rectangle({ x: screenX, y: screenY }, tile.w, tile.h),
      );
    } else if (spec === MapTileSpec.BankVault) {
      setLockerRectangle(
        this._coordsBuffer,
        new Rectangle({ x: screenX, y: screenY }, tile.w, tile.h),
      );
    } else if (
      spec !== null &&
      spec >= MapTileSpec.Board1 &&
      spec <= MapTileSpec.Board8
    ) {
      setBoardRectangle(
        this._coordsBuffer,
        new Rectangle({ x: screenX, y: screenY }, tile.w, tile.h),
      );
    }
  }

  private tileScreenPosition(
    entity: Entity,
    playerScreen: Vector2,
    tile: { w: number; h: number; xOffset: number; yOffset: number },
  ) {
    const offset = this.getOffset(entity.layer, tile.w, tile.h);
    const screenX = Math.floor(
      (entity.x - entity.y) * HALF_TILE_WIDTH -
        HALF_TILE_WIDTH -
        playerScreen.x +
        this._halfGameWidth +
        offset.x +
        tile.xOffset,
    );
    const screenY = Math.floor(
      (entity.x + entity.y) * HALF_TILE_HEIGHT -
        HALF_TILE_HEIGHT -
        playerScreen.y +
        this._halfGameHeight +
        offset.y +
        tile.yOffset,
    );
    return { screenX, screenY };
  }

  private addCharacterSprites(
    entity: Entity,
    playerScreen: Vector2,
    justCharacter = false,
    alphaOverride?: number,
  ) {
    const character = this.client.getCharacterById(entity.typeId);
    if (!character) return;

    let dyingTicks = 0;
    let dying = false;
    let animation = this.client.animationController.characterAnimations.get(
      character.playerId,
    );
    if (animation instanceof CharacterDeathAnimation) {
      dying = true;
      dyingTicks = animation.ticks;
      if (animation.base) {
        animation = animation.base;
      }
    }

    if (animation) {
      animation.renderedFirstFrame = true;
    }

    const downRight = [Direction.Down, Direction.Right].includes(
      character.direction,
    );
    let characterFrame: CharacterFrame;
    let walkOffset = { x: 0, y: 0 };
    let coords: Vector2 = character.coords;
    switch (true) {
      case animation instanceof CharacterWalkAnimation: {
        walkOffset = dying
          ? WALK_OFFSETS[animation.animationFrame][animation.direction]
          : this.interpolateWalkOffset(
              animation.animationFrame,
              animation.direction,
            );
        coords = animation.from;
        characterFrame = downRight
          ? CharacterFrame.WalkingDownRight1 + animation.animationFrame
          : CharacterFrame.WalkingUpLeft1 + animation.animationFrame;
        break;
      }
      case animation instanceof CharacterAttackAnimation:
        characterFrame = downRight
          ? CharacterFrame.MeleeAttackDownRight1 + animation.animationFrame
          : CharacterFrame.MeleeAttackUpLeft1 + animation.animationFrame;
        break;
      case animation instanceof CharacterRangedAttackAnimation:
        characterFrame = downRight
          ? CharacterFrame.RangeAttackDownRight
          : CharacterFrame.RangeAttackUpLeft;
        break;
      case animation instanceof CharacterSpellChantAnimation:
        characterFrame = downRight
          ? CharacterFrame.RaisedHandDownRight
          : CharacterFrame.RaisedHandUpLeft;
        break;
      case character.sitState === SitState.Floor:
        characterFrame = downRight
          ? CharacterFrame.FloorDownRight
          : CharacterFrame.FloorUpLeft;
        break;
      case character.sitState === SitState.Chair:
        characterFrame = downRight
          ? CharacterFrame.ChairDownRight
          : CharacterFrame.ChairUpLeft;
        break;
      default:
        characterFrame = downRight
          ? CharacterFrame.StandingDownRight
          : CharacterFrame.StandingUpLeft;
        break;
    }

    const frame = this.client.atlas.getCharacterFrame(
      character.playerId,
      characterFrame,
    );
    if (!frame) return;

    const texture = this.client.atlas.getFrameTexture(frame);
    if (!texture) return;

    const screenCoordsX = (coords.x - coords.y) * HALF_TILE_WIDTH;
    const screenCoordsY = (coords.x + coords.y) * HALF_TILE_HEIGHT;
    const mirrored = [Direction.Right, Direction.Up].includes(
      character.direction,
    );
    const frameOffset = (
      CHARACTER_FRAME_OFFSETS[character.gender][characterFrame] as Record<
        Direction,
        { x: number; y: number }
      >
    )[character.direction];

    const screenX = Math.floor(
      screenCoordsX -
        playerScreen.x +
        this._halfGameWidth +
        walkOffset.x +
        frameOffset.x,
    );
    const screenY = Math.floor(
      screenCoordsY -
        playerScreen.y +
        this._halfGameHeight +
        frame.yOffset +
        walkOffset.y +
        frameOffset.y,
    );

    const rect = new Rectangle(
      {
        x: screenX + (mirrored ? frame.mirroredXOffset : frame.xOffset),
        y: screenY,
      },
      frame.w,
      frame.h,
    );
    setCharacterRectangle(character.playerId, rect);

    const effects = justCharacter
      ? []
      : (this._charEffects.get(character.playerId) ?? []);

    for (const effect of effects) {
      effect.target.rect = {
        position: {
          x:
            screenCoordsX -
            playerScreen.x +
            this._halfGameWidth -
            HALF_TILE_WIDTH +
            walkOffset.x,
          y: rect.position.y,
        },
        width: TILE_WIDTH,
        height: rect.height,
        depth: 0,
      };
      effect.renderedFirstFrame = true;
      this.addEffectBehindSprite(effect);
    }

    let alpha = alphaOverride ?? 1;
    if (dying) alpha = (dyingTicks / DEATH_TICKS) * (alphaOverride ?? 1);
    if (character.invisible && this.client.admin !== AdminLevel.Player) {
      alpha = Math.min(alpha, 0.4);
    }

    const isPlayer = entity.typeId === this.client.playerId;
    const visible =
      isPlayer ||
      !character.invisible ||
      this.client.admin !== AdminLevel.Player;

    if (visible) {
      const sprite = this._spritePool.acquire();
      sprite.texture = texture;
      if (mirrored) {
        // scale.x = -1 draws leftward from sprite.x, so place the right edge
        // at screenX + mirroredXOffset + frame.w to get left edge at screenX + mirroredXOffset
        sprite.scale.x = -1;
        sprite.x = Math.floor(screenX + frame.mirroredXOffset + frame.w);
      } else {
        sprite.x = Math.floor(screenX + frame.xOffset);
      }
      sprite.y = screenY;
      sprite.alpha = alpha;
      this.client.worldContainer.addChild(sprite);
    }

    for (const effect of effects) {
      this.addEffectTransparentSprite(effect);
      this.addEffectFrontSprite(effect);
    }

    if (
      !justCharacter &&
      (!character.invisible || this.client.admin !== AdminLevel.Player)
    ) {
      const bubble = this.client.animationController.characterChats.get(
        character.playerId,
      );
      const healthBar = this.client.animationController.characterHealthBars.get(
        character.playerId,
      );
      const emote = this.client.animationController.characterEmotes.get(
        character.playerId,
      );

      if (
        !bubble &&
        !healthBar &&
        !emote &&
        !this.client.commandController.debug &&
        (!(animation instanceof CharacterSpellChantAnimation) ||
          animation.animationFrame)
      ) {
        return;
      }

      const topCenter = {
        x: screenCoordsX - playerScreen.x + this._halfGameWidth + walkOffset.x,
        y: rect.position.y,
      };

      if (bubble) {
        const bs = bubble.getSprite(topCenter);
        if (bs) this.client.uiContainer.addChild(bs);
      }
      this.addHealthBarSprites(healthBar!, topCenter);
      if (emote) {
        this.addEmoteSprite(emote, topCenter);
      }
      if (
        animation instanceof CharacterSpellChantAnimation &&
        !animation.animationFrame
      ) {
        // spell chant visual is canvas-based — render to a sprite and add to uiContainer
        const tmpCanvas = document.createElement('canvas');
        const tmpCtx = tmpCanvas.getContext('2d')!;
        animation.render(topCenter, tmpCtx);
        if (tmpCanvas.width > 0 && tmpCanvas.height > 0) {
          const source = new CanvasSource({ resource: tmpCanvas });
          const tex = new Texture({ source });
          const sp = new Sprite(tex);
          sp.x = 0;
          sp.y = 0;
          this.client.uiContainer.addChild(sp);
        }
      }
    }
  }

  private addNpcSprites(entity: Entity, playerScreen: Vector2) {
    const npc = this.client.getNpcByIndex(entity.typeId);
    if (!npc) return;

    const record = this.client.getEnfRecordById(npc.id);
    if (!record) return;

    let dyingTicks = 0;
    let dying = false;
    let animation = this.client.animationController.npcAnimations.get(
      npc.index,
    );
    if (animation) {
      animation.renderedFirstFrame = true;
    }
    if (animation instanceof NpcDeathAnimation) {
      dying = true;
      dyingTicks = animation.ticks;
      if (animation.base) {
        animation = animation.base;
      }
    }

    const meta = this.client.getNpcMetadata(record.graphicId);
    const downRight = [Direction.Down, Direction.Right].includes(npc.direction);
    let walkOffset = { x: 0, y: 0 };
    let npcFrame: NpcFrame;
    let coords: Vector2 = npc.coords;

    switch (true) {
      case animation instanceof NpcWalkAnimation: {
        walkOffset = dying
          ? WALK_OFFSETS[animation.animationFrame][animation.direction]
          : this.interpolateWalkOffset(
              animation.animationFrame,
              animation.direction,
            );
        coords = animation.from;
        npcFrame = downRight
          ? NpcFrame.WalkingDownRight1 + animation.animationFrame
          : NpcFrame.WalkingUpLeft1 + animation.animationFrame;
        break;
      }
      case animation instanceof NpcAttackAnimation:
        npcFrame = downRight
          ? NpcFrame.AttackDownRight1 + animation.animationFrame
          : NpcFrame.AttackUpLeft1 + animation.animationFrame;
        break;
      default:
        npcFrame =
          (downRight ? NpcFrame.StandingDownRight1 : NpcFrame.StandingUpLeft1) +
          (meta.animatedStanding ? this.npcIdleAnimationFrame : 0);
        break;
    }

    const frame = this.client.atlas.getNpcFrame(record.graphicId, npcFrame);
    if (!frame) return;

    const texture = this.client.atlas.getFrameTexture(frame);
    if (!texture) return;

    const metaOffset = {
      x:
        meta.xOffset +
        ([NpcFrame.AttackDownRight2, NpcFrame.AttackUpLeft2].includes(npcFrame)
          ? meta.xOffsetAttack
          : 0),
      y: -meta.yOffset,
    };
    const mirrored = [Direction.Right, Direction.Up].includes(npc.direction);
    if (mirrored) metaOffset.x = -metaOffset.x;

    const additionalOffset = {
      x: walkOffset.x + metaOffset.x,
      y: walkOffset.y + metaOffset.y,
    };

    const screenCoordsX = (coords.x - coords.y) * HALF_TILE_WIDTH;
    const screenCoordsY = (coords.x + coords.y) * HALF_TILE_HEIGHT;
    const screenX = Math.floor(
      screenCoordsX - playerScreen.x + this._halfGameWidth + additionalOffset.x,
    );
    const screenY = Math.floor(
      screenCoordsY -
        playerScreen.y +
        this._halfGameHeight +
        frame.yOffset +
        additionalOffset.y,
    );

    const rect = new Rectangle(
      {
        x: screenX + (mirrored ? frame.mirroredXOffset : frame.xOffset),
        y: screenY,
      },
      frame.w,
      frame.h,
    );
    setNpcRectangle(npc.index, rect);

    const effects = this._npcEffects.get(npc.index) ?? [];
    for (const effect of effects) {
      effect.target.rect = {
        position: {
          x:
            screenCoordsX -
            playerScreen.x +
            this._halfGameWidth -
            HALF_TILE_WIDTH +
            walkOffset.x,
          y: rect.position.y,
        },
        width: TILE_WIDTH,
        height: rect.height,
        depth: 0,
      };
      effect.renderedFirstFrame = true;
      this.addEffectBehindSprite(effect);
    }

    let alpha = 1;
    if (meta.transparent && !dying) alpha = 0.4;
    else if (meta.transparent && dying)
      alpha = 0.4 * (dyingTicks / DEATH_TICKS);
    else if (dying) alpha = dyingTicks / DEATH_TICKS;

    const sprite = this._spritePool.acquire();
    sprite.texture = texture;
    if (mirrored) {
      // scale.x = -1 draws leftward from sprite.x, so place the right edge
      // at screenX + mirroredXOffset + frame.w to get left edge at screenX + mirroredXOffset
      sprite.scale.x = -1;
      sprite.x = Math.floor(screenX + frame.mirroredXOffset + frame.w);
    } else {
      sprite.x = Math.floor(screenX + frame.xOffset);
    }
    sprite.y = screenY;
    sprite.alpha = alpha;
    this.client.worldContainer.addChild(sprite);

    for (const effect of effects) {
      this.addEffectTransparentSprite(effect);
      this.addEffectFrontSprite(effect);
    }

    const bubble = this.client.animationController.npcChats.get(npc.index);
    const healthBar = this.client.animationController.npcHealthBars.get(
      npc.index,
    );

    if (!bubble && !healthBar && !this.client.commandController.debug) return;

    const aboveCoords = { x: coords.x - 1, y: coords.y - 1 };
    const aboveCoordsX = (aboveCoords.x - aboveCoords.y) * HALF_TILE_WIDTH;
    const aboveCoordsY = (aboveCoords.x + aboveCoords.y) * HALF_TILE_HEIGHT;
    const npcTopCenter = {
      x: Math.floor(
        aboveCoordsX - playerScreen.x + this._halfGameWidth + walkOffset.x,
      ),
      y: Math.floor(
        aboveCoordsY -
          playerScreen.y +
          this._halfGameHeight -
          meta.nameLabelOffset +
          walkOffset.y +
          16,
      ),
    };

    if (bubble) {
      const bs = bubble.getSprite(npcTopCenter);
      if (bs) this.client.uiContainer.addChild(bs);
    }
    if (healthBar) {
      this.addHealthBarSprites(healthBar, npcTopCenter);
    }
  }

  private addItemSprite(entity: Entity, playerScreen: Vector2) {
    const item = this.client.getItemByIndex(entity.typeId);
    if (!item) return;

    const record = this.client.getEifRecordById(item.id);
    if (!record) return;

    const gfxId = getItemGraphicId(item.id, record.graphicId, item.amount);
    const frame = this.client.atlas.getItem(gfxId);
    if (!frame) return;

    const texture = this.client.atlas.getFrameTexture(frame);
    if (!texture) return;

    const tileScreenX = (item.coords.x - item.coords.y) * HALF_TILE_WIDTH;
    const tileScreenY = (item.coords.x + item.coords.y) * HALF_TILE_HEIGHT;
    const screenX = Math.floor(
      tileScreenX - playerScreen.x + this._halfGameWidth + frame.xOffset,
    );
    const screenY = Math.floor(
      tileScreenY - playerScreen.y + this._halfGameHeight + frame.yOffset,
    );

    const sprite = this._spritePool.acquire();
    sprite.texture = texture;
    sprite.position.set(screenX, screenY);
    this.client.worldContainer.addChild(sprite);
  }

  private addCursorSprites(entity: Entity, playerScreen: Vector2) {
    if (
      this.client.mouseCoords!.x < 0 ||
      this.client.mouseCoords!.x > this.client.map!.width ||
      this.client.mouseCoords!.y < 0 ||
      this.client.mouseCoords!.y > this.client.map!.height
    ) {
      return;
    }

    const frame = this.client.atlas.getStaticEntry(StaticAtlasEntryType.Cursor);
    if (!frame) return;

    const mx = this.client.mouseCoords!.x;
    const my = this.client.mouseCoords!.y;
    const tileScreenX = (mx - my) * HALF_TILE_WIDTH;
    const tileScreenY = (mx + my) * HALF_TILE_HEIGHT;
    const sourceX = entity.typeId * TILE_WIDTH;

    const screenX = Math.floor(
      tileScreenX - HALF_TILE_WIDTH - playerScreen.x + this._halfGameWidth,
    );
    const screenY = Math.floor(
      tileScreenY - HALF_TILE_HEIGHT - playerScreen.y + this._halfGameHeight,
    );

    const cursorTexture = this.client.atlas.getFrameTexture({
      atlasIndex: frame.atlasIndex,
      x: frame.x + sourceX,
      y: frame.y,
      w: TILE_WIDTH,
      h: TILE_HEIGHT,
    });
    if (cursorTexture) {
      const sprite = this._spritePool.acquire();
      sprite.texture = cursorTexture;
      sprite.position.set(screenX, screenY);
      this.client.worldContainer.addChild(sprite);
    }

    const animation = this.client.animationController.cursorClickAnimation;
    if (animation) {
      animation.renderedFirstFrame = true;
      const animX = Math.floor(
        (animation.at.x - animation.at.y) * HALF_TILE_WIDTH -
          HALF_TILE_WIDTH -
          playerScreen.x +
          this._halfGameWidth,
      );
      const animY = Math.floor(
        (animation.at.x + animation.at.y) * HALF_TILE_HEIGHT -
          HALF_TILE_HEIGHT -
          playerScreen.y +
          this._halfGameHeight,
      );
      const animSourceX = Math.floor(
        (3 + animation.animationFrame) * TILE_WIDTH,
      );
      const animTexture = this.client.atlas.getFrameTexture({
        atlasIndex: frame.atlasIndex,
        x: frame.x + animSourceX,
        y: frame.y,
        w: TILE_WIDTH,
        h: TILE_HEIGHT,
      });
      if (animTexture) {
        const sprite = this._spritePool.acquire();
        sprite.texture = animTexture;
        sprite.position.set(animX, animY);
        this.client.worldContainer.addChild(sprite);
      }
    }
  }

  private addHealthBarSprites(healthBar: HealthBar | null, position: Vector2) {
    if (!healthBar) return;
    healthBar.renderedFirstFrame = true;

    const frame = this.client.atlas.getStaticEntry(
      StaticAtlasEntryType.HealthBars,
    );
    if (!frame) return;

    const offsetY = -10;

    const bgTexture = this.client.atlas.getFrameTexture({
      atlasIndex: frame.atlasIndex,
      x: frame.x,
      y: frame.y + 28,
      w: 40,
      h: 7,
    });
    if (bgTexture) {
      const bgSprite = this._spritePool.acquire();
      bgSprite.texture = bgTexture;
      bgSprite.position.set(position.x - 20, position.y - 7 + offsetY);
      this.client.uiContainer.addChild(bgSprite);
    }

    let barOffsetY: number;
    if (healthBar.percentage < 25) {
      barOffsetY = 23;
    } else if (healthBar.percentage < 50) {
      barOffsetY = 16;
    } else {
      barOffsetY = 9;
    }

    const fillW = Math.floor(40 * (healthBar.percentage / 100));
    if (fillW > 0) {
      const fillTexture = this.client.atlas.getFrameTexture({
        atlasIndex: frame.atlasIndex,
        x: frame.x + 2,
        y: frame.y + barOffsetY,
        w: fillW,
        h: 3,
      });
      if (fillTexture) {
        const fillSprite = this._spritePool.acquire();
        fillSprite.texture = fillTexture;
        fillSprite.position.set(position.x - 18, position.y - 5 + offsetY);
        this.client.uiContainer.addChild(fillSprite);
      }
    }

    const amount = healthBar.damage || healthBar.heal;
    if (!amount) {
      const missFrame = this.client.atlas.getStaticEntry(
        StaticAtlasEntryType.Miss,
      );
      if (!missFrame) return;
      const missTexture = this.client.atlas.getFrameTexture(missFrame);
      if (missTexture) {
        const missSprite = this._spritePool.acquire();
        missSprite.texture = missTexture;
        missSprite.position.set(
          position.x - (missFrame.w >> 1),
          position.y - 35 + healthBar.ticks,
        );
        this.client.uiContainer.addChild(missSprite);
      }
      return;
    }

    const amountAsText = amount.toString();
    const chars = amountAsText.split('');
    this.damageNumberCanvas.width = chars.length * 9;
    this.damageNumberCanvas.height = 12;
    this.damageNumberCtx.clearRect(
      0,
      0,
      this.damageNumberCanvas.width,
      this.damageNumberCanvas.height,
    );

    const numbersFrame = this.client.atlas.getStaticEntry(
      healthBar.heal
        ? StaticAtlasEntryType.HealNumbers
        : StaticAtlasEntryType.DamageNumbers,
    );
    if (!numbersFrame) return;

    const numbersAtlas = this.client.atlas.getAtlas(numbersFrame.atlasIndex);
    if (!numbersAtlas) return;

    let index = 0;
    for (const char of chars) {
      const number = Number.parseInt(char, 10);
      this.damageNumberCtx.drawImage(
        numbersAtlas,
        numbersFrame.x + number * 9,
        numbersFrame.y,
        9,
        12,
        index * 9,
        0,
        9,
        12,
      );
      index++;
    }

    if (!this.damageNumberSource) {
      this.damageNumberSource = new CanvasSource({
        resource: this.damageNumberCanvas,
      });
      this.damageNumberTexture = new Texture({
        source: this.damageNumberSource,
      });
    } else {
      this.damageNumberSource.update();
    }

    const dnSprite = this._spritePool.acquire();
    dnSprite.texture = this.damageNumberTexture!;
    dnSprite.position.set(
      position.x - this.damageNumberCanvas.width / 2,
      position.y - 35 + healthBar.ticks,
    );
    this.client.uiContainer.addChild(dnSprite);
  }

  private addEmoteSprite(emote: Emote, position: { x: number; y: number }) {
    emote.renderedFirstFrame = true;

    const frame = this.client.atlas.getEmoteFrame(
      emote.type,
      emote.animationFrame,
    );
    if (!frame) return;

    const texture = this.client.atlas.getFrameTexture(frame);
    if (!texture) return;

    const sprite = this._spritePool.acquire();
    sprite.texture = texture;
    sprite.position.set(
      position.x + frame.xOffset,
      position.y + frame.yOffset - 25,
    );
    sprite.alpha = emote.ticks / EMOTE_ANIMATION_TICKS;
    this.client.uiContainer.addChild(sprite);
  }

  private addEffectBehindSprite(effect: EffectAnimation) {
    const frame = this.client.atlas.getEffectBehindFrame(
      effect.id,
      effect.animationFrame,
    );
    if (!frame || !effect.target.rect) return;

    const texture = this.client.atlas.getFrameTexture(frame);
    if (!texture) return;

    const sprite = this._spritePool.acquire();
    sprite.texture = texture;
    sprite.position.set(
      Math.floor(
        effect.target.rect.position.x +
          (effect.target.rect.width >> 1) +
          frame.xOffset,
      ),
      Math.floor(
        effect.target.rect.position.y +
          effect.target.rect.height -
          TILE_HEIGHT -
          HALF_TILE_HEIGHT +
          frame.yOffset,
      ),
    );
    this.client.worldContainer.addChild(sprite);
  }

  private addEffectTransparentSprite(effect: EffectAnimation) {
    const frame = this.client.atlas.getEffectTransparentFrame(
      effect.id,
      effect.animationFrame,
    );
    if (!frame || !effect.target.rect) return;

    const texture = this.client.atlas.getFrameTexture(frame);
    if (!texture) return;

    const sprite = this._spritePool.acquire();
    sprite.texture = texture;
    sprite.alpha = 0.4;
    sprite.position.set(
      Math.floor(
        effect.target.rect.position.x +
          (effect.target.rect.width >> 1) +
          frame.xOffset,
      ),
      Math.floor(
        effect.target.rect.position.y +
          effect.target.rect.height -
          TILE_HEIGHT -
          HALF_TILE_HEIGHT +
          frame.yOffset,
      ),
    );
    this.client.worldContainer.addChild(sprite);
  }

  private addEffectFrontSprite(effect: EffectAnimation) {
    const frame = this.client.atlas.getEffectFrontFrame(
      effect.id,
      effect.animationFrame,
    );
    if (!frame || !effect.target.rect) return;

    const texture = this.client.atlas.getFrameTexture(frame);
    if (!texture) return;

    const sprite = this._spritePool.acquire();
    sprite.texture = texture;
    sprite.position.set(
      Math.floor(
        effect.target.rect.position.x +
          (effect.target.rect.width >> 1) +
          frame.xOffset,
      ),
      Math.floor(
        effect.target.rect.position.y +
          effect.target.rect.height -
          TILE_HEIGHT -
          HALF_TILE_HEIGHT +
          frame.yOffset,
      ),
    );
    this.client.worldContainer.addChild(sprite);
  }

  private addNameplateSprites(playerScreen: Vector2) {
    if (!this.client.mousePosition) return;

    const coords = { x: 0, y: 0 };
    const offset = { x: 0, y: 0 };
    let name = '';
    let color = COLORS.Nameplate;
    const characterRect = getCharacterIntersecting(this.client.mousePosition);
    if (characterRect) {
      const character = this.client.getCharacterById(characterRect.id);
      const bubble =
        character &&
        !!this.client.animationController.characterChats.get(
          character.playerId,
        );
      const bar =
        character &&
        !!this.client.animationController.characterHealthBars.get(
          character.playerId,
        );
      let animation =
        character &&
        this.client.animationController.characterAnimations.get(
          character.playerId,
        );
      let dying = false;

      if (animation instanceof CharacterDeathAnimation) {
        dying = true;
        if (animation.base) animation = animation.base;
      }

      if (
        !bubble &&
        !bar &&
        !(animation instanceof CharacterDeathAnimation) &&
        character &&
        (!character.invisible || this.client.admin !== AdminLevel.Player)
      ) {
        name = capitalize(character.name);
        coords.x = character.coords.x;
        coords.y = character.coords.y;

        switch (character.sitState) {
          case SitState.Floor:
            offset.y -= 50;
            break;
          case SitState.Chair:
            offset.y -= 56;
            break;
          case SitState.Stand:
            offset.y -= 72;
            break;
        }

        if (character.guildTag !== '   ') {
          name += ` ${character.guildTag}`;
        }

        if (animation instanceof CharacterWalkAnimation) {
          const walkOffset = dying
            ? WALK_OFFSETS[animation.animationFrame][animation.direction]
            : this.interpolateWalkOffset(
                animation.animationFrame,
                animation.direction,
              );
          offset.x += walkOffset.x;
          offset.y += walkOffset.y;
          coords.x = animation.from.x;
          coords.y = animation.from.y;
        }
      }
    }

    if (!name) {
      const npcRect = getNpcIntersecting(this.client.mousePosition);
      if (npcRect) {
        const npc = this.client.getNpcByIndex(npcRect.id);
        const bubble =
          npc && !!this.client.animationController.npcChats.get(npc.index);
        const bar =
          npc && !!this.client.animationController.npcHealthBars.get(npc.index);
        let animation =
          npc && this.client.animationController.npcAnimations.get(npc.index);
        let dying = false;

        if (animation instanceof NpcDeathAnimation) {
          dying = true;
          if (animation.base) animation = animation.base;
        }

        if (
          !bubble &&
          !bar &&
          !(animation instanceof NpcDeathAnimation) &&
          npc
        ) {
          const record = this.client.getEnfRecordById(npc.id);
          if (record) {
            name = record.name;
            coords.x = npc.coords.x;
            coords.y = npc.coords.y;
            offset.y -= TILE_HEIGHT;

            const meta = this.client.getNpcMetadata(record.graphicId);
            if (meta) {
              offset.y -= meta.nameLabelOffset - 4;
            }

            if (animation instanceof NpcWalkAnimation) {
              const walkOffset = dying
                ? WALK_OFFSETS[animation.animationFrame][animation.direction]
                : this.interpolateWalkOffset(
                    animation.animationFrame,
                    animation.direction,
                  );
              offset.x += walkOffset.x;
              offset.y += walkOffset.y;
              coords.x = animation.from.x;
              coords.y = animation.from.y;
            }
          }
        }
      }
    }

    if (!name) {
      if (!this.client.mouseCoords) return;

      const items = this.client.nearby.items.filter(
        (i) =>
          i.coords.x === this.client.mouseCoords!.x &&
          i.coords.y === this.client.mouseCoords!.y,
      );
      if (!items.length) return;

      items.sort((a, b) => b.uid - a.uid);
      const item = items[0];
      const data = this.client.getEifRecordById(item.id);
      if (!data) return;

      switch (data.special) {
        case ItemSpecial.Rare:
          color = COLORS.NameplateRare;
          break;
        case ItemSpecial.Legendary:
          color = COLORS.NameplateLegendary;
          break;
        case ItemSpecial.Unique:
          color = COLORS.NameplateUnique;
          break;
        case ItemSpecial.Lore:
          color = COLORS.NameplateLore;
          break;
      }

      name =
        item.id === 1
          ? `${item.amount} ${data.name}`
          : item.amount > 1
            ? `${data.name} x${item.amount}`
            : data.name;
      coords.x = item.coords.x;
      coords.y = item.coords.y;
      offset.y -= HALF_TILE_HEIGHT + 6;
    }

    if (!name) return;

    const positionX = (coords.x - coords.y) * HALF_TILE_WIDTH;
    const positionY = (coords.x + coords.y) * HALF_TILE_HEIGHT;
    const drawX = Math.floor(
      positionX - playerScreen.x + this._halfGameWidth + offset.x,
    );
    const drawY = Math.floor(
      positionY - playerScreen.y + this._halfGameHeight + offset.y,
    );

    const shadowSprite = this.client.sans11.getSprite(
      name,
      { x: drawX + 1, y: drawY + 1 },
      '#000',
    );
    if (shadowSprite) this.client.uiContainer.addChild(shadowSprite);

    const nameSprite = this.client.sans11.getSprite(
      name,
      { x: drawX, y: drawY },
      color,
    );
    if (nameSprite) this.client.uiContainer.addChild(nameSprite);
  }

  private addPlayerMenuSprites() {
    if (!this.client.menuPlayerId) return;

    const rect = getCharacterRectangle(this.client.menuPlayerId);
    if (!rect) {
      this.client.menuPlayerId = 0;
      return;
    }

    const frame = this.client.atlas.getStaticEntry(
      StaticAtlasEntryType.PlayerMenu,
    );
    if (!frame) return;

    const menuTexture = this.client.atlas.getFrameTexture({
      atlasIndex: frame.atlasIndex,
      x: frame.x,
      y: frame.y,
      w: PLAYER_MENU_WIDTH,
      h: PLAYER_MENU_HEIGHT,
    });
    if (menuTexture) {
      const sprite = this._spritePool.acquire();
      sprite.texture = menuTexture;
      sprite.position.set(rect.position.x + rect.width + 10, rect.position.y);
      this.client.uiContainer.addChild(sprite);
    }

    const hovered = this.client.mouseController.getHoveredPlayerMenuItem();
    if (hovered !== undefined) {
      const hoverTexture = this.client.atlas.getFrameTexture({
        atlasIndex: frame.atlasIndex,
        x: frame.x + PLAYER_MENU_WIDTH,
        y: frame.y + PLAYER_MENU_OFFSET_Y + hovered * PLAYER_MENU_ITEM_HEIGHT,
        w: PLAYER_MENU_WIDTH,
        h: PLAYER_MENU_ITEM_HEIGHT,
      });
      if (hoverTexture) {
        const hoverSprite = this._spritePool.acquire();
        hoverSprite.texture = hoverTexture;
        hoverSprite.position.set(
          rect.position.x + rect.width + 10,
          rect.position.y +
            PLAYER_MENU_OFFSET_Y +
            hovered * PLAYER_MENU_ITEM_HEIGHT,
        );
        this.client.uiContainer.addChild(hoverSprite);
      }
    }
  }

  renderNameplate(playerScreen: Vector2, ctx: CanvasRenderingContext2D) {
    if (!this.client.mousePosition) {
      return;
    }

    const frame = this.client.atlas.getStaticEntry(StaticAtlasEntryType.Sans11);
    if (!frame) {
      return;
    }

    const atlas = this.client.atlas.getAtlas(frame.atlasIndex);
    if (!atlas) {
      return;
    }

    const coords = { x: 0, y: 0 };
    const offset = { x: 0, y: 0 };
    let name = '';
    let color = COLORS.Nameplate;
    const characterRect = getCharacterIntersecting(this.client.mousePosition);
    if (characterRect) {
      const character = this.client.getCharacterById(characterRect.id);
      const bubble =
        character &&
        !!this.client.animationController.characterChats.get(
          character.playerId,
        );
      const bar =
        character &&
        !!this.client.animationController.characterHealthBars.get(
          character.playerId,
        );
      let animation =
        character &&
        this.client.animationController.characterAnimations.get(
          character.playerId,
        );
      let dying = false;

      if (animation instanceof CharacterDeathAnimation) {
        dying = true;
        if (animation.base) {
          animation = animation.base;
        }
      }

      if (
        !bubble &&
        !bar &&
        !(animation instanceof CharacterDeathAnimation) &&
        character &&
        (!character.invisible || this.client.admin !== AdminLevel.Player)
      ) {
        name = capitalize(character.name);
        coords.x = character.coords.x;
        coords.y = character.coords.y;

        // TODO: Friend color
        // if (this.client.isFriend(character.name)) {
        // color = COLORS.NameplateFriend;

        switch (character.sitState) {
          case SitState.Floor:
            offset.y -= 50;
            break;
          case SitState.Chair:
            offset.y -= 56;
            break;
          case SitState.Stand:
            offset.y -= 72;
            break;
        }

        if (character.guildTag !== '   ') {
          name += ` ${character.guildTag}`;
        }

        if (animation instanceof CharacterWalkAnimation) {
          const walkOffset = dying
            ? WALK_OFFSETS[animation.animationFrame][animation.direction]
            : this.interpolateWalkOffset(
                animation.animationFrame,
                animation.direction,
              );
          offset.x += walkOffset.x;
          offset.y += walkOffset.y;
          coords.x = animation.from.x;
          coords.y = animation.from.y;
        }
      }
    }

    if (!name) {
      const npcRect = getNpcIntersecting(this.client.mousePosition);
      if (npcRect) {
        const npc = this.client.getNpcByIndex(npcRect.id);
        const bubble =
          npc && !!this.client.animationController.npcChats.get(npc.index);
        const bar =
          npc && !!this.client.animationController.npcHealthBars.get(npc.index);
        let animation =
          npc && this.client.animationController.npcAnimations.get(npc.index);
        let dying = false;

        if (animation instanceof NpcDeathAnimation) {
          dying = true;
          if (animation.base) {
            animation = animation.base;
          }
        }

        if (
          !bubble &&
          !bar &&
          !(animation instanceof NpcDeathAnimation) &&
          npc
        ) {
          const record = this.client.getEnfRecordById(npc.id);
          if (record) {
            name = record.name;
            coords.x = npc.coords.x;
            coords.y = npc.coords.y;
            offset.y -= TILE_HEIGHT;

            const meta = this.client.getNpcMetadata(record.graphicId);
            if (meta) {
              offset.y -= meta.nameLabelOffset - 4;
            }

            if (animation instanceof NpcWalkAnimation) {
              const walkOffset = dying
                ? WALK_OFFSETS[animation.animationFrame][animation.direction]
                : this.interpolateWalkOffset(
                    animation.animationFrame,
                    animation.direction,
                  );
              offset.x += walkOffset.x;
              offset.y += walkOffset.y;
              coords.x = animation.from.x;
              coords.y = animation.from.y;
            }
          }
        }
      }
    }

    if (!name) {
      if (!this.client.mouseCoords) {
        return;
      }

      const items = this.client.nearby.items.filter(
        (i) =>
          i.coords.x === this.client.mouseCoords!.x &&
          i.coords.y === this.client.mouseCoords!.y,
      );
      if (!items.length) {
        return false;
      }

      items.sort((a, b) => b.uid - a.uid);

      const item = items[0];

      const data = this.client.getEifRecordById(item.id);
      if (!data) {
        return;
      }

      switch (data.special) {
        case ItemSpecial.Rare:
          color = COLORS.NameplateRare;
          break;
        case ItemSpecial.Legendary:
          color = COLORS.NameplateLegendary;
          break;
        case ItemSpecial.Unique:
          color = COLORS.NameplateUnique;
          break;
        case ItemSpecial.Lore:
          color = COLORS.NameplateLore;
          break;
      }

      name =
        item.id === 1
          ? `${item.amount} ${data.name}`
          : item.amount > 1
            ? `${data.name} x${item.amount}`
            : data.name;
      coords.x = item.coords.x;
      coords.y = item.coords.y;

      offset.y -= HALF_TILE_HEIGHT + 6;
    }

    const positionX = (coords.x - coords.y) * HALF_TILE_WIDTH;
    const positionY = (coords.x + coords.y) * HALF_TILE_HEIGHT;

    const drawX = Math.floor(
      positionX - playerScreen.x + this._halfGameWidth + offset.x,
    );

    const drawY = Math.floor(
      positionY - playerScreen.y + this._halfGameHeight + offset.y,
    );

    this.client.sans11.render(
      ctx,
      name,
      { x: drawX + 1, y: drawY + 1 },
      '#000',
    );

    this.client.sans11.render(ctx, name, { x: drawX, y: drawY }, color);
  }

  renderPlayerMenu(ctx: CanvasRenderingContext2D) {
    if (!this.client.menuPlayerId) {
      return;
    }

    const rect = getCharacterRectangle(this.client.menuPlayerId);
    if (!rect) {
      this.client.menuPlayerId = 0;
      return;
    }

    const frame = this.client.atlas.getStaticEntry(
      StaticAtlasEntryType.PlayerMenu,
    );
    if (!frame) {
      return;
    }

    const atlas = this.client.atlas.getAtlas(frame.atlasIndex);
    if (!atlas) {
      return;
    }

    ctx.drawImage(
      atlas,
      frame.x,
      frame.y,
      PLAYER_MENU_WIDTH,
      PLAYER_MENU_HEIGHT,
      rect.position.x + rect.width + 10,
      rect.position.y,
      PLAYER_MENU_WIDTH,
      PLAYER_MENU_HEIGHT,
    );

    const hovered = this.client.mouseController.getHoveredPlayerMenuItem();
    if (hovered !== undefined) {
      ctx.drawImage(
        atlas,
        frame.x + PLAYER_MENU_WIDTH,
        frame.y + PLAYER_MENU_OFFSET_Y + hovered * PLAYER_MENU_ITEM_HEIGHT,
        PLAYER_MENU_WIDTH,
        PLAYER_MENU_ITEM_HEIGHT,
        rect.position.x + rect.width + 10,
        rect.position.y +
          PLAYER_MENU_OFFSET_Y +
          hovered * PLAYER_MENU_ITEM_HEIGHT,
        PLAYER_MENU_WIDTH,
        PLAYER_MENU_ITEM_HEIGHT,
      );
    }
  }

  renderGround() {
    // Check atlas readiness for every ground and shadow entity before committing.
    // Skip typeId=0 ground tiles — they have no atlas entry and renderTile ignores them.
    for (const entity of this.allGroundEntities) {
      if (entity.typeId === 0) continue;
      const tile = this.client.atlas.getTile(GfxType.MapTiles, entity.typeId);
      if (!tile || !this.client.atlas.getAtlas(tile.atlasIndex)) return; // retry next frame
    }
    for (const entity of this.allShadowEntities) {
      const tile = this.client.atlas.getTile(
        LAYER_GFX_MAP[entity.layer],
        entity.typeId,
      );
      if (!tile || !this.client.atlas.getAtlas(tile.atlasIndex)) return; // retry next frame
    }

    // Separate animated ground tiles from static ones.
    const animatedGround = this.allGroundEntities.filter((e) => {
      const tile = this.client.atlas.getTile(GfxType.MapTiles, e.typeId);
      return tile && tile.w > TILE_WIDTH;
    });
    const staticGround = this.allGroundEntities.filter((e) => {
      const tile = this.client.atlas.getTile(GfxType.MapTiles, e.typeId);
      return tile && tile.w <= TILE_WIDTH;
    });

    // Non-animated maps: 1 frame (static ground + shadows).
    // Animated maps: 5 frames —
    //   [0]  : static ground only (no shadows — shadows belong to the animated overlay)
    //   [1-4]: animated tiles at animation frame 0-3 + all shadows (sparse overlay)
    // Render loop blits [0] always, then [1 + animationFrame] on top for animated maps.
    this.groundFrameCount = animatedGround.length > 0 ? 5 : 1;

    // Use a fake playerScreen so tiles land at their correct positions in the big canvas.
    // Derivation: bigX = tileScreen.x - HW + originX
    //   = tileScreen.x - HW - fakePS.x + halfGameWidth
    //   → fakePS.x = halfGameWidth - originX
    const halfGameWidth = this._halfGameWidth;
    const halfGameHeight = this._halfGameHeight;
    const fakePlayerScreen = {
      x: halfGameWidth - this.groundOriginX,
      y: halfGameHeight - this.groundOriginY,
    };

    const savedFrame = this.animationFrame;
    this.groundImages = new Array(this.groundFrameCount).fill(null);
    this.groundSources = new Array(this.groundFrameCount).fill(null);
    this.groundTextures = new Array(this.groundFrameCount).fill(null);
    this.groundImagesLoaded = 0;

    for (let f = 0; f < this.groundFrameCount; f++) {
      this.groundCtx.clearRect(
        0,
        0,
        this.groundCanvas.width,
        this.groundCanvas.height,
      );

      if (this.groundFrameCount === 1) {
        // Non-animated map: single frame with everything.
        for (const entity of this.allGroundEntities) {
          this.renderTile(entity, fakePlayerScreen, this.groundCtx);
        }
        for (const entity of this.allShadowEntities) {
          this.renderTile(entity, fakePlayerScreen, this.groundCtx);
        }
      } else if (f === 0) {
        // Animated map base: static ground only — no shadows, no animated tiles.
        for (const entity of staticGround) {
          this.renderTile(entity, fakePlayerScreen, this.groundCtx);
        }
      } else {
        // Animated map overlay frames 1-4: animated tiles at anim frame (f-1) + shadows.
        // Shadows are here (not in frame 0) so they never double up.
        this.animationFrame = f - 1;
        for (const entity of animatedGround) {
          this.renderTile(entity, fakePlayerScreen, this.groundCtx);
        }
        for (const entity of this.allShadowEntities) {
          this.renderTile(entity, fakePlayerScreen, this.groundCtx);
        }
      }

      const dataUrl = this.groundCanvas.toDataURL();
      const img = new Image();
      img.onload = () => {
        this.groundImagesLoaded++;
        if (this.groundImagesLoaded >= this.groundFrameCount) {
          // All frames decoded — force viewport rebuild to drop ground/shadow fallbacks
          this.cachedViewportKey = '';
        }
      };
      img.src = dataUrl;
      this.groundImages[f] = img;

      // PixiJS path: copy canvas to a dedicated offscreen canvas and wrap in CanvasSource
      const offscreen = document.createElement('canvas');
      offscreen.width = this.groundCanvas.width;
      offscreen.height = this.groundCanvas.height;
      offscreen.getContext('2d')!.drawImage(this.groundCanvas, 0, 0);
      const source = new CanvasSource({ resource: offscreen });
      const texture = new Texture({ source });
      this.groundSources[f] = source;
      this.groundTextures[f] = texture;
    }

    this.animationFrame = savedFrame;
    // Mark clean so we don't re-render while images are decoding asynchronously
    this.groundDirty = false;
  }

  renderTile(
    entity: Entity,
    playerScreen: Vector2,
    ctx: CanvasRenderingContext2D,
  ) {
    if (entity.layer === Layer.Ground && entity.typeId === 0) {
      return;
    }

    this._coordsBuffer.x = entity.x;
    this._coordsBuffer.y = entity.y;

    let bmpOffset = 0;

    if (entity.layer === Layer.DownWall || entity.layer === Layer.RightWall) {
      const door = this.client.mapController.getDoor(this._coordsBuffer);
      if (door?.open) {
        bmpOffset = 1;
      }
    }

    const spec = this.getTileSpec(entity.x, entity.y);
    if (entity.layer === Layer.Objects) {
      if (spec === MapTileSpec.TimedSpikes && !this.timedSpikesTicks) {
        return;
      }

      if (
        spec === MapTileSpec.HiddenSpikes &&
        !this.client.nearby.characters.some(
          (c) => c.coords.x === entity.x && c.coords.y === entity.y,
        )
      ) {
        return;
      }
    }

    const tile = this.client.atlas.getTile(
      LAYER_GFX_MAP[entity.layer],
      entity.typeId + bmpOffset,
    );
    if (!tile) {
      return;
    }

    const atlas = this.client.atlas.getAtlas(tile.atlasIndex);
    if (!atlas) {
      return;
    }

    const offset = this.getOffset(entity.layer, tile.w, tile.h);
    const tileScreenX = (entity.x - entity.y) * HALF_TILE_WIDTH;
    const tileScreenY = (entity.x + entity.y) * HALF_TILE_HEIGHT;

    const screenX = Math.floor(
      tileScreenX -
        HALF_TILE_WIDTH -
        playerScreen.x +
        this._halfGameWidth +
        offset.x +
        tile.xOffset,
    );
    const screenY = Math.floor(
      tileScreenY -
        HALF_TILE_HEIGHT -
        playerScreen.y +
        this._halfGameHeight +
        offset.y +
        tile.yOffset,
    );

    if (this.client.mapController.getDoor(this._coordsBuffer)) {
      setDoorRectangle(
        this._coordsBuffer,
        new Rectangle(
          { x: screenX, y: screenY + tile.h - DOOR_HEIGHT },
          tile.w,
          DOOR_HEIGHT,
        ),
      );
    } else if (this.getSign(entity.x, entity.y)) {
      setSignRectangle(
        this._coordsBuffer,
        new Rectangle({ x: screenX, y: screenY }, tile.w, tile.h),
      );
    } else if (spec === MapTileSpec.BankVault) {
      setLockerRectangle(
        this._coordsBuffer,
        new Rectangle({ x: screenX, y: screenY }, tile.w, tile.h),
      );
    } else if (
      spec !== null &&
      spec >= MapTileSpec.Board1 &&
      spec <= MapTileSpec.Board8
    ) {
      setBoardRectangle(
        this._coordsBuffer,
        new Rectangle({ x: screenX, y: screenY }, tile.w, tile.h),
      );
    }

    if (entity.layer === Layer.Shadow) {
      ctx.globalAlpha = 0.2;
    } else {
      ctx.globalAlpha = 1;
    }

    if (entity.layer === Layer.Ground && tile.w > TILE_WIDTH) {
      ctx.drawImage(
        atlas,
        tile.x + this.animationFrame * TILE_WIDTH,
        tile.y,
        TILE_WIDTH,
        TILE_HEIGHT,
        screenX,
        screenY,
        TILE_WIDTH,
        TILE_HEIGHT,
      );
    } else if (
      tile.w > 120 &&
      [Layer.DownWall, Layer.RightWall].includes(entity.layer)
    ) {
      const frameWidth = tile.w / 4;
      ctx.drawImage(
        atlas,
        tile.x + this.animationFrame * frameWidth,
        tile.y,
        frameWidth,
        tile.h,
        screenX,
        screenY,
        frameWidth,
        tile.h,
      );
    } else {
      ctx.drawImage(
        atlas,
        tile.x,
        tile.y,
        tile.w,
        tile.h,
        screenX,
        screenY,
        tile.w,
        tile.h,
      );
    }
    if (entity.layer === Layer.Shadow) {
      ctx.globalAlpha = 1;
    }
  }

  renderCharacter(
    entity: Entity,
    playerScreen: Vector2,
    ctx: CanvasRenderingContext2D,
    justCharacter = false,
  ) {
    const character = this.client.getCharacterById(entity.typeId);
    if (!character) {
      return;
    }

    let dyingTicks = 0;
    let dying = false;
    let animation = this.client.animationController.characterAnimations.get(
      character.playerId,
    );
    if (animation instanceof CharacterDeathAnimation) {
      dying = true;
      dyingTicks = animation.ticks;
      if (animation.base) {
        animation = animation.base;
      }
    }

    if (animation) {
      animation.renderedFirstFrame = true;
    }

    const downRight = [Direction.Down, Direction.Right].includes(
      character.direction,
    );
    let characterFrame: CharacterFrame;
    let walkOffset = { x: 0, y: 0 };
    let coords: Vector2 = character.coords;
    switch (true) {
      case animation instanceof CharacterWalkAnimation: {
        walkOffset = dying
          ? WALK_OFFSETS[animation.animationFrame][animation.direction]
          : this.interpolateWalkOffset(
              animation.animationFrame,
              animation.direction,
            );
        coords = animation.from;
        characterFrame = downRight
          ? CharacterFrame.WalkingDownRight1 + animation.animationFrame
          : CharacterFrame.WalkingUpLeft1 + animation.animationFrame;
        break;
      }
      case animation instanceof CharacterAttackAnimation:
        characterFrame = downRight
          ? CharacterFrame.MeleeAttackDownRight1 + animation.animationFrame
          : CharacterFrame.MeleeAttackUpLeft1 + animation.animationFrame;
        break;
      case animation instanceof CharacterRangedAttackAnimation:
        characterFrame = downRight
          ? CharacterFrame.RangeAttackDownRight
          : CharacterFrame.RangeAttackUpLeft;
        break;
      case animation instanceof CharacterSpellChantAnimation:
        characterFrame = downRight
          ? CharacterFrame.RaisedHandDownRight
          : CharacterFrame.RaisedHandUpLeft;
        break;
      case character.sitState === SitState.Floor:
        characterFrame = downRight
          ? CharacterFrame.FloorDownRight
          : CharacterFrame.FloorUpLeft;
        break;
      case character.sitState === SitState.Chair: {
        characterFrame = downRight
          ? CharacterFrame.ChairDownRight
          : CharacterFrame.ChairUpLeft;
        break;
      }
      default:
        characterFrame = downRight
          ? CharacterFrame.StandingDownRight
          : CharacterFrame.StandingUpLeft;
        break;
    }

    const frame = this.client.atlas.getCharacterFrame(
      character.playerId,
      characterFrame,
    );
    if (!frame) {
      return;
    }

    const atlas = this.client.atlas.getAtlas(frame.atlasIndex);
    if (!atlas) {
      return;
    }

    const screenCoordsX = (coords.x - coords.y) * HALF_TILE_WIDTH;
    const screenCoordsY = (coords.x + coords.y) * HALF_TILE_HEIGHT;
    const mirrored = [Direction.Right, Direction.Up].includes(
      character.direction,
    );

    const frameOffset = (
      CHARACTER_FRAME_OFFSETS[character.gender][characterFrame] as Record<
        Direction,
        { x: number; y: number }
      >
    )[character.direction];

    const screenX = Math.floor(
      screenCoordsX -
        playerScreen.x +
        this._halfGameWidth +
        walkOffset.x +
        frameOffset.x,
    );

    const screenY = Math.floor(
      screenCoordsY -
        playerScreen.y +
        this._halfGameHeight +
        frame.yOffset +
        walkOffset.y +
        frameOffset.y,
    );

    const rect = new Rectangle(
      {
        x: screenX + (mirrored ? frame.mirroredXOffset : frame.xOffset),
        y: screenY,
      },
      frame.w,
      frame.h,
    );

    setCharacterRectangle(character.playerId, rect);

    const effects = justCharacter
      ? []
      : (this._charEffects.get(character.playerId) ?? []);

    for (const effect of effects) {
      effect.target.rect = {
        position: {
          x:
            screenCoordsX -
            playerScreen.x +
            this._halfGameWidth -
            HALF_TILE_WIDTH +
            walkOffset.x,
          y: rect.position.y,
        },
        width: TILE_WIDTH,
        height: rect.height,
        depth: 0,
      };
      effect.renderedFirstFrame = true;
      this.renderEffectBehind(effect, ctx);
    }

    if (mirrored) {
      ctx.save();
      ctx.translate(this._gameWidth, 0);
      ctx.scale(-1, 1);
    }

    const drawX = Math.floor(
      mirrored
        ? this._gameWidth - screenX - frame.w - frame.mirroredXOffset
        : screenX + frame.xOffset,
    );

    if (dying) {
      ctx.globalAlpha = dyingTicks / DEATH_TICKS;
    }

    if (entity.typeId === this.client.playerId && !character.invisible) {
      ctx.drawImage(
        atlas,
        frame.x,
        frame.y,
        frame.w,
        frame.h,
        drawX,
        screenY,
        frame.w,
        frame.h,
      );
    } else {
      if (character.invisible && this.client.admin !== AdminLevel.Player) {
        ctx.globalAlpha = 0.4;
        ctx.drawImage(
          atlas,
          frame.x,
          frame.y,
          frame.w,
          frame.h,
          drawX,
          screenY,
          frame.w,
          frame.h,
        );
        ctx.globalAlpha = 1;
      } else if (!character.invisible) {
        ctx.drawImage(
          atlas,
          frame.x,
          frame.y,
          frame.w,
          frame.h,
          drawX,
          screenY,
          frame.w,
          frame.h,
        );
      }
    }

    if (dying) {
      ctx.globalAlpha = 1;
    }

    if (mirrored) {
      ctx.restore();
    }

    for (const effect of effects) {
      this.renderEffectTransparent(effect, ctx);
      this.renderEffectFront(effect, ctx);
    }

    if (
      !justCharacter &&
      (!character.invisible || this.client.admin !== AdminLevel.Player)
    ) {
      const bubble = justCharacter
        ? null
        : this.client.animationController.characterChats.get(
            character.playerId,
          );
      const healthBar = justCharacter
        ? null
        : this.client.animationController.characterHealthBars.get(
            character.playerId,
          );
      const emote = justCharacter
        ? null
        : this.client.animationController.characterEmotes.get(
            character.playerId,
          );

      if (
        !bubble &&
        !healthBar &&
        !emote &&
        !this.client.commandController.debug &&
        (!(animation instanceof CharacterSpellChantAnimation) ||
          animation.animationFrame)
      ) {
        return;
      }

      this.topLayer.push(() => {
        const rect = getCharacterRectangle(character.playerId);
        const characterTopCenter = {
          x:
            screenCoordsX - playerScreen.x + this._halfGameWidth + walkOffset.x,
          y: rect!.position.y,
        };

        if (bubble) {
          bubble.render(characterTopCenter, ctx);
        }
        this.renderHealthBar(healthBar!, characterTopCenter, ctx);
        if (emote) {
          this.renderEmote(emote, characterTopCenter, ctx);
        }

        if (
          animation instanceof CharacterSpellChantAnimation &&
          !animation.animationFrame
        ) {
          animation.render(characterTopCenter, ctx);
        }

        if (this.client.commandController.debug) {
          this.renderDebugRectangle(
            rect!,
            `id[${character.playerId}]`,
            'green',
            ctx,
          );
        }
      });
    }
  }

  renderNpc(e: Entity, playerScreen: Vector2, ctx: CanvasRenderingContext2D) {
    const npc = this.client.getNpcByIndex(e.typeId);
    if (!npc) {
      return;
    }

    const record = this.client.getEnfRecordById(npc.id);
    if (!record) {
      return;
    }

    let dyingTicks = 0;
    let dying = false;
    let animation = this.client.animationController.npcAnimations.get(
      npc.index,
    );
    if (animation) {
      animation.renderedFirstFrame = true;
    }

    if (animation instanceof NpcDeathAnimation) {
      dying = true;
      dyingTicks = animation.ticks;
      if (animation.base) {
        animation = animation.base;
      }
    }
    const meta = this.client.getNpcMetadata(record.graphicId);
    const downRight = [Direction.Down, Direction.Right].includes(npc.direction);
    let walkOffset = { x: 0, y: 0 };
    let npcFrame: NpcFrame;
    let coords: Vector2 = npc.coords;

    switch (true) {
      case animation instanceof NpcWalkAnimation: {
        walkOffset = dying
          ? WALK_OFFSETS[animation.animationFrame][animation.direction]
          : this.interpolateWalkOffset(
              animation.animationFrame,
              animation.direction,
            );

        coords = animation.from;
        npcFrame = downRight
          ? NpcFrame.WalkingDownRight1 + animation.animationFrame
          : NpcFrame.WalkingUpLeft1 + animation.animationFrame;
        break;
      }
      case animation instanceof NpcAttackAnimation:
        npcFrame = downRight
          ? NpcFrame.AttackDownRight1 + animation.animationFrame
          : NpcFrame.AttackUpLeft1 + animation.animationFrame;
        break;
      default:
        npcFrame =
          (downRight ? NpcFrame.StandingDownRight1 : NpcFrame.StandingUpLeft1) +
          (meta.animatedStanding ? this.npcIdleAnimationFrame : 0);
        break;
    }

    const frame = this.client.atlas.getNpcFrame(record.graphicId, npcFrame);
    if (!frame) {
      return;
    }

    const atlas = this.client.atlas.getAtlas(frame.atlasIndex);
    if (!atlas) {
      return;
    }

    const metaOffset = {
      x:
        meta.xOffset +
        ([NpcFrame.AttackDownRight2, NpcFrame.AttackUpLeft2].includes(npcFrame)
          ? meta.xOffsetAttack
          : 0),
      y: -meta.yOffset,
    };

    const mirrored = [Direction.Right, Direction.Up].includes(npc.direction);
    if (mirrored) {
      metaOffset.x = -metaOffset.x;
    }

    const additionalOffset = { x: walkOffset.x, y: walkOffset.y };
    additionalOffset.x += metaOffset.x;
    additionalOffset.y += metaOffset.y;

    const screenCoordsX = (coords.x - coords.y) * HALF_TILE_WIDTH;
    const screenCoordsY = (coords.x + coords.y) * HALF_TILE_HEIGHT;
    const screenX = Math.floor(
      screenCoordsX - playerScreen.x + this._halfGameWidth + additionalOffset.x,
    );
    const screenY = Math.floor(
      screenCoordsY -
        playerScreen.y +
        this._halfGameHeight +
        frame.yOffset +
        additionalOffset.y,
    );

    const rect = new Rectangle(
      {
        x: screenX + (mirrored ? frame.mirroredXOffset : frame.xOffset),
        y: screenY,
      },
      frame.w,
      frame.h,
    );

    setNpcRectangle(npc.index, rect);

    const effects = this._npcEffects.get(npc.index) ?? [];

    for (const effect of effects) {
      effect.target.rect = {
        position: {
          x:
            screenCoordsX -
            playerScreen.x +
            this._halfGameWidth -
            HALF_TILE_WIDTH +
            walkOffset.x,
          y: rect.position.y,
        },
        width: TILE_WIDTH,
        height: rect.height,
        depth: 0,
      };
      effect.renderedFirstFrame = true;
      this.renderEffectBehind(effect, ctx);
    }

    if (mirrored) {
      ctx.save(); // Save the current context state
      ctx.translate(this._gameWidth, 0); // Move origin to the right edge
      ctx.scale(-1, 1); // Flip horizontally
    }

    const drawX = Math.floor(
      mirrored
        ? this._gameWidth - screenX - frame.w - frame.mirroredXOffset
        : screenX + frame.xOffset,
    );

    if (meta.transparent) {
      if (!dying) {
        ctx.globalAlpha = 0.4;
      } else {
        ctx.globalAlpha = 0.4 * (dyingTicks / DEATH_TICKS);
      }
    } else if (dying) {
      ctx.globalAlpha = dyingTicks / DEATH_TICKS;
    }

    ctx.drawImage(
      atlas,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      drawX,
      screenY,
      frame.w,
      frame.h,
    );

    if (dying || meta.transparent) {
      ctx.globalAlpha = 1;
    }

    if (mirrored) {
      ctx.restore(); // Restore the context to its original state
    }

    for (const effect of effects) {
      this.renderEffectTransparent(effect, ctx);
      this.renderEffectFront(effect, ctx);
    }

    const bubble = this.client.animationController.npcChats.get(npc.index);
    const healthBar = this.client.animationController.npcHealthBars.get(
      npc.index,
    );

    if (!bubble && !healthBar && !this.client.commandController.debug) {
      return;
    }

    this.topLayer.push(() => {
      const aboveCoords = {
        x: coords.x - 1,
        y: coords.y - 1,
      };
      const aboveCoordsX = (aboveCoords.x - aboveCoords.y) * HALF_TILE_WIDTH;
      const aboveCoordsY = (aboveCoords.x + aboveCoords.y) * HALF_TILE_HEIGHT;

      const npcTopCenter = {
        x: Math.floor(
          aboveCoordsX - playerScreen.x + this._halfGameWidth + walkOffset.x,
        ),
        y: Math.floor(
          aboveCoordsY -
            playerScreen.y +
            this._halfGameHeight -
            meta.nameLabelOffset +
            walkOffset.y +
            16,
        ),
      };

      if (bubble) {
        bubble.render(npcTopCenter, ctx);
      }

      if (healthBar) {
        this.renderHealthBar(healthBar, npcTopCenter, ctx);
      }

      if (this.client.commandController.debug) {
        this.renderDebugRectangle(
          rect,
          `idx[${npc.index}]`,
          [NpcType.Aggressive, NpcType.Passive].includes(record.type)
            ? 'red'
            : 'purple',
          ctx,
        );
      }
    });
  }

  renderItem(e: Entity, playerScreen: Vector2, ctx: CanvasRenderingContext2D) {
    const item = this.client.getItemByIndex(e.typeId);
    if (!item) {
      return;
    }

    const record = this.client.getEifRecordById(item.id);
    if (!record) {
      return;
    }

    const gfxId = getItemGraphicId(item.id, record.graphicId, item.amount);
    const frame = this.client.atlas.getItem(gfxId);
    if (!frame) {
      return;
    }

    const atlas = this.client.atlas.getAtlas(frame.atlasIndex);
    if (!atlas) {
      return;
    }

    const tileScreenX = (item.coords.x - item.coords.y) * HALF_TILE_WIDTH;
    const tileScreenY = (item.coords.x + item.coords.y) * HALF_TILE_HEIGHT;

    const screenX = Math.floor(
      tileScreenX - playerScreen.x + this._halfGameWidth + frame.xOffset,
    );
    const screenY = Math.floor(
      tileScreenY - playerScreen.y + this._halfGameHeight + frame.yOffset,
    );

    ctx.drawImage(
      atlas,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      screenX,
      screenY,
      frame.w,
      frame.h,
    );

    if (this.client.commandController.debug) {
      this.renderDebugRectangle(
        new Rectangle({ x: screenX, y: screenY }, frame.w, frame.h),
        `idx[${item.uid}]`,
        'blue',
        ctx,
      );
    }
  }

  private renderDebugRectangle(
    rect: Rectangle,
    label: string,
    color: string,
    ctx: CanvasRenderingContext2D,
  ) {
    ctx.strokeStyle = color;
    ctx.strokeRect(rect.position.x, rect.position.y, rect.width, rect.height);

    const frame = this.client.atlas.getStaticEntry(StaticAtlasEntryType.Sans11);
    if (!frame) {
      return;
    }

    const atlas = this.client.atlas.getAtlas(frame.atlasIndex);
    if (!atlas) {
      return;
    }

    ctx.fillStyle = color;
    ctx.fillRect(
      rect.position.x,
      rect.position.y - 12,
      ctx.measureText(label).width + 4,
      12,
    );

    this.client.sans11.render(
      ctx,
      label,
      { x: rect.position.x, y: rect.position.y - 12 },
      '#fff',
      TextAlign.None,
    );
  }

  renderCursor(
    entity: Entity,
    playerScreen: Vector2,
    ctx: CanvasRenderingContext2D,
  ) {
    if (
      this.client.mouseCoords!.x < 0 ||
      this.client.mouseCoords!.x > this.client.map!.width ||
      this.client.mouseCoords!.y < 0 ||
      this.client.mouseCoords!.y > this.client.map!.height
    ) {
      return;
    }

    const frame = this.client.atlas.getStaticEntry(StaticAtlasEntryType.Cursor);
    if (!frame) {
      return;
    }

    const atlas = this.client.atlas.getAtlas(frame.atlasIndex);
    if (!atlas) {
      return;
    }

    const mx = this.client.mouseCoords!.x;
    const my = this.client.mouseCoords!.y;
    const tileScreenX = (mx - my) * HALF_TILE_WIDTH;
    const tileScreenY = (mx + my) * HALF_TILE_HEIGHT;

    const sourceX = entity.typeId * TILE_WIDTH;

    const screenX = Math.floor(
      tileScreenX - HALF_TILE_WIDTH - playerScreen.x + this._halfGameWidth,
    );
    const screenY = Math.floor(
      tileScreenY - HALF_TILE_HEIGHT - playerScreen.y + this._halfGameHeight,
    );

    ctx.drawImage(
      atlas,
      frame.x + sourceX,
      frame.y,
      TILE_WIDTH,
      TILE_HEIGHT,
      screenX,
      screenY,
      TILE_WIDTH,
      TILE_HEIGHT,
    );

    const animation = this.client.animationController.cursorClickAnimation;
    if (animation) {
      animation.renderedFirstFrame = true;
      const animationX = Math.floor(
        (animation.at.x - animation.at.y) * HALF_TILE_WIDTH -
          HALF_TILE_WIDTH -
          playerScreen.x +
          this._halfGameWidth,
      );
      const animationY = Math.floor(
        (animation.at.x + animation.at.y) * HALF_TILE_HEIGHT -
          HALF_TILE_HEIGHT -
          playerScreen.y +
          this._halfGameHeight,
      );
      const sourceX = Math.floor((3 + animation.animationFrame) * TILE_WIDTH);
      ctx.drawImage(
        atlas,
        frame.x + sourceX,
        frame.y,
        TILE_WIDTH,
        TILE_HEIGHT,
        animationX,
        animationY,
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

  getSign(x: number, y: number): { title: string; message: string } | null {
    const row = this.signCache[y];
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

  private renderHealthBar(
    healthBar: HealthBar | null,
    position: Vector2,
    ctx: CanvasRenderingContext2D,
  ) {
    if (!healthBar) {
      return;
    }

    healthBar.renderedFirstFrame = true;

    const frame = this.client.atlas.getStaticEntry(
      StaticAtlasEntryType.HealthBars,
    );
    if (!frame) {
      return;
    }

    const atlas = this.client.atlas.getAtlas(frame.atlasIndex);
    if (!atlas) {
      return;
    }

    const offsetY = -10;

    ctx.drawImage(
      atlas,
      frame.x,
      frame.y + 28,
      40,
      7,
      position.x - 20,
      position.y - 7 + offsetY,
      40,
      7,
    );

    let barOffsetY: number;
    if (healthBar.percentage < 25) {
      barOffsetY = 23;
    } else if (healthBar.percentage < 50) {
      barOffsetY = 16;
    } else {
      barOffsetY = 9;
    }

    ctx.drawImage(
      atlas,
      frame.x + 2,
      frame.y + barOffsetY,
      Math.floor(40 * (healthBar.percentage / 100)),
      3,
      position.x - 18,
      position.y - 5 + offsetY,
      40 * (healthBar.percentage / 100),
      3,
    );

    const amount = healthBar.damage || healthBar.heal;
    if (!amount) {
      const frame = this.client.atlas.getStaticEntry(StaticAtlasEntryType.Miss);
      if (!frame) {
        return;
      }

      const atlas = this.client.atlas.getAtlas(frame.atlasIndex);
      if (!atlas) {
        return;
      }

      ctx.drawImage(
        atlas,
        frame.x,
        frame.y,
        frame.w,
        frame.h,
        position.x - (frame.w >> 1),
        position.y - 35 + healthBar.ticks,
        frame.w,
        frame.h,
      );
      return;
    }

    const amountAsText = amount.toString();
    const chars = amountAsText.split('');
    this.damageNumberCanvas.width = chars.length * 9;
    this.damageNumberCanvas.height = 12;
    this.damageNumberCtx.clearRect(
      0,
      0,
      this.damageNumberCanvas.width,
      this.damageNumberCanvas.height,
    );

    const numbersFrame = this.client.atlas.getStaticEntry(
      healthBar.heal
        ? StaticAtlasEntryType.HealNumbers
        : StaticAtlasEntryType.DamageNumbers,
    );

    if (!numbersFrame) {
      return;
    }

    const numbersAtlas = this.client.atlas.getAtlas(numbersFrame.atlasIndex);
    if (!numbersAtlas) {
      return;
    }

    let index = 0;
    for (const char of chars) {
      const number = Number.parseInt(char, 10);
      this.damageNumberCtx.drawImage(
        numbersAtlas,
        numbersFrame.x + number * 9,
        numbersFrame.y,
        9,
        12,
        index * 9,
        0,
        9,
        12,
      );
      index++;
    }

    ctx.drawImage(
      this.damageNumberCanvas,
      position.x - this.damageNumberCanvas.width / 2,
      position.y - 35 + healthBar.ticks,
    );
  }

  renderEmote(
    emote: Emote,
    position: { x: number; y: number },
    ctx: CanvasRenderingContext2D,
  ) {
    emote.renderedFirstFrame = true;

    const frame = this.client.atlas.getEmoteFrame(
      emote.type,
      emote.animationFrame,
    );
    if (!frame) {
      return;
    }

    const atlas = this.client.atlas.getAtlas(frame.atlasIndex);
    if (!atlas) {
      return;
    }

    ctx.globalAlpha = emote.ticks / EMOTE_ANIMATION_TICKS;

    ctx.drawImage(
      atlas,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      position.x + frame.xOffset,
      position.y + frame.yOffset - 25,
      frame.w,
      frame.h,
    );

    ctx.globalAlpha = 1;
  }

  private renderEffectBehind(
    effect: EffectAnimation,
    ctx: CanvasRenderingContext2D,
  ) {
    const frame = this.client.atlas.getEffectBehindFrame(
      effect.id,
      effect.animationFrame,
    );
    if (!frame) {
      return;
    }

    const atlas = this.client.atlas.getAtlas(frame.atlasIndex);
    if (!atlas) {
      return;
    }

    if (!effect.target.rect) {
      return;
    }

    ctx.drawImage(
      atlas,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      Math.floor(
        effect.target.rect.position.x +
          (effect.target.rect.width >> 1) +
          frame.xOffset,
      ),
      Math.floor(
        effect.target.rect.position.y +
          effect.target.rect.height -
          TILE_HEIGHT -
          HALF_TILE_HEIGHT +
          frame.yOffset,
      ),
      frame.w,
      frame.h,
    );
  }

  private renderEffectTransparent(
    effect: EffectAnimation,
    ctx: CanvasRenderingContext2D,
  ) {
    const frame = this.client.atlas.getEffectTransparentFrame(
      effect.id,
      effect.animationFrame,
    );
    if (!frame) {
      return;
    }

    const atlas = this.client.atlas.getAtlas(frame.atlasIndex);
    if (!atlas) {
      return;
    }

    if (!effect.target.rect) {
      return;
    }

    ctx.globalAlpha = 0.4;
    ctx.drawImage(
      atlas,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      Math.floor(
        effect.target.rect.position.x +
          (effect.target.rect.width >> 1) +
          frame.xOffset,
      ),
      Math.floor(
        effect.target.rect.position.y +
          effect.target.rect.height -
          TILE_HEIGHT -
          HALF_TILE_HEIGHT +
          frame.yOffset,
      ),
      frame.w,
      frame.h,
    );
    ctx.globalAlpha = 1;
  }

  private renderEffectFront(
    effect: EffectAnimation,
    ctx: CanvasRenderingContext2D,
  ) {
    const frame = this.client.atlas.getEffectFrontFrame(
      effect.id,
      effect.animationFrame,
    );
    if (!frame) {
      return;
    }

    const atlas = this.client.atlas.getAtlas(frame.atlasIndex);
    if (!atlas) {
      return;
    }

    if (!effect.target.rect) {
      return;
    }

    ctx.drawImage(
      atlas,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      Math.floor(
        effect.target.rect.position.x +
          (effect.target.rect.width >> 1) +
          frame.xOffset,
      ),
      Math.floor(
        effect.target.rect.position.y +
          effect.target.rect.height -
          TILE_HEIGHT -
          HALF_TILE_HEIGHT +
          frame.yOffset,
      ),
      frame.w,
      frame.h,
    );
  }
}
