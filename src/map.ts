import {
  AdminLevel,
  Coords,
  Direction,
  Emote as EmoteType,
  ItemSpecial,
  MapTileSpec,
  SitState,
} from 'eolib';
import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import {
  CHARACTER_FRAME_OFFSETS,
  CharacterFrame,
  HAIR_OFFSETS,
  NpcFrame,
  StaticAtlasEntryType,
} from '@/atlas';
import type { Client } from '@/client';
import {
  getCharacterIntersecting,
  getCharacterRectangle,
  getNpcIntersecting,
  getNpcRectangle,
  Rectangle,
  setBoardRectangle,
  setCharacterRectangle,
  setDoorRectangle,
  setJukeboxRectangle,
  setLockerRectangle,
  setNpcRectangle,
  setSignRectangle,
} from '@/collision';
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
} from '@/consts';
import { GameState } from '@/game-state';
import { GfxType } from '@/gfx';
import type { ChatBubble, Emote, HealthBar } from '@/render';
import {
  CharacterAttackAnimation,
  CharacterDeathAnimation,
  CharacterRangedAttackAnimation,
  CharacterSpellChantAnimation,
  CharacterWalkAnimation,
  type EffectAnimation,
  EffectTargetCharacter,
  EffectTargetNpc,
  EffectTargetTile,
  NpcAttackAnimation,
  NpcDeathAnimation,
  NpcWalkAnimation,
} from '@/render';
import {
  capitalize,
  getItemGraphicId,
  isoToScreen,
  screenToIso,
} from '@/utils';
import type { Vector2 } from '@/vector';

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

// Pre-built Set for O(1) interactive-tile lookup (replaces inline array + .includes() per frame)
const INTERACTIVE_TILE_SPECS = new Set([
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
]);

const TDG = 0.00000001; // gap between depth of each tile on a layer
const RDG = 0.001; // gap between depth of each row of tiles
const CHAT_BUBBLE_LINE_HEIGHT = 12;
const CHAT_BUBBLE_RADIUS = 6;
const CHAT_BUBBLE_TRIANGLE_HEIGHT = 6;
const CHAT_BUBBLE_TRIANGLE_WIDTH = 3;

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

const JUMP_OFFSETS = [-8, -16, -16, -8];

export class MapRenderer {
  client: Client;
  animationFrame = 0;
  animationTicks = ANIMATION_TICKS;
  timedSpikesTicks = 0;
  npcIdleAnimationTicks = NPC_IDLE_ANIMATION_TICKS;
  npcIdleAnimationFrame = 0;
  buildingCache = false;
  private staticTileGrid: StaticTile[][][] = [];
  private tileSpecCache: (MapTileSpec | null)[][] = [];
  private signCache: ({ title: string; message: string } | null)[][] = [];
  private interpolation = 0;
  // Pre-sorted static entities — built once in buildCaches(), filtered by viewport during render
  private cachedStaticEntities: Entity[] = [];
  // Per-frame render caches — updated once at the top of render() to avoid repeated lookups
  private _halfGameWidth = 0;
  private _halfGameHeight = 0;
  private _gameWidth = 0;
  // Reusable Coords buffer — avoids allocating a new eolib Coords per renderTile call
  private readonly _coordsBuffer = new Coords();
  // Per-frame effects maps — built once to avoid O(entities × effects) filter calls
  private readonly _tileEffects: EffectAnimation[] = [];
  private readonly _characterEffects = new Map<number, EffectAnimation[]>();
  private readonly _npcEffects = new Map<number, EffectAnimation[]>();
  private readonly _worldSprites = new Map<string, Sprite>();
  private readonly _uiSprites = new Map<string, Sprite>();
  private readonly _uiGraphics = new Map<string, Graphics>();
  private readonly _seenWorldSprites = new Set<string>();
  private readonly _seenUiSprites = new Set<string>();
  private readonly _seenUiGraphics = new Set<string>();
  private _worldOrder = 0;
  private _uiOrder = 0;
  // Ghost container for the local player's second-pass render (alpha=0.4).
  // Uses enableRenderGroup() so body + face emote composite to a texture first,
  // then the single container alpha is applied — no double-blending on the face.
  private _ghostContainer: Container | null = null;
  private _ghostBody: Sprite | null = null;
  private _ghostFace: Sprite | null = null;
  private _ghostVisible = false;
  private readonly _dynamics: Entity[] = [];
  private readonly _colorCache = new Map<string, number>();
  // Reusable walk-offset buffer — avoids allocating a new {x,y} per walking entity per frame
  private readonly _walkOffsetBuffer = { x: 0, y: 0 };
  // Per-frame coord sets for O(1) cursor entity detection
  private readonly _characterCoordSet = new Set<number>();
  private readonly _npcCoordSet = new Set<number>();
  private readonly _itemCoordSet = new Set<number>();

  hasChairs = false;

  private labelSprite(sprite: Sprite, label: string) {
    sprite.label = label;
    if (sprite.texture) {
      sprite.texture.label = `${label}:texture`;
    }
  }

  private labelGraphics(graphics: Graphics, label: string) {
    graphics.label = label;
  }

