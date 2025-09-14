import {
  AdminLevel,
  type CharacterMapInfo,
  Coords,
  MapTileSpec,
  SitState,
} from 'eolib';
import { CharacterAction, type Client, GameState } from './client';
import {
  getCharacterIntersecting,
  getCharacterRectangle,
  getNpcIntersecting,
  Rectangle,
  setDoorRectangle,
  setLockerRectangle,
  setSignRectangle,
} from './collision';
import {
  ANIMATION_TICKS,
  DOOR_HEIGHT,
  HALF_TILE_HEIGHT,
  HALF_TILE_WIDTH,
  NPC_IDLE_ANIMATION_TICKS,
  TILE_HEIGHT,
  TILE_WIDTH,
} from './consts';
import { HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from './game-state';
import { GfxType, getBitmapById } from './gfx';
import { renderCharacterArmor } from './render/character-armor';
import { CharacterAttackAnimation } from './render/character-attack';
import { CharacterRangedAttackAnimation } from './render/character-attack-ranged';
import { renderCharacterBoots } from './render/character-boots';
import {
  calculateCharacterRenderPositionChair,
  renderCharacterChair,
} from './render/character-chair';
import { renderCharacterChatBubble } from './render/character-chat-bubble';
import {
  calculateCharacterRenderPositionFloor,
  renderCharacterFloor,
} from './render/character-floor';
import { renderCharacterHair } from './render/character-hair';
import { renderCharacterHairBehind } from './render/character-hair-behind';
import { renderCharacterHat } from './render/character-hat';
import { renderCharacterHealthBar } from './render/character-health-bar';
import {
  calculateCharacterRenderPositionStanding,
  renderCharacterStanding,
} from './render/character-standing';
import { CharacterWalkAnimation } from './render/character-walk';
import { EffectTargetCharacter, EffectTargetTile } from './render/effect';
import { renderNpc } from './render/npc';
import { renderNpcChatBubble } from './render/npc-chat-bubble';
import { renderNpcHealthBar } from './render/npc-health-bar';
import { clipHair } from './utils/clip-hair';
import { HatMaskType } from './utils/get-hat-metadata';
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
  private mainCharacterCanvas: HTMLCanvasElement;
  private mainCharacterCtx: CanvasRenderingContext2D;
  private characterCanvas: HTMLCanvasElement;
  private characterCtx: CanvasRenderingContext2D;

  constructor(client: Client) {
    this.client = client;
    this.characterCanvas = document.createElement('canvas');
    this.characterCtx = this.characterCanvas.getContext('2d', {
      willReadFrequently: true,
    });
    this.mainCharacterCanvas = document.createElement('canvas');
    this.mainCharacterCtx = this.mainCharacterCanvas.getContext('2d', {
      willReadFrequently: true,
    });
  }

  resizeCanvas(width: number, height: number) {
    this.mainCharacterCanvas.width = width;
    this.mainCharacterCanvas.height = height;
    this.characterCanvas.width = width;
    this.characterCanvas.height = height;
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

    this.signCache = Array.from({ length: h + 1 }, () =>
      new Array<{ title: string; message: string } | null>(w + 1).fill(null),
    );
    for (const sign of this.client.map.signs) {
      const title = sign.stringData.substring(0, sign.titleLength);
      const message = sign.stringData.substring(sign.titleLength);
      this.signCache[sign.coords.y][sign.coords.x] = { title, message };
    }

    this.buildingCache = false;
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

  getPlayerCoords() {
    const playerCharacter = this.client.nearby.characters.find(
      (c) => c.playerId === this.client.playerId,
    );
    return playerCharacter ? playerCharacter.coords : { x: 0, y: 0 };
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.client.map || this.buildingCache) {
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

    playerScreen.x += this.client.quakeOffset;

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

        if (!this.staticTileGrid[y]?.[x]) {
          return;
        }

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

        if (this.client.state === GameState.InGame) {
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

          for (const i of this.client.nearby.items.filter(
            (i) => i.coords.x === x && i.coords.y === y,
          )) {
            entities.push({
              x,
              y,
              type: EntityType.Item,
              typeId: i.uid,
              layer: Layer.Item,
              depth: this.calculateDepth(Layer.Item, x, y),
            });
          }
        }
      }
    }

    if (this.client.mouseCoords && this.client.state === GameState.InGame) {
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
          ].includes(spec) ||
          this.client.nearby.characters.some(
            (c) =>
              c.coords.x === this.client.mouseCoords.x &&
              c.coords.y === this.client.mouseCoords.y,
          ) ||
          this.client.nearby.npcs.some(
            (n) =>
              n.coords.x === this.client.mouseCoords.x &&
              n.coords.y === this.client.mouseCoords.y,
          )
        ) {
          typeId = 1;
        } else if (
          this.client.nearby.items.some(
            (i) =>
              i.coords.x === this.client.mouseCoords.x &&
              i.coords.y === this.client.mouseCoords.y,
          )
        ) {
          typeId = 2;
        }

        entities.push({
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
        case EntityType.Item:
          this.renderItem(e, playerScreen, ctx);
          break;
        case EntityType.Cursor:
          this.renderCursor(e, playerScreen, ctx);
          break;
      }
    }

    if (this.client.state !== GameState.InGame) {
      return;
    }

    const tileEffects = this.client.effects.filter(
      (e) => e.target instanceof EffectTargetTile,
    );
    for (const effect of tileEffects) {
      const target = effect.target as EffectTargetTile;
      const tileScreen = isoToScreen(target.coords);
      effect.target.rect = new Rectangle(
        {
          x: Math.floor(
            tileScreen.x - HALF_TILE_WIDTH - playerScreen.x + HALF_GAME_WIDTH,
          ),
          y: Math.floor(
            tileScreen.y - HALF_TILE_HEIGHT - playerScreen.y + HALF_GAME_HEIGHT,
          ),
        },
        TILE_WIDTH,
        TILE_HEIGHT,
      );
      effect.renderBehind(ctx);
      ctx.globalAlpha = 0.4;
      effect.renderTransparent(ctx);
      ctx.globalAlpha = 1;
      effect.renderFront(ctx);
    }

    const main = entities.find(
      (e) =>
        e.type === EntityType.Character && e.typeId === this.client.playerId,
    );
    if (main) {
      ctx.globalAlpha = 0.4;
      ctx.drawImage(this.mainCharacterCanvas, 0, 0);
      ctx.globalAlpha = 1;
    }

    this.renderNameTag(playerScreen, ctx);
    for (const renderTopLayerEntity of this.topLayer) {
      renderTopLayerEntity();
    }
    this.topLayer = [];
  }

  renderNameTag(playerScreen: Vector2, ctx: CanvasRenderingContext2D) {
    if (!this.client.mousePosition) {
      return;
    }

    let rendered = this.renderCharacterNameTag(playerScreen, ctx);
    if (!rendered) {
      rendered = this.renderNpcNameTag(playerScreen, ctx);
    }

    if (!rendered && this.client.mouseCoords) {
      this.renderItemNameTag(playerScreen, ctx);
    }
  }

  renderCharacterNameTag(
    playerScreen: Vector2,
    ctx: CanvasRenderingContext2D,
  ): boolean {
    const entityRect = getCharacterIntersecting(this.client.mousePosition);
    if (!entityRect) {
      return false;
    }

    const characterAt = this.client.getCharacterById(entityRect.id);
    if (
      !characterAt ||
      (characterAt.invisible && this.client.admin === AdminLevel.Player)
    ) {
      return false;
    }

    if (this.client.characterAnimations.has(characterAt.playerId)) {
      return false;
    }

    ctx.fillStyle = '#fff';
    ctx.font = '12px w95fa';
    let name = characterAt.name;
    if (characterAt.guildTag !== '   ') {
      name += ` ${characterAt.guildTag}`;
    }
    const position = isoToScreen(characterAt.coords);
    const metrics = ctx.measureText(name);
    ctx.fillText(
      name,
      Math.floor(
        position.x - metrics.width / 2 - playerScreen.x + HALF_GAME_WIDTH,
      ),
      Math.floor(
        position.y -
          playerScreen.y -
          8 -
          entityRect.rect.height +
          HALF_GAME_HEIGHT,
      ),
    );

    return true;
  }

  renderNpcNameTag(
    playerScreen: Vector2,
    ctx: CanvasRenderingContext2D,
  ): boolean {
    const entityRect = getNpcIntersecting(this.client.mousePosition);
    if (!entityRect) {
      return false;
    }

    const npcAt = this.client.getNpcByIndex(entityRect.id);
    if (!npcAt) {
      return false;
    }

    if (this.client.npcAnimations.has(npcAt.index)) {
      return false;
    }

    ctx.fillStyle = '#fff';
    ctx.font = '12px w95fa';

    const position = isoToScreen(npcAt.coords);
    const data = this.client.getEnfRecordById(npcAt.id);
    if (!data) {
      return;
    }

    const metrics = ctx.measureText(data.name);
    ctx.fillText(
      data.name,
      Math.floor(
        position.x - metrics.width / 2 - playerScreen.x + HALF_GAME_WIDTH,
      ),
      Math.floor(
        position.y - playerScreen.y - entityRect.rect.height + HALF_GAME_HEIGHT,
      ),
    );

    return true;
  }

  renderItemNameTag(
    playerScreen: Vector2,
    ctx: CanvasRenderingContext2D,
  ): boolean {
    const items = this.client.nearby.items.filter(
      (i) =>
        i.coords.x === this.client.mouseCoords.x &&
        i.coords.y === this.client.mouseCoords.y,
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

    ctx.fillStyle = '#fff';
    ctx.font = '12px w95fa';

    const position = isoToScreen(item.coords);
    const name =
      item.id === 1
        ? `${item.amount} ${data.name}`
        : item.amount > 1
          ? `${data.name} x${item.amount}`
          : data.name;
    const metrics = ctx.measureText(name);
    ctx.fillText(
      name,
      Math.floor(
        position.x - metrics.width / 2 - playerScreen.x + HALF_GAME_WIDTH,
      ),
      Math.floor(
        position.y - playerScreen.y - TILE_HEIGHT + 10 + HALF_GAME_HEIGHT,
      ),
    );

    return true;
  }

  renderTile(
    entity: Entity,
    playerScreen: Vector2,
    ctx: CanvasRenderingContext2D,
  ) {
    if (entity.layer === Layer.Ground && entity.typeId === 0) {
      return;
    }

    const coords = new Coords();
    coords.x = entity.x;
    coords.y = entity.y;

    let bmpOffset = 0;

    if (entity.layer === Layer.DownWall || entity.layer === Layer.RightWall) {
      const door = this.client.getDoor(coords);
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
    const tileScreen = isoToScreen({ x: entity.x, y: entity.y });

    const screenX = Math.floor(
      tileScreen.x -
        HALF_TILE_WIDTH -
        playerScreen.x +
        HALF_GAME_WIDTH +
        offset.x,
    );
    const screenY = Math.floor(
      tileScreen.y -
        HALF_TILE_HEIGHT -
        playerScreen.y +
        HALF_GAME_HEIGHT +
        offset.y,
    );

    if (this.client.getDoor(coords)) {
      setDoorRectangle(
        coords,
        new Rectangle(
          { x: screenX, y: screenY + tile.h - DOOR_HEIGHT },
          tile.w,
          DOOR_HEIGHT,
        ),
      );
    } else if (this.getSign(entity.x, entity.y)) {
      setSignRectangle(
        coords,
        new Rectangle({ x: screenX, y: screenY }, tile.w, tile.h),
      );
    } else if (spec === MapTileSpec.BankVault) {
      setLockerRectangle(
        coords,
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
        this.animationFrame * frameWidth,
        0,
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
  ) {
    const character = this.client.getCharacterById(entity.typeId);
    if (!character) {
      return;
    }

    const animation = this.client.characterAnimations.get(character.playerId);
    if (animation) {
      animation.calculateRenderPosition(character, playerScreen);
    } else if (character.sitState === SitState.Floor) {
      calculateCharacterRenderPositionFloor(character, playerScreen);
    } else if (character.sitState === SitState.Chair) {
      calculateCharacterRenderPositionChair(character, playerScreen);
    } else {
      calculateCharacterRenderPositionStanding(character, playerScreen);
    }

    const rect = getCharacterRectangle(character.playerId);
    if (!rect) {
      return;
    }

    const effects = this.client.effects.filter(
      (e) =>
        e.target instanceof EffectTargetCharacter &&
        e.target.playerId === character.playerId,
    );
    for (const effect of effects) {
      effect.target.rect = rect;
      effect.renderBehind(ctx);
    }

    const characterCtx =
      entity.typeId === this.client.playerId
        ? this.mainCharacterCtx
        : this.characterCtx;

    characterCtx.clearRect(
      0,
      0,
      this.characterCanvas.width,
      this.characterCanvas.height,
    );

    const bubble = this.client.characterChats.get(character.playerId);
    const healthBar = this.client.characterHealthBars.get(character.playerId);
    const emote = this.client.characterEmotes.get(character.playerId);
    const frame = animation?.animationFrame || 0;

    let action: CharacterAction;
    switch (true) {
      case animation instanceof CharacterWalkAnimation:
        action = CharacterAction.Walking;
        break;
      case animation instanceof CharacterAttackAnimation ||
        animation instanceof CharacterRangedAttackAnimation: {
        const metadata = this.client.getWeaponMetadata(
          character.equipment.weapon,
        );
        if (metadata.ranged) {
          action = CharacterAction.RangedAttack;
        } else {
          action = CharacterAction.MeleeAttack;
        }
        break;
      }
      default:
        action = CharacterAction.None;
        break;
    }

    this.renderCharacterBehindLayers(character, characterCtx, frame, action);

    if (animation) {
      animation.render(character, characterCtx);
    } else if (character.sitState === SitState.Floor) {
      renderCharacterFloor(character, emote ? emote.type : null, characterCtx);
    } else if (character.sitState === SitState.Chair) {
      renderCharacterChair(character, emote ? emote.type : null, characterCtx);
    } else {
      renderCharacterStanding(
        character,
        emote ? emote.type : null,
        characterCtx,
      );
    }

    this.renderCharacterLayers(character, characterCtx, frame, action);

    if (entity.typeId === this.client.playerId && !character.invisible) {
      clipHair(
        characterCtx,
        0,
        0,
        this.mainCharacterCanvas.width,
        this.mainCharacterCanvas.height,
      );
      ctx.drawImage(this.mainCharacterCanvas, 0, 0);
    } else {
      clipHair(
        characterCtx,
        0,
        0,
        this.characterCanvas.width,
        this.characterCanvas.height,
      );
      if (character.invisible && this.client.admin !== AdminLevel.Player) {
        ctx.globalAlpha = 0.4;
        ctx.drawImage(this.characterCanvas, 0, 0);
        ctx.globalAlpha = 1;
      } else if (!character.invisible) {
        ctx.drawImage(this.characterCanvas, 0, 0);
      }
    }

    for (const effect of effects) {
      ctx.globalAlpha = 0.4;
      effect.renderTransparent(ctx);
      ctx.globalAlpha = 1;
      effect.renderFront(ctx);
    }

    if (!character.invisible || this.client.admin !== AdminLevel.Player) {
      this.topLayer.push(() => {
        renderCharacterChatBubble(bubble, character, ctx);
        renderCharacterHealthBar(healthBar, character, ctx);
        if (emote) {
          emote.render(character, ctx);
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

    const meta = this.client.getNpcMetadata(record.graphicId);
    const bubble = this.client.npcChats.get(npc.index);
    const healthBar = this.client.npcHealthBars.get(npc.index);

    const animation = this.client.npcAnimations.get(npc.index);
    if (meta.transparent) {
      ctx.globalAlpha = 0.4;
    }

    if (animation) {
      animation.render(
        record.graphicId,
        npc,
        meta,
        playerScreen,
        ctx,
        this.client.atlas,
      );
    } else {
      renderNpc(
        npc,
        record,
        meta,
        this.npcIdleAnimationFrame,
        playerScreen,
        ctx,
        this.client.atlas,
      );
    }

    if (meta.transparent) {
      ctx.globalAlpha = 1;
    }

    this.topLayer.push(() => {
      renderNpcChatBubble(bubble, npc, ctx);
      renderNpcHealthBar(healthBar, npc, ctx);
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

    let gfxId = record.graphicId * 2 - 1;
    if (item.id === 1) {
      const offset =
        item.amount >= 100_000
          ? 4
          : item.amount >= 10_000
            ? 3
            : item.amount >= 100
              ? 2
              : item.amount >= 2
                ? 1
                : 0;
      gfxId = 269 + 2 * offset;
    }

    const frame = this.client.atlas.getItem(gfxId);
    if (!frame) {
      return;
    }

    const atlas = this.client.atlas.getAtlas(frame.atlasIndex);
    if (!atlas) {
      return;
    }

    const tileScreen = isoToScreen(item.coords);

    const screenX = Math.floor(
      tileScreen.x - frame.w / 2 - playerScreen.x + HALF_GAME_WIDTH,
    );
    const screenY = Math.floor(
      tileScreen.y - frame.h / 2 - playerScreen.y + HALF_GAME_HEIGHT,
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
  }

  renderCharacterBehindLayers(
    character: CharacterMapInfo,
    ctx: CanvasRenderingContext2D,
    animationFrame: number,
    action: CharacterAction,
  ) {
    const maskType = this.client.getHatMetadata(character.equipment.hat);
    if (maskType !== HatMaskType.HideHair) {
      renderCharacterHairBehind(character, ctx, animationFrame, action);
    }
  }

  renderCharacterLayers(
    character: CharacterMapInfo,
    ctx: CanvasRenderingContext2D,
    animationFrame: number,
    action: CharacterAction,
  ) {
    renderCharacterBoots(character, ctx, animationFrame, action);
    renderCharacterArmor(character, ctx, animationFrame, action);
    const maskType = this.client.getHatMetadata(character.equipment.hat);
    if (maskType === HatMaskType.FaceMask) {
      renderCharacterHat(character, ctx, animationFrame, action);
    }
    if (maskType !== HatMaskType.HideHair) {
      renderCharacterHair(character, ctx, animationFrame, action);
    }
    if (maskType !== HatMaskType.FaceMask) {
      renderCharacterHat(character, ctx, animationFrame, action);
    }
  }

  renderCursor(
    entity: Entity,
    playerScreen: Vector2,
    ctx: CanvasRenderingContext2D,
  ) {
    if (
      this.client.mouseCoords.x < 0 ||
      this.client.mouseCoords.x > this.client.map.width ||
      this.client.mouseCoords.y < 0 ||
      this.client.mouseCoords.y > this.client.map.height
    ) {
      return;
    }

    const bmp = getBitmapById(GfxType.PostLoginUI, 24);
    if (bmp && this.client.mouseCoords) {
      const tileScreen = isoToScreen({
        x: this.client.mouseCoords.x,
        y: this.client.mouseCoords.y,
      });

      const sourceX = entity.typeId * TILE_WIDTH;

      const screenX = Math.floor(
        tileScreen.x - HALF_TILE_WIDTH - playerScreen.x + HALF_GAME_WIDTH,
      );
      const screenY = Math.floor(
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
