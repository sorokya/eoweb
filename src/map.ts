import { AdminLevel, Coords, Direction, MapTileSpec, SitState } from 'eolib';
import { CharacterFrame, NpcFrame } from './atlas';
import { type Client, GameState } from './client';
import {
  getCharacterIntersecting,
  getCharacterRectangle,
  getNpcIntersecting,
  Rectangle,
  setCharacterRectangle,
  setDoorRectangle,
  setLockerRectangle,
  setNpcRectangle,
  setSignRectangle,
} from './collision';
import {
  ANIMATION_TICKS,
  DEATH_TICKS,
  DOOR_HEIGHT,
  HALF_HALF_TILE_HEIGHT,
  HALF_TILE_HEIGHT,
  HALF_TILE_WIDTH,
  NPC_IDLE_ANIMATION_TICKS,
  PLAYER_MENU_HEIGHT,
  PLAYER_MENU_ITEM_HEIGHT,
  PLAYER_MENU_OFFSET_Y,
  PLAYER_MENU_WIDTH,
  TILE_HEIGHT,
  TILE_WIDTH,
} from './consts';
import { GAME_WIDTH, HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from './game-state';
import { GfxType, getBitmapById } from './gfx';
import { CharacterAttackAnimation } from './render/character-attack';
import { CharacterRangedAttackAnimation } from './render/character-attack-ranged';
import { renderCharacterChatBubble } from './render/character-chat-bubble';
import { CharacterDeathAnimation } from './render/character-death';
import { renderCharacterHealthBar } from './render/character-health-bar';
import { CharacterSpellChantAnimation } from './render/character-spell-chant';
import { CharacterWalkAnimation } from './render/character-walk';
import {
  EffectTargetCharacter,
  EffectTargetNpc,
  EffectTargetTile,
} from './render/effect';
import { NpcAttackAnimation } from './render/npc-attack';
import { renderNpcChatBubble } from './render/npc-chat-bubble';
import { NpcDeathAnimation } from './render/npc-death';
import { renderNpcHealthBar } from './render/npc-health-bar';
import { NpcWalkAnimation } from './render/npc-walk';
import { renderSpellChant } from './render/spell-chant';
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

export enum Layer {
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
  private mainCharacterFrame: CharacterFrame | null = null;

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
    let mainCharacterAnimation = this.client.characterAnimations.get(
      this.client.playerId,
    );

    if (mainCharacterAnimation instanceof CharacterDeathAnimation) {
      mainCharacterAnimation = mainCharacterAnimation.base;
    }

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

      this.renderCharacter(main, playerScreen, ctx, true);

      ctx.globalAlpha = 1;
    }

    this.renderNameTag(playerScreen, ctx);
    for (const renderTopLayerEntity of this.topLayer) {
      renderTopLayerEntity();
    }
    this.topLayer = [];
    this.renderPlayerMenu(ctx);
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
    let name = capitalize(characterAt.name);
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
        position.y -
          playerScreen.y -
          entityRect.rect.height -
          8 +
          HALF_GAME_HEIGHT,
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

  renderPlayerMenu(ctx: CanvasRenderingContext2D) {
    if (!this.client.menuPlayerId) {
      return;
    }

    const rect = getCharacterRectangle(this.client.menuPlayerId);
    if (!rect) {
      this.client.menuPlayerId = 0;
      return;
    }

    const bmp = getBitmapById(GfxType.PostLoginUI, 41);
    if (!bmp) {
      return;
    }

    ctx.drawImage(
      bmp,
      0,
      0,
      PLAYER_MENU_WIDTH,
      PLAYER_MENU_HEIGHT,
      rect.position.x + rect.width + 10,
      rect.position.y,
      PLAYER_MENU_WIDTH,
      PLAYER_MENU_HEIGHT,
    );

    const hovered = this.client.getHoveredPlayerMenuItem();
    if (hovered !== undefined) {
      ctx.drawImage(
        bmp,
        PLAYER_MENU_WIDTH,
        PLAYER_MENU_OFFSET_Y + hovered * PLAYER_MENU_ITEM_HEIGHT,
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
    let animation = this.client.characterAnimations.get(character.playerId);
    if (animation instanceof CharacterDeathAnimation) {
      dying = true;
      dyingTicks = animation.ticks;
      animation = animation.base;
    }

    const downRight = [Direction.Down, Direction.Right].includes(
      character.direction,
    );
    const additionalOffset = { x: 0, y: 0 };
    let characterFrame: CharacterFrame;
    let coords: Vector2 = character.coords;
    switch (true) {
      case animation instanceof CharacterWalkAnimation: {
        additionalOffset.x = animation.walkOffset.x;
        additionalOffset.y = animation.walkOffset.y;
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

    const screenCoords = isoToScreen(coords);
    const mirrored = [Direction.Right, Direction.Up].includes(
      character.direction,
    );

    const screenX = Math.floor(
      screenCoords.x - playerScreen.x + HALF_GAME_WIDTH + additionalOffset.x,
    );

    const screenY = Math.floor(
      screenCoords.y -
        HALF_HALF_TILE_HEIGHT +
        TILE_HEIGHT +
        frame.yOffset -
        playerScreen.y +
        HALF_GAME_HEIGHT +
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

    setCharacterRectangle(character.playerId, rect);

    const effects = justCharacter
      ? []
      : this.client.effects.filter(
          (e) =>
            e.target instanceof EffectTargetCharacter &&
            e.target.playerId === character.playerId,
        );
    for (const effect of effects) {
      effect.target.rect = rect;
      effect.renderBehind(ctx);
    }

    if (mirrored) {
      ctx.save();
      ctx.translate(GAME_WIDTH, 0);
      ctx.scale(-1, 1);
    }

    const drawX = Math.floor(
      mirrored
        ? GAME_WIDTH - screenX - frame.w - frame.mirroredXOffset
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

    if (mirrored) {
      ctx.restore();
    }

    for (const effect of effects) {
      ctx.globalAlpha = 0.4;
      effect.renderTransparent(ctx);
      ctx.globalAlpha = 1;
      effect.renderFront(ctx);
    }

    if (
      !justCharacter &&
      (!character.invisible || this.client.admin !== AdminLevel.Player)
    ) {
      const bubble = justCharacter
        ? null
        : this.client.characterChats.get(character.playerId);
      const healthBar = justCharacter
        ? null
        : this.client.characterHealthBars.get(character.playerId);
      const emote = justCharacter
        ? null
        : this.client.characterEmotes.get(character.playerId);

      this.topLayer.push(() => {
        renderCharacterChatBubble(bubble, character, ctx);
        renderCharacterHealthBar(healthBar, character, ctx);
        if (emote) {
          emote.render(character, ctx);
        }

        if (
          animation instanceof CharacterSpellChantAnimation &&
          !animation.animationFrame
        ) {
          renderSpellChant(
            getCharacterRectangle(character.playerId),
            animation.chant,
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
    let animation = this.client.npcAnimations.get(npc.index);
    if (animation instanceof NpcDeathAnimation) {
      dying = true;
      dyingTicks = animation.ticks;
      animation = animation.base;
    }
    const meta = this.client.getNpcMetadata(record.graphicId);
    const downRight = [Direction.Down, Direction.Right].includes(npc.direction);
    const additionalOffset = { x: 0, y: 0 };
    let npcFrame: NpcFrame;
    let coords: Vector2 = npc.coords;

    switch (true) {
      case animation instanceof NpcWalkAnimation: {
        additionalOffset.x += animation.walkOffset.x;
        additionalOffset.y += animation.walkOffset.y;
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

    const downRightAdjust = downRight ? 1 : -1;
    const upRightAdjust = [Direction.Up, Direction.Right].includes(
      npc.direction,
    )
      ? -1
      : 1;
    if (
      npcFrame === NpcFrame.AttackDownRight2 ||
      npcFrame === NpcFrame.AttackUpLeft2
    ) {
      additionalOffset.x +=
        meta.xOffsetAttack * upRightAdjust + meta.xOffset * upRightAdjust;
      additionalOffset.y -= meta.yOffsetAttack * downRightAdjust + meta.yOffset;
    } else {
      additionalOffset.x += meta.xOffset * upRightAdjust;
      additionalOffset.y -= meta.yOffset;
    }

    const screenCoords = isoToScreen(coords);
    const mirrored = [Direction.Right, Direction.Up].includes(npc.direction);
    const screenX = Math.floor(
      screenCoords.x - playerScreen.x + HALF_GAME_WIDTH + additionalOffset.x,
    );
    const screenY = Math.floor(
      screenCoords.y -
        playerScreen.y +
        HALF_GAME_HEIGHT +
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

    const effects = this.client.effects.filter(
      (e) =>
        e.target instanceof EffectTargetNpc && e.target.index === npc.index,
    );

    for (const effect of effects) {
      effect.target.rect = rect;
      effect.renderBehind(ctx);
    }

    if (mirrored) {
      ctx.save(); // Save the current context state
      ctx.translate(GAME_WIDTH, 0); // Move origin to the right edge
      ctx.scale(-1, 1); // Flip horizontally
    }

    const drawX = Math.floor(
      mirrored
        ? GAME_WIDTH - screenX - frame.w - frame.mirroredXOffset
        : screenX + frame.xOffset,
    );

    if (meta.transparent) {
      ctx.globalAlpha = 0.4;
    }

    if (dying) {
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

    if (mirrored) {
      ctx.restore(); // Restore the context to its original state
    }

    for (const effect of effects) {
      ctx.globalAlpha = 0.4;
      effect.renderTransparent(ctx);
      ctx.globalAlpha = 1;
      effect.renderFront(ctx);
    }

    const bubble = this.client.npcChats.get(npc.index);
    const healthBar = this.client.npcHealthBars.get(npc.index);

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

    const gfxId = getItemGraphicId(item.id, record.graphicId, item.amount);
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
      tileScreen.x - playerScreen.x + HALF_GAME_WIDTH + frame.xOffset,
    );
    const screenY = Math.floor(
      tileScreen.y - playerScreen.y + HALF_GAME_HEIGHT + frame.yOffset,
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