  private beginFrame() {
    this.client.worldContainer.sortableChildren = true;
    this.client.uiContainer.sortableChildren = true;
    this._seenWorldSprites.clear();
    this._seenUiSprites.clear();
    this._seenUiGraphics.clear();
    this._worldOrder = 0;
    this._uiOrder = 0;
    this._ghostVisible = false;
  }

  private endFrame() {
    if (this._ghostContainer) {
      this._ghostContainer.visible = this._ghostVisible;
    }
    this.sweepSprites(
      this._worldSprites,
      this._seenWorldSprites,
      this.client.worldContainer,
    );
    this.sweepSprites(
      this._uiSprites,
      this._seenUiSprites,
      this.client.uiContainer,
    );
    this.sweepGraphics(
      this._uiGraphics,
      this._seenUiGraphics,
      this.client.uiContainer,
    );
  }

  private clearSceneNodes() {
    for (const sprite of this._worldSprites.values()) {
      this.client.worldContainer.removeChild(sprite);
      sprite.destroy({ texture: false });
    }
    for (const sprite of this._uiSprites.values()) {
      this.client.uiContainer.removeChild(sprite);
      sprite.destroy({ texture: false });
    }
    for (const graphics of this._uiGraphics.values()) {
      this.client.uiContainer.removeChild(graphics);
      graphics.destroy();
    }
    if (this._ghostContainer) {
      this.client.worldContainer.removeChild(this._ghostContainer);
      this._ghostContainer.destroy({ texture: false });
      this._ghostContainer = null;
      this._ghostBody = null;
      this._ghostFace = null;
    }
    this._worldSprites.clear();
    this._uiSprites.clear();
    this._uiGraphics.clear();
    this._seenWorldSprites.clear();
    this._seenUiSprites.clear();
    this._seenUiGraphics.clear();
  }

  private sweepSprites(
    registry: Map<string, Sprite>,
    seen: Set<string>,
    container: { removeChild: (child: Sprite) => void },
    destroy = false,
  ) {
    for (const [key, sprite] of registry) {
      if (!seen.has(key)) {
        container.removeChild(sprite);
        if (destroy) {
          sprite.destroy({ texture: false });
        }
        registry.delete(key);
      }
    }
  }

  private sweepGraphics(
    registry: Map<string, Graphics>,
    seen: Set<string>,
    container: { removeChild: (child: Graphics) => void },
    destroy = false,
  ) {
    for (const [key, graphics] of registry) {
      if (!seen.has(key)) {
        container.removeChild(graphics);
        if (destroy) {
          graphics.destroy();
        }
        registry.delete(key);
      }
    }
  }

  private ensureWorldSprite(key: string, label: string): Sprite {
    this._seenWorldSprites.add(key);
    let sprite = this._worldSprites.get(key);
    if (!sprite) {
      sprite = new Sprite();
      sprite.eventMode = 'none';
      sprite.tint = 0xffffff;
      this._worldSprites.set(key, sprite);
      this.client.worldContainer.addChild(sprite);
    }
    sprite.alpha = 1;
    sprite.scale.set(1);
    sprite.visible = true;
    sprite.zIndex = this._worldOrder++;
    this.labelSprite(sprite, label);
    return sprite;
  }

  private ensureUiSprite(key: string, label: string): Sprite {
    this._seenUiSprites.add(key);
    let sprite = this._uiSprites.get(key);
    if (!sprite) {
      sprite = new Sprite();
      sprite.eventMode = 'none';
      this._uiSprites.set(key, sprite);
      this.client.uiContainer.addChild(sprite);
    }
    sprite.alpha = 1;
    sprite.tint = 0xffffff;
    sprite.scale.set(1);
    sprite.visible = true;
    sprite.zIndex = this._uiOrder++;
    this.labelSprite(sprite, label);
    return sprite;
  }

  private ensureUiGraphics(key: string, label: string): Graphics {
    this._seenUiGraphics.add(key);
    let graphics = this._uiGraphics.get(key);
    if (!graphics) {
      graphics = new Graphics();
      graphics.eventMode = 'none';
      this._uiGraphics.set(key, graphics);
      this.client.uiContainer.addChild(graphics);
    }
    graphics.clear();
    graphics.alpha = 1;
    graphics.scale.set(1);
    graphics.visible = true;
    graphics.zIndex = this._uiOrder++;
    this.labelGraphics(graphics, label);
    return graphics;
  }

  private getEffectNodeKey(
    effectKeyBase: string,
    layer: 'behind' | 'transparent' | 'front',
  ): string {
    return `${effectKeyBase}:${layer}`;
  }

  constructor(client: Client) {
    this.client = client;
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
    for (const row of this.client.map!.tileSpecRows) {
      for (const t of row.tiles) {
        this.tileSpecCache[row.y][t.x] = t.tileSpec;
        if (
          !this.hasChairs &&
          t.tileSpec >= MapTileSpec.ChairDown &&
          t.tileSpec <= MapTileSpec.ChairAll
        ) {
          this.hasChairs = true;
        }
      }
    }

    this.signCache = Array.from({ length: h + 1 }, () =>
      new Array<{ title: string; message: string } | null>(w + 1).fill(null),
    );
    for (const sign of this.client.map!.signs) {
      const title = sign.stringData.substring(0, sign.titleLength);
      const message = sign.stringData.substring(sign.titleLength);
      this.signCache[sign.coords.y][sign.coords.x] = { title, message };
    }

    // Pre-build and sort the full static entity list once per map load
    this.cachedStaticEntities = [];
    for (let y = 0; y <= h; y++) {
      for (let x = 0; x <= w; x++) {
        for (const t of this.staticTileGrid[y][x]) {
          this.cachedStaticEntities.push({
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
    this.cachedStaticEntities.sort((a, b) => a.depth - b.depth);

    this.buildingCache = false;
    this.clearSceneNodes();
  }

  getTileSpecAt(position: Vector2): MapTileSpec | undefined {
    const spec = this.tileSpecCache[position.y]?.[position.x];
    if (spec !== null) {
      return spec;
    }
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

    this.client.atlas.maybeDefrag();
  }

  private calculateDepth(layer: number, x: number, y: number): number {
    return layerDepth[layer] + y * RDG + x * layerDepth.length * TDG;
  }

  private interpolateWalkOffset(frame: number, direction: Direction): Vector2 {
    const prevOffset = frame > 0 ? WALK_OFFSETS[frame - 1][direction] : null;
    const walkOffset = WALK_OFFSETS[frame][direction];
    const prevX = prevOffset ? prevOffset.x : 0;
    const prevY = prevOffset ? prevOffset.y : 0;
    this._walkOffsetBuffer.x = Math.floor(
      prevX + (walkOffset.x - prevX) * this.interpolation,
    );
    this._walkOffsetBuffer.y = Math.floor(
      prevY + (walkOffset.y - prevY) * this.interpolation,
    );
    return this._walkOffsetBuffer;
  }

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
    this._characterEffects.clear();
    this._npcEffects.clear();
    for (const effect of this.client.animationController.effects) {
      if (effect.target instanceof EffectTargetCharacter) {
        const arr = this._characterEffects.get(effect.target.playerId);
        if (arr) {
          arr.push(effect);
        } else {
          this._characterEffects.set(effect.target.playerId, [effect]);
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
      Math.ceil((gameWidth / TILE_WIDTH + gameHeight / TILE_HEIGHT) / 2) + 6;
    const rangeX = Math.min(this.client.map.width, range);
    const rangeY = Math.min(this.client.map.height, range);

    const viewportMinX = player.x - rangeX;
    const viewportMaxX = player.x + rangeX;
    const viewportMinY = player.y - rangeY;
    const viewportMaxY = player.y + rangeY;

    // Collect dynamic entities
    const dynamics = this._dynamics;
    dynamics.length = 0;
    const inGame = this.client.state === GameState.InGame;
    this._characterCoordSet.clear();
    this._npcCoordSet.clear();
    this._itemCoordSet.clear();
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
        this._characterCoordSet.add(x | (y << 16));
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
        this._npcCoordSet.add(x | (y << 16));
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
        this._itemCoordSet.add(x | (y << 16));
      }
    }

    let renderMouseCoords: Vector2 | undefined;
    if (this.client.mousePosition) {
      const mouseWorldX =
        this.client.mousePosition.x - this._halfGameWidth + playerScreen.x;
      const mouseWorldY =
        this.client.mousePosition.y -
        this._halfGameHeight +
        playerScreen.y +
        HALF_TILE_HEIGHT;
      const coords = screenToIso({ x: mouseWorldX, y: mouseWorldY });
      if (
        coords.x >= 0 &&
        coords.y >= 0 &&
        coords.x <= this.client.map.width &&
        coords.y <= this.client.map.height
      ) {
        renderMouseCoords = coords;
      }
    }

    if (renderMouseCoords && inGame) {
      const spec = this.getTileSpec(renderMouseCoords.x, renderMouseCoords.y);
      if (
        spec === null ||
        ![MapTileSpec.Wall, MapTileSpec.Edge].includes(spec)
      ) {
        let typeId = 0;
        const coordKey = renderMouseCoords.x | (renderMouseCoords.y << 16);
        if (
          INTERACTIVE_TILE_SPECS.has(spec!) ||
          this._characterCoordSet.has(coordKey) ||
          this._npcCoordSet.has(coordKey)
        ) {
          typeId = 1;
        } else if (this._itemCoordSet.has(coordKey)) {
          typeId = 2;
        }

        dynamics.push({
          x: renderMouseCoords.x,
          y: renderMouseCoords.y,
          type: EntityType.Cursor,
          typeId,
          layer: Layer.Cursor,
          depth: this.calculateDepth(
            Layer.Cursor,
            renderMouseCoords.x,
            renderMouseCoords.y,
          ),
        });
      }
    }

    this.beginFrame();

    // Merge-sort static + dynamic entities
    dynamics.sort((a, b) => a.depth - b.depth);
    let staticIndex = 0;
    let dynamicIndex = 0;
    const statics = this.cachedStaticEntities;
    while (staticIndex < statics.length || dynamicIndex < dynamics.length) {
      // Skip static tiles outside the current viewport
      while (
        staticIndex < statics.length &&
        (statics[staticIndex].x < viewportMinX ||
          statics[staticIndex].x > viewportMaxX ||
          statics[staticIndex].y < viewportMinY ||
          statics[staticIndex].y > viewportMaxY)
      ) {
        staticIndex++;
      }

      let entity: Entity;
      if (
        dynamicIndex >= dynamics.length ||
        (staticIndex < statics.length &&
          statics[staticIndex].depth <= dynamics[dynamicIndex].depth)
      ) {
        if (staticIndex >= statics.length) break;
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
      this.endFrame();
      return;
    }

    for (const effect of this._tileEffects) {
      const effectKeyBase = `tile-effect:${effect.instanceId}`;
      const target = effect.target as EffectTargetTile;
      const tileScreenX = (target.coords.x - target.coords.y) * HALF_TILE_WIDTH;
      const tileScreenY =
        (target.coords.x + target.coords.y) * HALF_TILE_HEIGHT;
      const tileRectX = Math.floor(
        tileScreenX - HALF_TILE_WIDTH - playerScreen.x + this._halfGameWidth,
      );
      const tileRectY = Math.floor(
        tileScreenY - HALF_TILE_HEIGHT - playerScreen.y + this._halfGameHeight,
      );
      if (!effect.target.rect) {
        effect.target.rect = new Rectangle(
          { x: tileRectX, y: tileRectY },
          TILE_WIDTH,
          TILE_HEIGHT,
        );
      } else {
        effect.target.rect.position.x = tileRectX;
        effect.target.rect.position.y = tileRectY;
      }
      effect.renderedFirstFrame = true;
      this.addEffectBehindSprite(effect, effectKeyBase);
      this.addEffectTransparentSprite(effect, effectKeyBase);
      this.addEffectFrontSprite(effect, effectKeyBase);
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
    this.endFrame();
  }

  private addTileSprite(entity: Entity, playerScreen: Vector2) {
    if (entity.layer === Layer.Ground && entity.typeId === 0) {
      return;
    }

    // Debug layer visibility
    if (
      entity.layer <= Layer.Overlay2 &&
      !this.client.configController.layerVisible(entity.layer)
    ) {
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
          (c) => c.coords?.x === entity.x && c.coords?.y === entity.y,
        )
      ) {
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

    const tileKey = `tile:${entity.layer}:${entity.x}:${entity.y}`;
    const sprite = this.ensureWorldSprite(
      tileKey,
      `map:tile layer=${entity.layer} id=${entity.typeId + bmpOffset}`,
    );
    sprite.texture = texture;
    sprite.position.set(screenX, screenY);
    if (entity.layer === Layer.Shadow) {
      sprite.alpha = 0.2;
    }

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
    } else if (spec === MapTileSpec.Jukebox) {
      setJukeboxRectangle(
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

    if (animation && !(animation instanceof CharacterSpellChantAnimation)) {
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

        const frame = animation.jump ? 0 : animation.animationFrame;
        characterFrame = downRight
          ? CharacterFrame.WalkingDownRight1 + frame
          : CharacterFrame.WalkingUpLeft1 + frame;

        if (animation.jump) {
          const prevJumpOffset =
            animation.animationFrame > 0
              ? JUMP_OFFSETS[animation.animationFrame - 1]
              : 0;
          const jumpOffset = JUMP_OFFSETS[animation.animationFrame];
          walkOffset.y += Math.floor(
            prevJumpOffset + (jumpOffset - prevJumpOffset) * this.interpolation,
          );
        }
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

    // Tile-center in screen space (walk-adjusted, no frame-specific offsets).
    // Used for overlays that must track the character tile rather than a specific frame.
    const tileCenterX =
      screenCoordsX - playerScreen.x + this._halfGameWidth + walkOffset.x;
    const tileCenterY =
      screenCoordsY - playerScreen.y + this._halfGameHeight + walkOffset.y;

    const screenX = Math.floor(tileCenterX + frameOffset.x);
    const screenY = Math.floor(tileCenterY + frame.yOffset + frameOffset.y);

    const rectX = screenX + (mirrored ? frame.mirroredXOffset : frame.xOffset);
    let rect = getCharacterRectangle(character.playerId);
    if (rect) {
      rect.position.x = rectX;
      rect.position.y = screenY;
      rect.width = frame.w;
      rect.height = frame.h;
    } else {
      rect = new Rectangle({ x: rectX, y: screenY }, frame.w, frame.h);
    }
    setCharacterRectangle(character.playerId, rect);

    const effects = justCharacter
      ? null
      : this._characterEffects.get(character.playerId);

    if (effects) {
      for (const effect of effects) {
        const effectKeyBase = `char-effect:${character.playerId}:${effect.instanceId}`;
        const effectX =
          screenCoordsX -
          playerScreen.x +
          this._halfGameWidth -
          HALF_TILE_WIDTH +
          walkOffset.x;
        if (!effect.target.rect) {
          effect.target.rect = new Rectangle(
            { x: effectX, y: rect.position.y },
            TILE_WIDTH,
            rect.height,
          );
        } else {
          effect.target.rect.position.x = effectX;
          effect.target.rect.position.y = rect.position.y;
          effect.target.rect.width = TILE_WIDTH;
          effect.target.rect.height = rect.height;
        }
        effect.renderedFirstFrame = true;
        this.addEffectBehindSprite(effect, effectKeyBase);
      }
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
      if (justCharacter) {
        if (!this._ghostContainer) {
          const container = new Container();
          container.label = 'map:character-ghost-container';
          container.enableRenderGroup();
          container.sortableChildren = false;
          const body = new Sprite();
          body.label = 'map:character-ghost-body';
          body.eventMode = 'none';
          const face = new Sprite();
          face.label = 'map:character-ghost-face';
          face.eventMode = 'none';
          face.visible = false;
          container.addChild(body);
          container.addChild(face);
          this.client.worldContainer.addChild(container);
          this._ghostContainer = container;
          this._ghostBody = body;
          this._ghostFace = face;
        }

        const ghostContainer = this._ghostContainer!;
        const ghostBody = this._ghostBody!;
        const ghostFace = this._ghostFace!;

        ghostContainer.zIndex = this._worldOrder++;
        ghostContainer.alpha = alpha;
        this._ghostVisible = true;

        ghostBody.texture = texture;
        ghostBody.scale.x = mirrored ? -1 : 1;
        if (mirrored) {
          ghostBody.x = Math.floor(screenX + frame.mirroredXOffset + frame.w);
        } else {
          ghostBody.x = Math.floor(screenX + frame.xOffset);
        }
        ghostBody.y = screenY;

        const ghostEmote = downRight
          ? this.client.animationController.characterEmotes.get(
              character.playerId,
            )
          : undefined;
        if (ghostEmote) {
          this.applyEmoteFaceToSprite(
            ghostFace,
            character.playerId,
            ghostEmote.type,
            tileCenterX,
            tileCenterY,
            frameOffset,
            mirrored,
            characterFrame,
            character.gender,
          );
        } else {
          ghostFace.visible = false;
        }
      } else {
        // Main pass: simple world sprite + face emote sprite, both at the same alpha.
        const sprite = this.ensureWorldSprite(
          `character:${character.playerId}:main`,
          `map:character id=${character.playerId}`,
        );
        sprite.texture = texture;
        if (mirrored) {
          sprite.scale.x = -1;
          sprite.x = Math.floor(screenX + frame.mirroredXOffset + frame.w);
        } else {
          sprite.scale.x = 1;
          sprite.x = Math.floor(screenX + frame.xOffset);
        }
        sprite.y = screenY;
        sprite.alpha = alpha;

        if (downRight) {
          const emote = this.client.animationController.characterEmotes.get(
            character.playerId,
          );
          if (emote) {
            this.addEmoteFaceSprite(
              character.playerId,
              emote.type,
              tileCenterX,
              tileCenterY,
              frameOffset,
              alpha,
              mirrored,
              characterFrame,
              character.gender,
            );
          }
        }
      }
    }

    if (effects) {
      for (const effect of effects) {
        const effectKeyBase = `char-effect:${character.playerId}:${effect.instanceId}`;
        this.addEffectTransparentSprite(effect, effectKeyBase);
        this.addEffectFrontSprite(effect, effectKeyBase);
      }
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
        this.addChatBubbleSprites(
          `ui:char-bubble:${character.playerId}`,
          bubble,
          topCenter,
        );
      }
      this.addHealthBarSprites(
        `ui:char-health:${character.playerId}`,
        healthBar!,
        topCenter,
      );
      if (emote) {
        this.addEmoteSprite(
          `ui:char-emote:${character.playerId}`,
          emote,
          topCenter,
        );
      }
      if (animation instanceof CharacterSpellChantAnimation) {
        this.addSpellChantSprites(
          `ui:char-chant:${character.playerId}`,
          animation,
          topCenter,
        );
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

    const rectX = screenX + (mirrored ? frame.mirroredXOffset : frame.xOffset);
    let rect = getNpcRectangle(npc.index);
    if (rect) {
      rect.position.x = rectX;
      rect.position.y = screenY;
      rect.width = frame.w;
      rect.height = frame.h;
    } else {
      rect = new Rectangle({ x: rectX, y: screenY }, frame.w, frame.h);
    }
    setNpcRectangle(npc.index, rect);

    const effects = this._npcEffects.get(npc.index);
    if (effects) {
      for (const effect of effects) {
        const effectKeyBase = `npc-effect:${npc.index}:${effect.instanceId}`;
        const effectX =
          screenCoordsX -
          playerScreen.x +
          this._halfGameWidth -
          HALF_TILE_WIDTH +
          walkOffset.x;
        if (!effect.target.rect) {
          effect.target.rect = new Rectangle(
            { x: effectX, y: rect.position.y },
            TILE_WIDTH,
            rect.height,
          );
        } else {
          effect.target.rect.position.x = effectX;
          effect.target.rect.position.y = rect.position.y;
          effect.target.rect.width = TILE_WIDTH;
          effect.target.rect.height = rect.height;
        }
        effect.renderedFirstFrame = true;
        this.addEffectBehindSprite(effect, effectKeyBase);
      }
    }

    let alpha = 1;
    if (meta.transparent && !dying) alpha = 0.4;
    else if (meta.transparent && dying)
      alpha = 0.4 * (dyingTicks / DEATH_TICKS);
    else if (dying) alpha = dyingTicks / DEATH_TICKS;

    const sprite = this.ensureWorldSprite(
      `npc:${npc.index}`,
      `map:npc index=${npc.index} id=${npc.id}`,
    );
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

    if (effects) {
      for (const effect of effects) {
        const effectKeyBase = `npc-effect:${npc.index}:${effect.instanceId}`;
        this.addEffectTransparentSprite(effect, effectKeyBase);
        this.addEffectFrontSprite(effect, effectKeyBase);
      }
    }

    const bubble = this.client.animationController.npcChats.get(npc.index);
    const healthBar = this.client.animationController.npcHealthBars.get(
      npc.index,
    );

    if (!bubble && !healthBar) return;

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
      this.addChatBubbleSprites(
        `ui:npc-bubble:${npc.index}`,
        bubble,
        npcTopCenter,
      );
    }
    if (healthBar) {
      this.addHealthBarSprites(
        `ui:npc-health:${npc.index}`,
        healthBar,
        npcTopCenter,
      );
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

    const sprite = this.ensureWorldSprite(
      `item:${item.uid}`,
      `map:item id=${item.id} uid=${item.uid}`,
    );
    sprite.texture = texture;
    sprite.position.set(screenX, screenY);
  }

  private addCursorSprites(entity: Entity, playerScreen: Vector2) {
    const mx = entity.x;
    const my = entity.y;
    if (
      mx < 0 ||
      mx > this.client.map!.width ||
      my < 0 ||
      my > this.client.map!.height
    ) {
      return;
    }

    const frame = this.client.atlas.getStaticEntry(StaticAtlasEntryType.Cursor);
    if (!frame) return;

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
      const sprite = this.ensureWorldSprite(
        'cursor:base',
        `map:cursor type=${entity.typeId}`,
      );
      sprite.texture = cursorTexture;
      sprite.position.set(screenX, screenY);
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
        const sprite = this.ensureWorldSprite(
          'cursor:click',
          'map:cursor-click',
        );
        sprite.texture = animTexture;
        sprite.position.set(animX, animY);
      }
    }
  }

  private addHealthBarSprites(
    nodeKey: string,
    healthBar: HealthBar | null,
    position: Vector2,
  ) {
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
      const bgSprite = this.ensureUiSprite(`${nodeKey}:bg`, 'ui:healthbar-bg');
      bgSprite.texture = bgTexture;
      bgSprite.position.set(position.x - 20, position.y - 7 + offsetY);
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
        const fillSprite = this.ensureUiSprite(
          `${nodeKey}:fill`,
          'ui:healthbar-fill',
        );
        fillSprite.texture = fillTexture;
        fillSprite.position.set(position.x - 18, position.y - 5 + offsetY);
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
        const missSprite = this.ensureUiSprite(
          `${nodeKey}:miss`,
          'ui:healthbar-miss',
        );
        missSprite.texture = missTexture;
        missSprite.position.set(
          position.x - (missFrame.w >> 1),
          position.y - 35 + healthBar.ticks,
        );
      }
      return;
    }

    const numbersFrame = this.client.atlas.getStaticEntry(
      healthBar.heal
        ? StaticAtlasEntryType.HealNumbers
        : StaticAtlasEntryType.DamageNumbers,
    );
    if (!numbersFrame) return;
    const amountAsText = amount.toString();
    const digitWidth = 9;
    const totalWidth = amountAsText.length * digitWidth;
    const y = position.y - 35 + healthBar.ticks;
    let x = position.x - totalWidth / 2;

    for (let index = 0; index < amountAsText.length; index++) {
      const number = amountAsText.charCodeAt(index) - 48; // '0'.charCodeAt(0) === 48
      const digitTexture = this.client.atlas.getFrameTexture({
        atlasIndex: numbersFrame.atlasIndex,
        x: numbersFrame.x + number * digitWidth,
        y: numbersFrame.y,
        w: digitWidth,
        h: numbersFrame.h,
      });
      if (!digitTexture) {
        x += digitWidth;
        continue;
      }
      const dnSprite = this.ensureUiSprite(
        `${nodeKey}:digit:${index}`,
        `ui:healthbar-digit value=${number}`,
      );
      dnSprite.texture = digitTexture;
      dnSprite.position.set(x, y);
      x += digitWidth;
    }
  }

  private addEmoteSprite(
    nodeKey: string,
    emote: Emote,
    position: { x: number; y: number },
  ) {
    emote.renderedFirstFrame = true;

    const frame = this.client.atlas.getEmoteFrame(
      emote.type,
      emote.animationFrame,
    );
    if (!frame) return;

    const texture = this.client.atlas.getFrameTexture(frame);
    if (!texture) return;

    const sprite = this.ensureUiSprite(nodeKey, `ui:emote type=${emote.type}`);
    sprite.texture = texture;
    sprite.position.set(
      position.x + frame.xOffset,
      position.y + frame.yOffset - 25,
    );
    sprite.alpha = emote.ticks / EMOTE_ANIMATION_TICKS;
  }

  private addEmoteFaceSprite(
    playerId: number,
    emoteId: number,
    tileCenterX: number,
    tileCenterY: number,
    frameOffset: { x: number; y: number },
    alpha: number,
    mirrored: boolean,
    characterFrame: CharacterFrame,
    gender: number,
  ) {
    const frame = this.client.atlas.getFaceEmoteFrame(
      playerId,
      emoteId === EmoteType.Drunk ? EmoteType.Playful : emoteId,
    );
    if (!frame || frame.atlasIndex === -1) return;

    const texture = this.client.atlas.getFrameTexture(frame);
    if (!texture) return;

    const sprite = this.ensureWorldSprite(
      `face-emote:${playerId}`,
      `map:face-emote id=${playerId}`,
    );
    sprite.texture = texture;
    sprite.alpha = alpha;

    const baseX = tileCenterX + frameOffset.x;
    const baseY = tileCenterY + frameOffset.y;

    const standingHair = HAIR_OFFSETS[gender][CharacterFrame.StandingDownRight];
    const currentHair = HAIR_OFFSETS[gender][characterFrame] ?? standingHair;
    const hairDeltaX = currentHair.x - standingHair.x;
    const hairDeltaY = currentHair.y - standingHair.y;

    if (mirrored) {
      sprite.scale.x = -1;
      sprite.x = Math.floor(
        baseX + frame.mirroredXOffset + frame.w - hairDeltaX,
      );
    } else {
      sprite.scale.x = 1;
      sprite.x = Math.floor(baseX + frame.xOffset + hairDeltaX);
    }
    sprite.y = Math.floor(baseY + frame.yOffset + hairDeltaY);
  }

  private applyEmoteFaceToSprite(
    sprite: Sprite,
    playerId: number,
    emoteId: number,
    tileCenterX: number,
    tileCenterY: number,
    frameOffset: { x: number; y: number },
    mirrored: boolean,
    characterFrame: CharacterFrame,
    gender: number,
  ) {
    const frame = this.client.atlas.getFaceEmoteFrame(
      playerId,
      emoteId === EmoteType.Drunk ? EmoteType.Playful : emoteId,
    );
    if (!frame || frame.atlasIndex === -1) {
      sprite.visible = false;
      return;
    }

    const texture = this.client.atlas.getFrameTexture(frame);
    if (!texture) {
      sprite.visible = false;
      return;
    }

    sprite.visible = true;
    sprite.texture = texture;

    const baseX = tileCenterX + frameOffset.x;
    const baseY = tileCenterY + frameOffset.y;

    const standingHair = HAIR_OFFSETS[gender][CharacterFrame.StandingDownRight];
    const currentHair = HAIR_OFFSETS[gender][characterFrame] ?? standingHair;
    const hairDeltaX = currentHair.x - standingHair.x;
    const hairDeltaY = currentHair.y - standingHair.y;

    if (mirrored) {
      sprite.scale.x = -1;
      sprite.x = Math.floor(
        baseX + frame.mirroredXOffset + frame.w - hairDeltaX,
      );
    } else {
      sprite.scale.x = 1;
      sprite.x = Math.floor(baseX + frame.xOffset + hairDeltaX);
    }
    sprite.y = Math.floor(baseY + frame.yOffset + hairDeltaY);
  }

  private addEffectBehindSprite(
    effect: EffectAnimation,
    effectKeyBase: string,
  ) {
    const frame = this.client.atlas.getEffectBehindFrame(
      effect.id,
      effect.animationFrame,
    );
    if (!frame || !effect.target.rect) return;

    const texture = this.client.atlas.getFrameTexture(frame);
    if (!texture) return;

    const sprite = this.ensureWorldSprite(
      this.getEffectNodeKey(effectKeyBase, 'behind'),
      `effect:behind id=${effect.id}`,
    );
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
  }

  private addEffectTransparentSprite(
    effect: EffectAnimation,
    effectKeyBase: string,
  ) {
    const frame = this.client.atlas.getEffectTransparentFrame(
      effect.id,
      effect.animationFrame,
    );
    if (!frame || !effect.target.rect) return;

    const texture = this.client.atlas.getFrameTexture(frame);
    if (!texture) return;

    const sprite = this.ensureWorldSprite(
      this.getEffectNodeKey(effectKeyBase, 'transparent'),
      `effect:transparent id=${effect.id}`,
    );
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
  }

  private addEffectFrontSprite(effect: EffectAnimation, effectKeyBase: string) {
    const frame = this.client.atlas.getEffectFrontFrame(
      effect.id,
      effect.animationFrame,
    );
    if (!frame || !effect.target.rect) return;

    const texture = this.client.atlas.getFrameTexture(frame);
    if (!texture) return;

    const sprite = this.ensureWorldSprite(
      this.getEffectNodeKey(effectKeyBase, 'front'),
      `effect:front id=${effect.id}`,
    );
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
        !(animation instanceof CharacterSpellChantAnimation) &&
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

      let topItem: (typeof this.client.nearby.items)[0] | undefined;
      for (const i of this.client.nearby.items) {
        if (
          i.coords.x === this.client.mouseCoords!.x &&
          i.coords.y === this.client.mouseCoords!.y &&
          (topItem === undefined || i.uid > topItem.uid)
        ) {
          topItem = i;
        }
      }
      if (!topItem) return;
      const item = topItem;
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

    this.addAtlasTextSprites(
      'ui:nameplate:shadow',
      name,
      { x: drawX + 1, y: drawY + 1 },
      '#000',
    );
    this.addAtlasTextSprites(
      'ui:nameplate:text',
      name,
      { x: drawX, y: drawY },
      color,
    );
  }

  private addChatBubbleSprites(
    nodeKey: string,
    bubble: ChatBubble,
    position: Vector2,
  ) {
    bubble.renderedFirstFrame = true;
    const layout = bubble.getLayout();
    const left = Math.floor(position.x - (layout.width >> 1));
    const top = Math.floor(position.y - layout.height);
    const bodyHeight = layout.height - CHAT_BUBBLE_TRIANGLE_HEIGHT;
    const midX = left + (layout.width >> 1);
    const triHalf = CHAT_BUBBLE_TRIANGLE_WIDTH >> 1;

    const graphics = this.ensureUiGraphics(nodeKey, 'ui:chat-bubble-shape');
    graphics.roundRect(left, top, layout.width, bodyHeight, CHAT_BUBBLE_RADIUS);
    graphics.poly(
      [
        midX + triHalf,
        top + bodyHeight,
        midX,
        top + bodyHeight + CHAT_BUBBLE_TRIANGLE_HEIGHT,
        midX - triHalf,
        top + bodyHeight,
      ],
      true,
    );
    graphics.stroke({
      color: this.parseCssHexColor(layout.foreground),
      width: 1,
    });
    graphics.fill({
      color: this.parseCssHexColor(layout.background),
      alpha: 0.65,
    });
    for (const [index, line] of layout.lines.entries()) {
      this.addAtlasTextSprites(
        `${nodeKey}:line:${index}`,
        line,
        { x: left + 6, y: top + 3 + index * CHAT_BUBBLE_LINE_HEIGHT },
        layout.foreground,
        false,
        false,
      );
    }
  }

  private addSpellChantSprites(
    nodeKey: string,
    animation: CharacterSpellChantAnimation,
    position: Vector2,
  ) {
    const layout = animation.getLayout();
    const drawX = Math.floor(position.x - (layout.width >> 1));
    const drawY = Math.floor(position.y - layout.height - 4);

    this.addAtlasTextSprites(
      `${nodeKey}:shadow`,
      animation.chant,
      { x: drawX + 1, y: drawY + 1 },
      '#000',
      false,
      false,
    );
    this.addAtlasTextSprites(
      `${nodeKey}:text`,
      animation.chant,
      { x: drawX, y: drawY },
      '#fff',
      false,
      false,
    );
  }

  private addAtlasTextSprites(
    nodeKey: string,
    text: string,
    position: Vector2,
    color: string,
    alignHorizontal = true,
    alignVertical = true,
  ) {
    const chars = [];
    for (let i = 0; i < text.length; i++) {
      chars.push(this.client.sans11.getCharacter(text.charCodeAt(i)));
    }
    if (!chars.length) return;

    const { width, height } = this.client.sans11.measureTextChars(chars);
    let x = position.x;
    let y = position.y;

    if (alignHorizontal) {
      x -= width >> 1;
    }
    if (alignVertical) {
      y -= height;
    }

    const tint = this.parseCssHexColor(color);
    for (const [index, char] of chars.entries()) {
      const texture = this.client.sans11.getCharacterTexture(char.id);
      if (!texture) {
        x += char.width;
        continue;
      }
      const sprite = this.ensureUiSprite(
        `${nodeKey}:char:${index}`,
        `ui:text-glyph char=${char.id}`,
      );
      sprite.texture = texture;
      sprite.tint = tint;
      sprite.position.set(Math.floor(x), Math.floor(y));
      x += char.width;
    }
  }

  private parseCssHexColor(value: string): number {
    let cached = this._colorCache.get(value);
    if (cached === undefined) {
      const hex = value.startsWith('#') ? value.slice(1) : value;
      if (hex.length === 3) {
        cached = Number.parseInt(
          `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`,
          16,
        );
      } else {
        cached = Number.parseInt(hex, 16);
      }
      this._colorCache.set(value, cached);
    }
    return cached;
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
      const sprite = this.ensureUiSprite(
        'ui:player-menu:base',
        'ui:player-menu',
      );
      sprite.texture = menuTexture;
      sprite.position.set(rect.position.x + rect.width + 10, rect.position.y);
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
        const hoverSprite = this.ensureUiSprite(
          `ui:player-menu:hover:${hovered}`,
          `ui:player-menu-hover index=${hovered}`,
        );
        hoverSprite.texture = hoverTexture;
        hoverSprite.position.set(
          rect.position.x + rect.width + 10,
          rect.position.y +
            PLAYER_MENU_OFFSET_Y +
            hovered * PLAYER_MENU_ITEM_HEIGHT,
        );
      }
    }
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
}
