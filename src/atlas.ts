import {
  type CharacterMapInfo,
  Direction,
  Emote,
  type EquipmentMapInfo,
  Gender,
  MapTileSpec,
} from 'eolib';
import type { Client } from './client';
import {
  ATLAS_EXPIRY_TICKS,
  CHARACTER_HEIGHT,
  CHARACTER_MELEE_ATTACK_WIDTH,
  CHARACTER_RAISED_HAND_HEIGHT,
  CHARACTER_RANGE_ATTACK_WIDTH,
  CHARACTER_SIT_CHAIR_HEIGHT,
  CHARACTER_SIT_CHAIR_WIDTH,
  CHARACTER_SIT_GROUND_HEIGHT,
  CHARACTER_SIT_GROUND_WIDTH,
  CHARACTER_WALKING_HEIGHT,
  CHARACTER_WALKING_WIDTH,
  CHARACTER_WIDTH,
  HALF_HALF_TILE_HEIGHT,
  NUMBER_OF_EFFECTS,
  NUMBER_OF_EMOTES,
  NUMBER_OF_SLASHES,
  TILE_HEIGHT,
} from './consts';
import { GfxType } from './gfx';
import { LAYER_GFX_MAP } from './map';
import { clipHair } from './utils/clip-hair';
import { HatMaskType } from './utils/get-hat-metadata';
import { getItemGraphicId } from './utils/get-item-graphic-id';
import { padWithZeros } from './utils/pad-with-zeros';

const ATLAS_SIZE = 2048;
const CHARACTER_FRAME_SIZE = 100;
const HALF_CHARACTER_FRAME_SIZE = CHARACTER_FRAME_SIZE >> 1;

const MAP_ATLAS_INDEX = 254;
const STATIC_ATLAS_INDEX = 255;

export enum CharacterFrame {
  StandingDownRight = 0,
  StandingUpLeft = 1,
  WalkingDownRight1 = 2,
  WalkingDownRight2 = 3,
  WalkingDownRight3 = 4,
  WalkingDownRight4 = 5,
  WalkingUpLeft1 = 6,
  WalkingUpLeft2 = 7,
  WalkingUpLeft3 = 8,
  WalkingUpLeft4 = 9,
  RaisedHandDownRight = 10,
  RaisedHandUpLeft = 11,
  MeleeAttackDownRight1 = 12,
  MeleeAttackDownRight2 = 13,
  MeleeAttackUpLeft1 = 14,
  MeleeAttackUpLeft2 = 15,
  ChairDownRight = 16,
  ChairUpLeft = 17,
  FloorDownRight = 18,
  FloorUpLeft = 19,
  RangeAttackDownRight = 20,
  RangeAttackUpLeft = 21,
}

export enum NpcFrame {
  StandingDownRight1 = 0,
  StandingDownRight2 = 1,
  StandingUpLeft1 = 2,
  StandingUpLeft2 = 3,
  WalkingDownRight1 = 4,
  WalkingDownRight2 = 5,
  WalkingDownRight3 = 6,
  WalkingDownRight4 = 7,
  WalkingUpLeft1 = 8,
  WalkingUpLeft2 = 9,
  WalkingUpLeft3 = 10,
  WalkingUpLeft4 = 11,
  AttackDownRight1 = 12,
  AttackDownRight2 = 13,
  AttackUpLeft1 = 14,
  AttackUpLeft2 = 15,
}

const FRAMES_TO_FRAME_COUNT_MAP = {
  [CharacterFrame.StandingDownRight]: 1,
  [CharacterFrame.StandingUpLeft]: 1,
  [CharacterFrame.WalkingDownRight1]: 4,
  [CharacterFrame.WalkingDownRight2]: 4,
  [CharacterFrame.WalkingDownRight3]: 4,
  [CharacterFrame.WalkingDownRight4]: 4,
  [CharacterFrame.WalkingUpLeft1]: 4,
  [CharacterFrame.WalkingUpLeft2]: 4,
  [CharacterFrame.WalkingUpLeft3]: 4,
  [CharacterFrame.WalkingUpLeft4]: 4,
  [CharacterFrame.MeleeAttackDownRight1]: 2,
  [CharacterFrame.MeleeAttackDownRight2]: 2,
  [CharacterFrame.MeleeAttackUpLeft1]: 2,
  [CharacterFrame.MeleeAttackUpLeft2]: 2,
  [CharacterFrame.RaisedHandDownRight]: 1,
  [CharacterFrame.RaisedHandUpLeft]: 1,
  [CharacterFrame.ChairDownRight]: 1,
  [CharacterFrame.ChairUpLeft]: 1,
  [CharacterFrame.FloorDownRight]: 1,
  [CharacterFrame.FloorUpLeft]: 1,
  [CharacterFrame.RangeAttackDownRight]: 1,
  [CharacterFrame.RangeAttackUpLeft]: 1,
};

const FRAME_TO_FRAME_NUMBER_MAP = {
  [CharacterFrame.StandingDownRight]: 0,
  [CharacterFrame.StandingUpLeft]: 0,
  [CharacterFrame.WalkingDownRight1]: 0,
  [CharacterFrame.WalkingDownRight2]: 1,
  [CharacterFrame.WalkingDownRight3]: 2,
  [CharacterFrame.WalkingDownRight4]: 3,
  [CharacterFrame.WalkingUpLeft1]: 0,
  [CharacterFrame.WalkingUpLeft2]: 1,
  [CharacterFrame.WalkingUpLeft3]: 2,
  [CharacterFrame.WalkingUpLeft4]: 3,
  [CharacterFrame.MeleeAttackDownRight1]: 0,
  [CharacterFrame.MeleeAttackDownRight2]: 1,
  [CharacterFrame.MeleeAttackUpLeft1]: 0,
  [CharacterFrame.MeleeAttackUpLeft2]: 1,
  [CharacterFrame.RaisedHandDownRight]: 0,
  [CharacterFrame.RaisedHandUpLeft]: 0,
  [CharacterFrame.ChairDownRight]: 0,
  [CharacterFrame.ChairUpLeft]: 0,
  [CharacterFrame.FloorDownRight]: 0,
  [CharacterFrame.FloorUpLeft]: 0,
  [CharacterFrame.RangeAttackDownRight]: 0,
  [CharacterFrame.RangeAttackUpLeft]: 0,
};

const WEAPON_VISIBLE_MAP = {
  [CharacterFrame.StandingDownRight]: true,
  [CharacterFrame.StandingUpLeft]: true,
  [CharacterFrame.WalkingDownRight1]: true,
  [CharacterFrame.WalkingDownRight2]: true,
  [CharacterFrame.WalkingDownRight3]: true,
  [CharacterFrame.WalkingDownRight4]: true,
  [CharacterFrame.WalkingUpLeft1]: true,
  [CharacterFrame.WalkingUpLeft2]: true,
  [CharacterFrame.WalkingUpLeft3]: true,
  [CharacterFrame.WalkingUpLeft4]: true,
  [CharacterFrame.MeleeAttackDownRight1]: true,
  [CharacterFrame.MeleeAttackDownRight2]: true,
  [CharacterFrame.MeleeAttackUpLeft1]: true,
  [CharacterFrame.MeleeAttackUpLeft2]: true,
  [CharacterFrame.RaisedHandDownRight]: true,
  [CharacterFrame.RaisedHandUpLeft]: true,
  [CharacterFrame.ChairDownRight]: false,
  [CharacterFrame.ChairUpLeft]: false,
  [CharacterFrame.FloorDownRight]: false,
  [CharacterFrame.FloorUpLeft]: false,
  [CharacterFrame.RangeAttackDownRight]: true,
  [CharacterFrame.RangeAttackUpLeft]: true,
};

const WEAPON_FRAME_MAP = {
  [CharacterFrame.StandingDownRight]: 0,
  [CharacterFrame.StandingUpLeft]: 1,
  [CharacterFrame.WalkingDownRight1]: 2,
  [CharacterFrame.WalkingDownRight2]: 3,
  [CharacterFrame.WalkingDownRight3]: 4,
  [CharacterFrame.WalkingDownRight4]: 5,
  [CharacterFrame.WalkingUpLeft1]: 6,
  [CharacterFrame.WalkingUpLeft2]: 7,
  [CharacterFrame.WalkingUpLeft3]: 8,
  [CharacterFrame.WalkingUpLeft4]: 9,
  [CharacterFrame.RaisedHandDownRight]: 10,
  [CharacterFrame.RaisedHandUpLeft]: 11,
  [CharacterFrame.MeleeAttackDownRight1]: 12,
  [CharacterFrame.MeleeAttackDownRight2]: 13,
  [CharacterFrame.MeleeAttackUpLeft1]: 14,
  [CharacterFrame.MeleeAttackUpLeft2]: 15,
  [CharacterFrame.RangeAttackDownRight]: 17,
  [CharacterFrame.RangeAttackUpLeft]: 18,
};

const BACK_FRAME_MAP = {
  [CharacterFrame.StandingDownRight]: 0,
  [CharacterFrame.StandingUpLeft]: 1,
  [CharacterFrame.WalkingDownRight1]: 0,
  [CharacterFrame.WalkingDownRight2]: 0,
  [CharacterFrame.WalkingDownRight3]: 0,
  [CharacterFrame.WalkingDownRight4]: 0,
  [CharacterFrame.WalkingUpLeft1]: 1,
  [CharacterFrame.WalkingUpLeft2]: 1,
  [CharacterFrame.WalkingUpLeft3]: 1,
  [CharacterFrame.WalkingUpLeft4]: 1,
  [CharacterFrame.RaisedHandDownRight]: 0,
  [CharacterFrame.RaisedHandUpLeft]: 1,
  [CharacterFrame.MeleeAttackDownRight1]: 2,
  [CharacterFrame.MeleeAttackDownRight2]: 2,
  [CharacterFrame.MeleeAttackUpLeft1]: 3,
  [CharacterFrame.MeleeAttackUpLeft2]: 3,
  [CharacterFrame.ChairDownRight]: 0,
  [CharacterFrame.ChairUpLeft]: 1,
  [CharacterFrame.FloorDownRight]: 0,
  [CharacterFrame.FloorUpLeft]: 1,
  [CharacterFrame.RangeAttackDownRight]: 2,
  [CharacterFrame.RangeAttackUpLeft]: 3,
};

type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type Frame = {
  atlasIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  xOffset: number;
  yOffset: number;
  mirroredXOffset: number;
};

type CharacterAtlasEntry = {
  playerId: number;
  tickCount: number;
  gender: Gender;
  skin: number;
  hairStyle: number;
  hairColor: number;
  equipment: EquipmentMapInfo;
  hash: string;
  frames: (Frame | undefined)[];
};

type TileAtlasEntry = {
  gfxType: GfxType;
  graphicId: number;
  atlasIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  xOffset: number;
  yOffset: number;
};

type EmoteAtlasEntry = {
  emoteId: number;
  frames: Frame[];
};

type EffectAtlasEntry = {
  effectId: number;
  behindFrames: Frame[];
  transparentFrames: Frame[];
  frontFrames: Frame[];
};

type NpcAtlasEntry = {
  graphicId: number;
  tickCount: number;
  frames: (Frame | undefined)[];
  keep: boolean;
};

type ItemAtlasEntry = {
  graphicId: number;
  atlasIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  xOffset: number;
  yOffset: number;
};

type Bmp = {
  gfxType?: GfxType;
  id?: number;
  path?: string;
  img: HTMLImageElement;
  loaded: boolean;
};

enum FrameType {
  Character = 0,
  Npc = 1,
  Item = 2,
  Tile = 3,
  Static = 4,
  Emote = 5,
  EffectBehind = 6,
  EffectTransparent = 7,
  EffectFront = 8,
}

type PlaceableFrame = {
  type: FrameType;
  typeId: number;
  frameIndex: number;
  w: number;
  h: number;
};

class AtlasCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private img: HTMLImageElement;
  private loaded = false;
  skyline = [{ x: 0, y: 0, w: ATLAS_SIZE }];

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = ATLAS_SIZE;
    this.canvas.height = ATLAS_SIZE;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.img = new Image();
    this.img.onload = () => {
      this.loaded = true;
    };
  }

  commit() {
    this.img.src = this.canvas.toDataURL();
  }

  getImg(): HTMLImageElement | undefined {
    if (!this.loaded) {
      return;
    }

    return this.img;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }
}

export enum StaticAtlasEntryType {
  MinimapIcons = 0,
  HealthBars = 1,
  DamageNumbers = 2,
  HealNumbers = 3,
  Miss = 4,
  PlayerMenu = 5,
  Cursor = 6,
  Sans11 = 7,
}

export class Atlas {
  private characters: CharacterAtlasEntry[] = [];
  private npcs: NpcAtlasEntry[] = [];
  private items: ItemAtlasEntry[] = [];
  private tiles: TileAtlasEntry[] = [];
  private emotes: EmoteAtlasEntry[] = [];
  private effects: EffectAtlasEntry[] = [];
  private staticEntries: Map<StaticAtlasEntryType, TileAtlasEntry> = new Map();
  private client: Client;
  mapId = 0;
  private mapHasChairs = false;
  private bmpsToLoad: Bmp[] = [];
  private loading = false;
  private appended = true;
  private staticAtlas: AtlasCanvas;
  private mapAtlas: AtlasCanvas;
  private atlases: AtlasCanvas[];
  private currentAtlasIndex = 0;
  private ctx: CanvasRenderingContext2D;
  private staleFrames: Frame[] = [];
  private temporaryCharacterFrames: Map<number, ImageData[]> = new Map();
  private tmpBehindCanvas: HTMLCanvasElement;
  private tmpBehindCtx: CanvasRenderingContext2D;
  private tmpCanvas: HTMLCanvasElement;
  private tmpCtx: CanvasRenderingContext2D;

  offsetFrame: HTMLSelectElement =
    document.querySelector<HTMLSelectElement>('#offset-frame');
  offsetX: HTMLInputElement =
    document.querySelector<HTMLInputElement>('#offset-x');
  offsetY: HTMLInputElement =
    document.querySelector<HTMLInputElement>('#offset-y');

  constructor(client: Client) {
    this.client = client;
    this.staticAtlas = new AtlasCanvas();
    this.mapAtlas = new AtlasCanvas();
    this.atlases = [new AtlasCanvas()];
    this.ctx = this.atlases[0].getContext();
    this.tmpCanvas = document.createElement('canvas');
    this.tmpCanvas.width = CHARACTER_FRAME_SIZE;
    this.tmpCanvas.height = CHARACTER_FRAME_SIZE;
    this.tmpCtx = this.tmpCanvas.getContext('2d', {
      willReadFrequently: true,
    });

    this.tmpBehindCanvas = document.createElement('canvas');
    this.tmpBehindCanvas.width = CHARACTER_FRAME_SIZE;
    this.tmpBehindCanvas.height = CHARACTER_FRAME_SIZE;
    this.tmpBehindCtx = this.tmpBehindCanvas.getContext('2d', {
      willReadFrequently: true,
    });
  }

  getAtlas(index: number): HTMLImageElement | undefined {
    if (index === STATIC_ATLAS_INDEX) {
      return this.staticAtlas.getImg();
    }

    if (index === MAP_ATLAS_INDEX) {
      return this.mapAtlas.getImg();
    }

    return this.atlases[index]?.getImg();
  }

  getItem(graphicId: number): ItemAtlasEntry | undefined {
    const item = this.items.find((i) => i.graphicId === graphicId);
    if (!item) return undefined;

    return item;
  }

  getTile(gfxType: GfxType, graphicId: number): TileAtlasEntry | undefined {
    const tile = this.tiles.find(
      (t) => t.gfxType === gfxType && t.graphicId === graphicId,
    );
    if (!tile) return undefined;

    return tile;
  }

  getNpcFrame(graphicId: number, frame: number): Frame | undefined {
    const npc = this.npcs.find((n) => n.graphicId === graphicId);
    if (!npc) return undefined;

    return npc.frames[frame];
  }

  getCharacterFrame(
    playerId: number,
    frame: CharacterFrame,
  ): Frame | undefined {
    const character = this.characters.find((c) => c.playerId === playerId);
    if (!character) return undefined;
    return character.frames[frame];
  }

  getStaticEntry(type: StaticAtlasEntryType): TileAtlasEntry | undefined {
    return this.staticEntries.get(type);
  }

  getEmoteFrame(emoteId: number, frameIndex: number): Frame | undefined {
    const slot = this.getEmoteSlot(emoteId);
    const emote = this.emotes.find((e) => e.emoteId === slot);
    if (!emote) return undefined;

    return emote.frames[frameIndex];
  }

  private getEmoteSlot(emoteId: number): number {
    switch (emoteId) {
      case Emote.Happy:
        return 0;
      case Emote.Sad:
        return 1;
      case Emote.Surprised:
        return 2;
      case Emote.Confused:
        return 3;
      case Emote.Moon:
        return 4;
      case Emote.Angry:
        return 5;
      case Emote.Hearts:
        return 6;
      case Emote.Depressed:
        return 7;
      case Emote.Embarrassed:
        return 8;
      case Emote.Suicidal:
        return 9;
      case Emote.Drunk:
        return 10;
      case Emote.Trade:
        return 11;
      case Emote.LevelUp:
        return 12;
      case Emote.Playful:
        return 13;
      case 15: // TODO: Bard should be in protocol
        return 14;
      default:
        return 0;
    }
  }

  getEffectBehindFrame(
    effectId: number,
    frameIndex: number,
  ): Frame | undefined {
    const effect = this.effects.find((e) => e.effectId === effectId);
    if (!effect) return undefined;

    return effect.behindFrames[frameIndex];
  }

  getEffectTransparentFrame(
    effectId: number,
    frameIndex: number,
  ): Frame | undefined {
    const effect = this.effects.find((e) => e.effectId === effectId);
    if (!effect) return undefined;

    return effect.transparentFrames[frameIndex];
  }

  getEffectFrontFrame(effectId: number, frameIndex: number): Frame | undefined {
    const effect = this.effects.find((e) => e.effectId === effectId);
    if (!effect) return undefined;

    return effect.frontFrames[frameIndex];
  }

  insert(w: number, h: number): Rect {
    let bestAtlasIndex = -1;
    let bestX = 0;
    let bestY = Number.POSITIVE_INFINITY;
    let bestIndex = -1;

    if (this.currentAtlasIndex === STATIC_ATLAS_INDEX) {
      for (let i = 0; i < this.staticAtlas.skyline.length; ++i) {
        const y = this.fitSkyline(this.staticAtlas, i, w, h);
        if (y >= 0) {
          if (
            y + h <= ATLAS_SIZE &&
            (y < bestY ||
              (y === bestY && this.staticAtlas.skyline[i].x < bestX))
          ) {
            bestY = y;
            bestX = this.staticAtlas.skyline[i].x;
            bestIndex = i;
          }
        }
      }

      if (bestIndex !== -1) {
        const placed = { x: bestX, y: bestY, w, h };
        this.addSkylineLevel(this.staticAtlas, bestIndex, placed);
        return placed;
      }

      throw new Error('No space left in static atlas');
    }

    if (this.currentAtlasIndex === MAP_ATLAS_INDEX) {
      for (let i = 0; i < this.mapAtlas.skyline.length; ++i) {
        const y = this.fitSkyline(this.mapAtlas, i, w, h);
        if (y >= 0) {
          if (
            y + h <= ATLAS_SIZE &&
            (y < bestY || (y === bestY && this.mapAtlas.skyline[i].x < bestX))
          ) {
            bestY = y;
            bestX = this.mapAtlas.skyline[i].x;
            bestIndex = i;
          }
        }
      }

      if (bestIndex !== -1) {
        const placed = { x: bestX, y: bestY, w, h };
        this.addSkylineLevel(this.mapAtlas, bestIndex, placed);
        return placed;
      }

      throw new Error('No space left in map atlas');
    }

    for (const [index, atlas] of this.atlases.entries()) {
      for (let i = 0; i < atlas.skyline.length; ++i) {
        const y = this.fitSkyline(atlas, i, w, h);
        if (y >= 0) {
          if (
            y + h <= ATLAS_SIZE &&
            (y < bestY || (y === bestY && atlas.skyline[i].x < bestX))
          ) {
            bestY = y;
            bestX = atlas.skyline[i].x;
            bestIndex = i;
            bestAtlasIndex = index;
          }
        }
      }
    }

    // No fit found → create new atlas
    if (bestAtlasIndex === -1) {
      const newAtlas = new AtlasCanvas();
      newAtlas.skyline = [{ x: 0, y: 0, w: ATLAS_SIZE }];
      this.atlases.push(newAtlas);
      this.currentAtlasIndex = this.atlases.length - 1;
      this.ctx = newAtlas.getContext();
      bestIndex = 0;
      bestX = 0;
      bestY = 0;
    } else if (bestAtlasIndex !== this.currentAtlasIndex) {
      this.currentAtlasIndex = bestAtlasIndex;
      this.ctx = this.atlases[this.currentAtlasIndex].getContext();
    }

    const atlas = this.atlases[this.currentAtlasIndex];
    const placed = { x: bestX, y: bestY, w, h };

    this.addSkylineLevel(atlas, bestIndex, placed);
    return placed;
  }

  fitSkyline(atlas: AtlasCanvas, index: number, w: number, h: number): number {
    const node = atlas.skyline[index];
    const x = node.x;
    let widthLeft = w;
    let y = node.y;

    if (x + w > ATLAS_SIZE) return -1;

    // find the max height under this span
    let i = index;
    while (widthLeft > 0) {
      if (i >= atlas.skyline.length) return -1;
      const cur = atlas.skyline[i];
      y = Math.max(y, cur.y);
      if (y + h > ATLAS_SIZE) return -1;
      widthLeft -= cur.w;
      i++;
    }
    return y;
  }

  addSkylineLevel(atlas: AtlasCanvas, index: number, rect: Rect) {
    const newNode = { x: rect.x, y: rect.y + rect.h, w: rect.w };
    atlas.skyline.splice(index, 0, newNode);

    // Remove overlapping parts
    for (let i = index + 1; i < atlas.skyline.length; ++i) {
      const cur = atlas.skyline[i];
      const prev = atlas.skyline[i - 1];
      if (cur.x < prev.x + prev.w) {
        const shrink = prev.x + prev.w - cur.x;
        cur.x += shrink;
        cur.w -= shrink;
        if (cur.w <= 0) {
          atlas.skyline.splice(i, 1);
          i--;
        } else break;
      } else break;
    }

    // Merge adjacent nodes with same height
    for (let i = 0; i < atlas.skyline.length - 1; ++i) {
      const a = atlas.skyline[i];
      const b = atlas.skyline[i + 1];
      if (a.y === b.y) {
        a.w += b.w;
        atlas.skyline.splice(i + 1, 1);
        i--;
      }
    }
  }

  private addStaleFrame(frame: Frame) {
    this.staleFrames.push({ ...frame });
  }

  clearStaleFrames() {
    if (!this.staleFrames.length) return;

    for (const [index, atlas] of this.atlases.entries()) {
      const ctx = atlas.getContext();

      const clearedFrames: Rect[] = [];
      for (const frame of this.staleFrames) {
        if (frame.atlasIndex !== index) continue;
        ctx.clearRect(frame.x, frame.y, frame.w, frame.h);
        clearedFrames.push({ x: frame.x, y: frame.y, w: frame.w, h: frame.h });
      }

      // Reclaim skyline space
      for (const cleared of clearedFrames) {
        let insertIndex = -1;
        for (let i = 0; i < atlas.skyline.length; ++i) {
          const node = atlas.skyline[i];
          if (node.x >= cleared.x + cleared.w) {
            insertIndex = i;
            break;
          }
        }

        if (insertIndex === -1) {
          atlas.skyline.push({
            x: cleared.x,
            y: 0,
            w: cleared.w,
          });
        } else {
          atlas.skyline.splice(insertIndex, 0, {
            x: cleared.x,
            y: 0,
            w: cleared.w,
          });
        }

        // Merge adjacent nodes with same height
        for (let i = 0; i < atlas.skyline.length - 1; ++i) {
          const a = atlas.skyline[i];
          const b = atlas.skyline[i + 1];
          if (a.y === b.y) {
            a.w += b.w;
            atlas.skyline.splice(i + 1, 1);
            i--;
          }
        }
      }
    }

    this.staleFrames = [];
    this.currentAtlasIndex = 0;
    this.ctx = this.atlases[0].getContext();
  }

  refresh() {
    if (this.loading) return;
    this.loading = true;

    this.bmpsToLoad = [];

    if (this.mapId !== this.client.mapId) {
      this.tiles = [];
      const ctx = this.mapAtlas.getContext();
      ctx.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
      this.mapAtlas.skyline = [{ x: 0, y: 0, w: ATLAS_SIZE }];
      this.mapId = this.client.mapId;
      this.reset();
    }

    this.refreshCharacters();
    this.refreshNpcs();
    this.refreshItems();

    if (
      this.characters.some((c) =>
        c.frames.some((f) => f && f.atlasIndex === -1),
      )
    ) {
      for (let i = 1; i <= 8; ++i) {
        this.addBmpToLoad(GfxType.SkinSprites, i);
      }
    }

    if (this.bmpsToLoad.length) {
      this.waitForBmpsToLoadThenUpdateAtlas();
    } else {
      this.loading = false;
    }
  }

  private waitForBmpsToLoadThenUpdateAtlas() {
    if (this.bmpsToLoad.some((bmp) => !bmp.loaded)) {
      setTimeout(() => this.waitForBmpsToLoadThenUpdateAtlas(), 50);
    } else {
      this.updateAtlas();
    }
  }

  private addBmpToLoad(gfxType: GfxType, id: number) {
    if (
      !this.bmpsToLoad.find((bmp) => bmp.gfxType === gfxType && bmp.id === id)
    ) {
      const img = new Image();
      const bmp = {
        gfxType,
        id,
        img,
        loaded: false,
      };

      img.onload = () => {
        bmp.loaded = true;
      };

      img.src = `/gfx/gfx${padWithZeros(gfxType, 3)}/${id + 100}.png`;
      this.bmpsToLoad.push(bmp);
    }
  }

  private addBmpToLoadByPath(path: string) {
    if (!this.bmpsToLoad.find((bmp) => bmp.path === path)) {
      const img = new Image();
      const bmp = {
        path,
        img,
        loaded: false,
      };

      img.onload = () => {
        bmp.loaded = true;
      };

      img.src = path;
      this.bmpsToLoad.push(bmp);
    }
  }

  reset() {
    this.characters = [];
    this.npcs = [];
    this.items = [];
    this.mapId = this.client.mapId;

    for (const atlas of this.atlases) {
      const ctx = atlas.getContext();
      atlas.skyline = [{ x: 0, y: 0, w: ATLAS_SIZE }];
      ctx.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
    }

    this.currentAtlasIndex = 0;
    this.ctx = this.atlases[0].getContext();

    const chairSpecs = [
      MapTileSpec.ChairAll,
      MapTileSpec.ChairDown,
      MapTileSpec.ChairLeft,
      MapTileSpec.ChairRight,
      MapTileSpec.ChairUp,
      MapTileSpec.ChairDownRight,
      MapTileSpec.ChairUpLeft,
    ];
    this.mapHasChairs = this.client.map.tileSpecRows.some((r) =>
      r.tiles.some((t) => chairSpecs.includes(t.tileSpec)),
    );

    this.loadMapGraphicLayers();
    this.loadStaticEntries();
    this.loadEmoteEntries();
    this.loadEffectEntries();
  }

  private loadMapGraphicLayers() {
    if (this.tiles.length) {
      return;
    }

    if (this.client.map.fillTile > 0) {
      this.addBmpToLoad(GfxType.MapTiles, this.client.map.fillTile);
      this.tiles.push({
        gfxType: GfxType.MapTiles,
        graphicId: this.client.map.fillTile,
        atlasIndex: -1,
        x: -1,
        y: -1,
        w: -1,
        h: -1,
        xOffset: 0,
        yOffset: 0,
      });
    }

    for (const [index, layer] of this.client.map.graphicLayers.entries()) {
      for (const row of layer.graphicRows) {
        for (const tile of row.tiles) {
          if (!tile.graphic) {
            continue;
          }

          const gfxType = LAYER_GFX_MAP[index];
          const existing = this.bmpsToLoad.find(
            (t) => t.gfxType === gfxType && t.id === tile.graphic,
          );
          if (!existing) {
            this.addBmpToLoad(gfxType, tile.graphic);
            this.tiles.push({
              gfxType,
              graphicId: tile.graphic,
              atlasIndex: -1,
              x: -1,
              y: -1,
              w: -1,
              h: -1,
              xOffset: 0,
              yOffset: 0,
            });

            if (
              gfxType === GfxType.MapWalls &&
              this.client.getDoor({ x: tile.x, y: row.y })
            ) {
              this.addBmpToLoad(gfxType, tile.graphic + 1);
              this.tiles.push({
                gfxType,
                graphicId: tile.graphic + 1,
                atlasIndex: -1,
                x: -1,
                y: -1,
                w: -1,
                h: -1,
                xOffset: 0,
                yOffset: 0,
              });
            }
          }
        }
      }
    }

    for (const spawn of this.client.map.npcs) {
      const record = this.client.getEnfRecordById(spawn.id);
      if (!record) {
        continue;
      }

      const existing = this.npcs.find((n) => n.graphicId === record.graphicId);
      if (existing) {
        continue;
      }

      const npc = {
        graphicId: record.graphicId,
        frames: [],
        keep: true,
        tickCount: 0,
        size: { w: 0, h: 0 },
      };

      const baseId = (record.graphicId - 1) * 40;
      for (let i = 1; i <= 18; ++i) {
        this.addBmpToLoad(GfxType.NPC, baseId + i);
        npc.frames.push({
          atlasIndex: -1,
          x: -1,
          y: -1,
          w: -1,
          h: -1,
          xOffset: 0,
          yOffset: 0,
          mirroredXOffset: 0,
        });
      }

      this.npcs.push(npc);
    }
  }

  private loadStaticEntries() {
    if (this.staticEntries.size > 0) {
      return;
    }

    this.staticEntries.set(StaticAtlasEntryType.MinimapIcons, {
      gfxType: GfxType.PostLoginUI,
      graphicId: 45,
      atlasIndex: -1,
      x: -1,
      y: -1,
      w: -1,
      h: -1,
      xOffset: 0,
      yOffset: 0,
    });
    this.addBmpToLoad(GfxType.PostLoginUI, 45);

    for (const id of [
      StaticAtlasEntryType.HealthBars,
      StaticAtlasEntryType.DamageNumbers,
      StaticAtlasEntryType.HealNumbers,
      StaticAtlasEntryType.Miss,
    ]) {
      this.staticEntries.set(id, {
        gfxType: GfxType.PostLoginUI,
        graphicId: 58,
        atlasIndex: -1,
        x: -1,
        y: -1,
        w: -1,
        h: -1,
        xOffset: 0,
        yOffset: 0,
      });
    }
    this.addBmpToLoad(GfxType.PostLoginUI, 58);

    this.staticEntries.set(StaticAtlasEntryType.PlayerMenu, {
      gfxType: GfxType.PostLoginUI,
      graphicId: 41,
      atlasIndex: -1,
      x: -1,
      y: -1,
      w: -1,
      h: -1,
      xOffset: 0,
      yOffset: 0,
    });
    this.addBmpToLoad(GfxType.PostLoginUI, 41);

    this.staticEntries.set(StaticAtlasEntryType.Cursor, {
      gfxType: GfxType.PostLoginUI,
      graphicId: 24,
      atlasIndex: -1,
      x: -1,
      y: -1,
      w: -1,
      h: -1,
      xOffset: 0,
      yOffset: 0,
    });
    this.addBmpToLoad(GfxType.PostLoginUI, 24);

    this.staticEntries.set(StaticAtlasEntryType.Sans11, {
      gfxType: GfxType.PostLoginUI,
      graphicId: -1,
      atlasIndex: -1,
      x: -1,
      y: -1,
      w: -1,
      h: -1,
      xOffset: 0,
      yOffset: 0,
    });
    this.addBmpToLoadByPath('/sans-11.png');
  }

  private loadEmoteEntries() {
    if (this.emotes.length > 0) {
      return;
    }

    this.addBmpToLoad(GfxType.PostLoginUI, 38);
    for (let i = 0; i < NUMBER_OF_EMOTES; ++i) {
      const frames = [];
      for (let j = 0; j < 4; ++j) {
        frames.push({
          atlasIndex: -1,
          x: -1,
          y: -1,
          w: -1,
          h: -1,
          xOffset: 0,
          yOffset: 0,
          mirroredXOffset: 0,
        });
      }
      this.emotes.push({
        emoteId: i,
        frames,
      });
    }
  }

  private loadEffectEntries() {
    if (this.effects.length > 0) {
      return;
    }

    for (let i = 1; i <= NUMBER_OF_EFFECTS; ++i) {
      const meta = this.client.getEffectMetadata(i);
      if (!meta) {
        continue;
      }

      const makeFrames = () => {
        const frames = [];
        for (let j = 0; j < meta.frames; ++j) {
          frames.push({
            atlasIndex: -1,
            x: -1,
            y: -1,
            w: -1,
            h: -1,
            xOffset: 0,
            yOffset: 0,
            mirroredXOffset: 0,
          });
        }
        return frames;
      };

      this.effects.push({
        effectId: i,
        behindFrames: meta.hasBehindLayer ? makeFrames() : [],
        transparentFrames: meta.hasTransparentLayer ? makeFrames() : [],
        frontFrames: meta.hasInFrontLayer ? makeFrames() : [],
      });

      if (meta.hasBehindLayer) {
        this.addBmpToLoad(GfxType.Spells, (i - 1) * 3 + 1);
      }

      if (meta.hasTransparentLayer) {
        this.addBmpToLoad(GfxType.Spells, (i - 1) * 3 + 2);
      }

      if (meta.hasInFrontLayer) {
        this.addBmpToLoad(GfxType.Spells, (i - 1) * 3 + 3);
      }
    }
  }

  private refreshCharacters() {
    for (const char of this.client.nearby.characters) {
      const hash = generateCharacterHash(char);
      const existing = this.characters.find(
        (c) => c.playerId === char.playerId,
      );

      if (existing) {
        existing.tickCount = this.client.tickCount;
      }

      if (!existing || existing.hash !== hash) {
        if (char.hairStyle) {
          const baseId = (char.hairStyle - 1) * 40 + char.hairColor * 4;
          const gfxType =
            char.gender === Gender.Female
              ? GfxType.FemaleHair
              : GfxType.MaleHair;

          for (let i = 1; i <= 4; ++i) {
            this.addBmpToLoad(gfxType, baseId + i);
          }
        }

        if (char.equipment.armor > 0) {
          const baseId = (char.equipment.armor - 1) * 50;
          const gfxType =
            char.gender === Gender.Female
              ? GfxType.FemaleArmor
              : GfxType.MaleArmor;

          for (let i = 1; i <= 22; ++i) {
            this.addBmpToLoad(gfxType, baseId + i);
          }
        }

        if (char.equipment.boots > 0) {
          const baseId = (char.equipment.boots - 1) * 40;
          const gfxType =
            char.gender === Gender.Female
              ? GfxType.FemaleShoes
              : GfxType.MaleShoes;

          for (let i = 1; i <= 16; ++i) {
            this.addBmpToLoad(gfxType, baseId + i);
          }
        }

        if (char.equipment.hat > 0) {
          const baseId = (char.equipment.hat - 1) * 10;
          const gfxType =
            char.gender === Gender.Female ? GfxType.FemaleHat : GfxType.MaleHat;

          this.addBmpToLoad(gfxType, baseId + 1);
          this.addBmpToLoad(gfxType, baseId + 3);
        }

        if (char.equipment.shield > 0) {
          const baseId = (char.equipment.shield - 1) * 50;
          const gfxType =
            char.gender === Gender.Female
              ? GfxType.FemaleBack
              : GfxType.MaleBack;

          const meta = this.client.getShieldMetadata(char.equipment.shield);
          const frames = meta.back ? 4 : 16;

          for (let i = 1; i <= frames; ++i) {
            this.addBmpToLoad(gfxType, baseId + i);
          }
        }

        let ranged = false;
        if (char.equipment.weapon > 0) {
          const meta = this.client.getWeaponMetadata(char.equipment.weapon);
          ranged = meta.ranged;

          const baseId = (char.equipment.weapon - 1) * 100;
          const gfxType =
            char.gender === Gender.Female
              ? GfxType.FemaleWeapons
              : GfxType.MaleWeapons;

          const frames = ranged ? 19 : 17;

          for (let i = 1; i <= frames; ++i) {
            this.addBmpToLoad(gfxType, baseId + i);
          }

          if (meta.slash !== null) {
            this.addBmpToLoad(GfxType.PostLoginUI, 40);
          }
        }

        if (existing) {
          existing.hash = hash;
          existing.hairStyle = char.hairStyle;
          existing.hairColor = char.hairColor;
          existing.skin = char.skin;
          existing.gender = char.gender;
          existing.equipment = char.equipment;

          for (const frame of existing.frames) {
            if (frame && frame.atlasIndex !== -1) {
              this.addStaleFrame(frame);
            }
          }
        }

        const frames = [];
        for (let i = 0; i < 22; ++i) {
          if (
            [
              CharacterFrame.ChairDownRight,
              CharacterFrame.ChairUpLeft,
            ].includes(i as CharacterFrame) &&
            !this.mapHasChairs
          ) {
            frames.push(undefined);
            continue;
          }

          if (
            ranged &&
            [
              CharacterFrame.MeleeAttackDownRight1,
              CharacterFrame.MeleeAttackDownRight2,
              CharacterFrame.MeleeAttackUpLeft1,
              CharacterFrame.MeleeAttackUpLeft2,
            ].includes(i as CharacterFrame)
          ) {
            frames.push(undefined);
            continue;
          }

          if (
            !ranged &&
            [
              CharacterFrame.RangeAttackDownRight,
              CharacterFrame.RangeAttackUpLeft,
            ].includes(i as CharacterFrame)
          ) {
            frames.push(undefined);
            continue;
          }

          frames.push({
            atlasIndex: -1,
            x: -1,
            y: -1,
            w: -1,
            h: -1,
            xOffset: 0,
            yOffset: 0,
            mirroredXOffset: 0,
          });
        }

        if (existing) {
          existing.frames = frames;
        } else {
          this.characters.push({
            playerId: char.playerId,
            gender: char.gender,
            skin: char.skin,
            hairStyle: char.hairStyle,
            hairColor: char.hairColor,
            equipment: char.equipment,
            hash,
            frames,
            tickCount: this.client.tickCount,
          });
        }
      }
    }

    for (let i = this.characters.length - 1; i >= 0; --i) {
      const character = this.characters[i];
      const ticksSinceSeen = this.client.tickCount - character.tickCount;
      if (
        ticksSinceSeen > ATLAS_EXPIRY_TICKS &&
        !this.client.nearby.characters.find(
          (c) => c.playerId === character.playerId,
        )
      ) {
        for (const frame of character.frames) {
          if (frame && frame.atlasIndex !== -1) {
            this.addStaleFrame(frame);
          }
        }

        this.characters.splice(i, 1);
      }
    }
  }

  private refreshNpcs() {
    for (const npc of this.client.nearby.npcs) {
      const record = this.client.getEnfRecordById(npc.id);
      if (!record) {
        continue;
      }

      const existing = this.npcs.find((n) => n.graphicId === record.graphicId);
      if (!existing) {
        const npc = {
          graphicId: record.graphicId,
          frames: [],
          keep: false,
          tickCount: this.client.tickCount,
          size: { w: 0, h: 0 },
        };

        const baseId = (record.graphicId - 1) * 40;
        for (let i = 1; i <= 18; ++i) {
          this.addBmpToLoad(GfxType.NPC, baseId + i);
          npc.frames.push({ x: -1, y: -1, w: -1, h: -1, atlasIndex: -1 });
        }

        this.npcs.push(npc);
      } else {
        existing.tickCount = this.client.tickCount;
      }
    }

    for (let i = this.npcs.length - 1; i >= 0; --i) {
      const npc = this.npcs[i];
      if (npc.keep) {
        continue;
      }

      const ticksSinceSeen = this.client.tickCount - npc.tickCount;
      if (ticksSinceSeen > ATLAS_EXPIRY_TICKS && !npc.keep) {
        for (const frame of npc.frames) {
          if (frame && frame.atlasIndex !== -1) {
            this.addStaleFrame(frame);
          }
        }

        this.npcs.splice(i, 1);
      }
    }
  }

  private refreshItems() {
    for (const item of this.client.nearby.items) {
      const record = this.client.getEifRecordById(item.id);
      if (!record) {
        continue;
      }

      const gfxId = getItemGraphicId(item.id, record.graphicId, item.amount);
      const existing = this.items.find((i) => i.graphicId === gfxId);
      if (!existing) {
        this.items.push({
          graphicId: gfxId,
          atlasIndex: -1,
          x: -1,
          y: -1,
          w: -1,
          h: -1,
          xOffset: 0,
          yOffset: 0,
        });

        this.addBmpToLoad(GfxType.Items, gfxId);
      }
    }

    for (let i = this.items.length - 1; i >= 0; --i) {
      const item = this.items[i];
      if (
        !this.client.nearby.items.find((it) => {
          const record = this.client.getEifRecordById(it.id);
          if (!record) {
            return false;
          }

          const gfxId = getItemGraphicId(it.id, record.graphicId, it.amount);
          return gfxId === item.graphicId;
        })
      ) {
        this.addStaleFrame({ ...item, mirroredXOffset: 0 });
        this.items.splice(i, 1);
      }
    }
  }

  private updateAtlas() {
    this.preRenderCharacterFrames();
    this.calculateFrameSizes();
    this.clearStaleFrames();
    this.placeFrames();
    this.temporaryCharacterFrames.clear();

    for (const atlas of this.atlases) {
      atlas.commit();
    }

    if (!this.appended) {
      this.appended = true;

      for (const atlas of this.atlases) {
        const h1 = document.createElement('h1');
        h1.innerText = `Atlas ${this.atlases.indexOf(atlas)}`;
        const canvas = atlas.getCanvas();
        canvas.classList.add('debug');
        document.body.appendChild(h1);
        document.body.appendChild(canvas);
      }

      {
        const h1 = document.createElement('h1');
        h1.innerText = 'Map Atlas';
        const mapCanvas = this.mapAtlas.getCanvas();
        mapCanvas.classList.add('debug');
        document.body.appendChild(h1);
        document.body.appendChild(mapCanvas);
      }

      {
        const h1 = document.createElement('h1');
        h1.innerText = 'Static Atlas';
        const staticCanvas = this.staticAtlas.getCanvas();
        staticCanvas.classList.add('debug');
        document.body.appendChild(h1);
        document.body.appendChild(staticCanvas);
      }
    }

    this.loading = false;
    this.bmpsToLoad = [];
  }

  private placeFrames() {
    const placeableFrames: PlaceableFrame[] = [];

    for (const [id, frame] of this.staticEntries.entries()) {
      if (frame.atlasIndex !== -1) {
        continue;
      }

      placeableFrames.push({
        type: FrameType.Static,
        typeId: id,
        frameIndex: 0,
        w: frame.w,
        h: frame.h,
      });
    }

    for (const emote of this.emotes) {
      for (const [index, frame] of emote.frames.entries()) {
        if (frame.atlasIndex !== -1) {
          continue;
        }

        placeableFrames.push({
          type: FrameType.Emote,
          typeId: emote.emoteId,
          frameIndex: index,
          w: frame.w,
          h: frame.h,
        });
      }
    }

    for (const effect of this.effects) {
      for (const [index, frame] of effect.behindFrames.entries()) {
        if (!frame || frame.atlasIndex !== -1) {
          continue;
        }

        placeableFrames.push({
          type: FrameType.EffectBehind,
          typeId: effect.effectId,
          frameIndex: index,
          w: frame.w,
          h: frame.h,
        });
      }

      for (const [index, frame] of effect.transparentFrames.entries()) {
        if (!frame || frame.atlasIndex !== -1) {
          continue;
        }

        placeableFrames.push({
          type: FrameType.EffectTransparent,
          typeId: effect.effectId,
          frameIndex: index,
          w: frame.w,
          h: frame.h,
        });
      }

      for (const [index, frame] of effect.frontFrames.entries()) {
        if (!frame || frame.atlasIndex !== -1) {
          continue;
        }

        placeableFrames.push({
          type: FrameType.EffectFront,
          typeId: effect.effectId,
          frameIndex: index,
          w: frame.w,
          h: frame.h,
        });
      }
    }

    placeableFrames.sort((a, b) => b.h - a.h);

    if (placeableFrames.length) {
      this.currentAtlasIndex = STATIC_ATLAS_INDEX;
      this.ctx = this.staticAtlas.getContext();
    }

    for (const placeable of placeableFrames) {
      const rect = this.insert(placeable.w, placeable.h);
      let frameImg: HTMLCanvasElement | undefined;

      switch (placeable.type) {
        case FrameType.Static: {
          const frame = this.staticEntries.get(
            placeable.typeId as StaticAtlasEntryType,
          );
          if (!frame) {
            continue;
          }

          const bmp =
            placeable.typeId === StaticAtlasEntryType.Sans11
              ? this.getBmpByPath('/sans-11.png')
              : this.getBmp(frame.gfxType, frame.graphicId);
          if (!bmp) {
            continue;
          }

          this.tmpCanvas.width = frame.w;
          this.tmpCanvas.height = frame.h;
          this.tmpCtx.clearRect(0, 0, frame.w, frame.h);
          this.tmpCtx.drawImage(
            bmp,
            frame.x,
            frame.y,
            frame.w,
            frame.h,
            0,
            0,
            frame.w,
            frame.h,
          );

          frame.atlasIndex = this.currentAtlasIndex;
          frame.x = rect.x;
          frame.y = rect.y;

          frameImg = this.tmpCanvas;
          break;
        }
        case FrameType.Emote: {
          const emote = this.emotes.find((e) => e.emoteId === placeable.typeId);

          if (!emote) {
            continue;
          }

          const frame = emote.frames[placeable.frameIndex];
          const bmp = this.getBmp(GfxType.PostLoginUI, 38);
          if (!bmp) {
            continue;
          }

          this.tmpCanvas.width = frame.w;
          this.tmpCanvas.height = frame.h;
          this.tmpCtx.clearRect(0, 0, frame.w, frame.h);
          this.tmpCtx.drawImage(
            bmp,
            frame.x,
            frame.y,
            frame.w,
            frame.h,
            0,
            0,
            frame.w,
            frame.h,
          );

          frame.atlasIndex = this.currentAtlasIndex;
          frame.x = rect.x;
          frame.y = rect.y;

          frameImg = this.tmpCanvas;

          break;
        }

        case FrameType.EffectBehind:
        case FrameType.EffectTransparent:
        case FrameType.EffectFront: {
          const effect = this.effects.find(
            (e) => e.effectId === placeable.typeId,
          );

          if (!effect) {
            continue;
          }

          let frame: Frame;
          let offset = 0;
          switch (placeable.type) {
            case FrameType.EffectBehind:
              frame = effect.behindFrames[placeable.frameIndex];
              offset = 1;
              break;
            case FrameType.EffectTransparent:
              frame = effect.transparentFrames[placeable.frameIndex];
              offset = 2;
              break;
            case FrameType.EffectFront:
              frame = effect.frontFrames[placeable.frameIndex];
              offset = 3;
              break;
          }

          const bmp = this.getBmp(
            GfxType.Spells,
            (effect.effectId - 1) * 3 + offset,
          );
          if (!bmp) {
            continue;
          }

          this.tmpCanvas.width = frame.w;
          this.tmpCanvas.height = frame.h;
          this.tmpCtx.clearRect(0, 0, frame.w, frame.h);
          this.tmpCtx.drawImage(
            bmp,
            frame.x,
            frame.y,
            frame.w,
            frame.h,
            0,
            0,
            frame.w,
            frame.h,
          );

          frame.atlasIndex = this.currentAtlasIndex;
          frame.x = rect.x;
          frame.y = rect.y;

          frameImg = this.tmpCanvas;
          break;
        }
      }

      if (frameImg) {
        this.ctx.drawImage(frameImg, rect.x, rect.y, rect.w, rect.h);
      }
    }

    if (placeableFrames.length) {
      this.staticAtlas.commit();
    }

    placeableFrames.splice(0, placeableFrames.length);

    for (const tile of this.tiles) {
      if (tile.atlasIndex !== -1) {
        continue;
      }

      placeableFrames.push({
        type: FrameType.Tile,
        typeId: tile.gfxType,
        frameIndex: tile.graphicId,
        w: tile.w,
        h: tile.h,
      });
    }

    placeableFrames.sort((a, b) => b.h - a.h);

    if (placeableFrames.length) {
      this.currentAtlasIndex = MAP_ATLAS_INDEX;
      this.ctx = this.mapAtlas.getContext();
    }

    for (const placeable of placeableFrames) {
      const rect = this.insert(placeable.w, placeable.h);
      const tile = this.tiles.find(
        (t) =>
          t.gfxType === placeable.typeId &&
          t.graphicId === placeable.frameIndex,
      );
      if (!tile) {
        continue;
      }

      const bmp = this.getBmp(tile.gfxType, tile.graphicId);
      if (!bmp) {
        continue;
      }

      this.tmpCanvas.width = tile.w;
      this.tmpCanvas.height = tile.h;
      this.tmpCtx.clearRect(0, 0, tile.w, tile.h);
      this.tmpCtx.drawImage(bmp, 0, 0, tile.w, tile.h);

      tile.atlasIndex = this.currentAtlasIndex;
      tile.x = rect.x;
      tile.y = rect.y;

      this.ctx.drawImage(this.tmpCanvas, rect.x, rect.y, rect.w, rect.h);
    }

    if (placeableFrames.length) {
      this.mapAtlas.commit();
    }

    placeableFrames.splice(0, placeableFrames.length);
    this.currentAtlasIndex = 0;
    this.ctx = this.atlases[0].getContext();

    for (const character of this.characters) {
      for (const [index, frame] of character.frames.entries()) {
        if (!frame || frame.atlasIndex !== -1) {
          continue;
        }

        placeableFrames.push({
          type: FrameType.Character,
          typeId: character.playerId,
          frameIndex: index,
          w: frame.w,
          h: frame.h,
        });
      }
    }

    for (const npc of this.npcs) {
      for (const [index, frame] of npc.frames.entries()) {
        if (!frame || frame.atlasIndex !== -1) {
          continue;
        }

        placeableFrames.push({
          type: FrameType.Npc,
          typeId: npc.graphicId,
          frameIndex: index,
          w: frame.w,
          h: frame.h,
        });
      }
    }

    for (const item of this.items) {
      if (item.atlasIndex !== -1) {
        continue;
      }

      placeableFrames.push({
        type: FrameType.Item,
        typeId: item.graphicId,
        frameIndex: 0,
        w: item.w,
        h: item.h,
      });
    }

    placeableFrames.sort((a, b) => b.h - a.h);

    for (const placeable of placeableFrames) {
      const rect = this.insert(placeable.w, placeable.h);
      let frameImg: HTMLCanvasElement | undefined;

      switch (placeable.type) {
        case FrameType.Character: {
          const character = this.characters.find(
            (c) => c.playerId === placeable.typeId,
          );

          if (!character) {
            continue;
          }

          const frame = character.frames[placeable.frameIndex];
          const imgData = this.temporaryCharacterFrames.get(
            character.playerId,
          )?.[placeable.frameIndex];

          if (!imgData) {
            continue;
          }

          this.tmpCanvas.width = frame.w;
          this.tmpCanvas.height = frame.h;
          this.tmpCtx.clearRect(0, 0, frame.w, frame.h);
          this.tmpCtx.putImageData(imgData, 0, 0);

          frame.atlasIndex = this.currentAtlasIndex;
          frame.x = rect.x;
          frame.y = rect.y;

          frameImg = this.tmpCanvas;
          break;
        }
        case FrameType.Npc: {
          const npc = this.npcs.find((n) => n.graphicId === placeable.typeId);

          if (!npc) {
            continue;
          }

          const frame = npc.frames[placeable.frameIndex];
          const baseId = (npc.graphicId - 1) * 40;
          const bmp = this.getBmp(
            GfxType.NPC,
            baseId + placeable.frameIndex + 1,
          );
          if (!bmp) {
            continue;
          }

          this.tmpCanvas.width = frame.w;
          this.tmpCanvas.height = frame.h;
          this.tmpCtx.clearRect(0, 0, frame.w, frame.h);
          this.tmpCtx.drawImage(
            bmp,
            frame.x,
            frame.y,
            frame.w,
            frame.h,
            0,
            0,
            frame.w,
            frame.h,
          );

          frame.atlasIndex = this.currentAtlasIndex;
          frame.x = rect.x;
          frame.y = rect.y;

          frameImg = this.tmpCanvas;
          break;
        }
        case FrameType.Item: {
          const item = this.items.find((i) => i.graphicId === placeable.typeId);
          if (!item) {
            continue;
          }

          const bmp = this.getBmp(GfxType.Items, placeable.typeId);
          if (!bmp) {
            continue;
          }

          this.tmpCanvas.width = item.w;
          this.tmpCanvas.height = item.h;
          this.tmpCtx.clearRect(0, 0, item.w, item.h);
          this.tmpCtx.drawImage(
            bmp,
            item.x,
            item.y,
            item.w,
            item.h,
            0,
            0,
            item.w,
            item.h,
          );

          item.atlasIndex = this.currentAtlasIndex;
          item.x = rect.x;
          item.y = rect.y;

          frameImg = this.tmpCanvas;
          break;
        }
      }

      if (frameImg) {
        this.ctx.drawImage(frameImg, rect.x, rect.y, rect.w, rect.h);
      }
    }
  }

  private preRenderCharacterFrames() {
    this.temporaryCharacterFrames.clear();
    this.tmpCanvas.width = CHARACTER_FRAME_SIZE;
    this.tmpCanvas.height = CHARACTER_FRAME_SIZE;

    for (const character of this.characters) {
      if (!character.frames.some((f) => f && f.atlasIndex === -1)) {
        continue;
      }

      this.temporaryCharacterFrames.set(character.playerId, []);

      for (const [index, frame] of character.frames.entries()) {
        if (!frame) {
          this.temporaryCharacterFrames
            .get(character.playerId)
            ?.push(undefined);
          continue;
        }

        this.tmpCtx.clearRect(0, 0, CHARACTER_FRAME_SIZE, CHARACTER_FRAME_SIZE);
        this.tmpBehindCtx.clearRect(
          0,
          0,
          CHARACTER_FRAME_SIZE,
          CHARACTER_FRAME_SIZE,
        );

        const weaponVisible = WEAPON_VISIBLE_MAP[index];

        const upLeft = [
          CharacterFrame.StandingUpLeft,
          CharacterFrame.WalkingUpLeft1,
          CharacterFrame.WalkingUpLeft2,
          CharacterFrame.WalkingUpLeft3,
          CharacterFrame.WalkingUpLeft4,
          CharacterFrame.MeleeAttackUpLeft1,
          CharacterFrame.MeleeAttackUpLeft2,
          CharacterFrame.RaisedHandUpLeft,
          CharacterFrame.ChairUpLeft,
          CharacterFrame.FloorUpLeft,
          CharacterFrame.RangeAttackUpLeft,
        ].includes(index);

        const maskType = this.client.getHatMetadata(character.equipment.hat);

        if (character.equipment.shield && !upLeft) {
          const meta = this.client.getShieldMetadata(
            character.equipment.shield,
          );
          if (meta.back) {
            this.renderCharacterBack(
              character.gender,
              character.equipment.shield,
              index,
            );
          }
        }

        if (character.equipment.weapon && weaponVisible) {
          this.renderCharacterWeaponBehind(
            character.gender,
            character.equipment.weapon,
            index,
          );
        }

        if (maskType !== HatMaskType.HideHair && character.hairStyle) {
          this.renderCharacterHairBehind(
            character.gender,
            character.hairStyle,
            character.hairColor,
            upLeft,
            index,
          );
        }

        const skinSize = this.getCharacterFrameSize(index);
        this.renderCharacterSkin(
          character.gender,
          character.skin,
          upLeft,
          skinSize,
          index,
        );

        if (character.equipment.boots) {
          this.renderCharacterBoots(
            character.gender,
            character.equipment.boots,
            index,
          );
        }

        if (character.equipment.armor) {
          this.renderCharacterArmor(
            character.gender,
            character.equipment.armor,
            index,
          );
        }

        if (maskType === HatMaskType.FaceMask && character.equipment.hat) {
          this.renderCharacterHat(
            character.gender,
            character.equipment.hat,
            index,
            upLeft,
          );
        }

        if (maskType !== HatMaskType.HideHair && character.hairStyle) {
          this.renderCharacterHair(
            character.gender,
            character.hairStyle,
            character.hairColor,
            upLeft,
            index,
          );
        }

        if (maskType !== HatMaskType.FaceMask && character.equipment.hat) {
          this.renderCharacterHat(
            character.gender,
            character.equipment.hat,
            index,
            upLeft,
          );
        }

        if (character.equipment.shield) {
          const meta = this.client.getShieldMetadata(
            character.equipment.shield,
          );
          if (!meta.back && weaponVisible) {
            this.renderCharacterShield(
              character.gender,
              character.equipment.shield,
              index,
            );
          } else if (meta.back && upLeft) {
            this.renderCharacterBack(
              character.gender,
              character.equipment.shield,
              index,
              false,
            );
          }
        }

        if (
          character.equipment.weapon &&
          index === CharacterFrame.MeleeAttackDownRight2
        ) {
          this.renderCharacterWeaponFront(
            character.gender,
            character.equipment.weapon,
          );
        }

        clipHair(this.tmpCtx, 0, 0, CHARACTER_FRAME_SIZE, CHARACTER_FRAME_SIZE);

        if (
          character.equipment.weapon &&
          [
            CharacterFrame.MeleeAttackDownRight2,
            CharacterFrame.MeleeAttackUpLeft2,
          ].includes(index)
        ) {
          const meta = this.client.getWeaponMetadata(
            character.equipment.weapon,
          );

          if (meta.slash !== null) {
            this.renderCharacterSlash(character.gender, meta.slash, index);
          }
        }

        this.tmpBehindCtx.drawImage(
          this.tmpCanvas,
          0,
          0,
          CHARACTER_FRAME_SIZE,
          CHARACTER_FRAME_SIZE,
        );

        const frameBounds = {
          x: CHARACTER_FRAME_SIZE,
          y: CHARACTER_FRAME_SIZE,
          maxX: 0,
          maxY: 0,
        };

        const imgData = this.tmpBehindCtx.getImageData(
          0,
          0,
          CHARACTER_FRAME_SIZE,
          CHARACTER_FRAME_SIZE,
        );

        for (let y = 0; y < CHARACTER_FRAME_SIZE; ++y) {
          for (let x = 0; x < CHARACTER_FRAME_SIZE; ++x) {
            const alpha = imgData.data[(y * CHARACTER_FRAME_SIZE + x) * 4 + 3];
            if (alpha !== 0) {
              if (x < frameBounds.x) frameBounds.x = x;
              if (y < frameBounds.y) frameBounds.y = y;
              if (x > frameBounds.maxX) frameBounds.maxX = x;
              if (y > frameBounds.maxY) frameBounds.maxY = y;
            }
          }
        }

        // Calculate width and height from min/max values
        frame.x = frameBounds.x;
        frame.y = frameBounds.y;
        frame.w = frameBounds.maxX - frameBounds.x + 1;
        frame.h = frameBounds.maxY - frameBounds.y + 1;
        frame.xOffset = frameBounds.x - HALF_CHARACTER_FRAME_SIZE;
        frame.yOffset =
          frameBounds.y -
          CHARACTER_FRAME_SIZE +
          TILE_HEIGHT -
          HALF_HALF_TILE_HEIGHT;
        frame.mirroredXOffset =
          HALF_CHARACTER_FRAME_SIZE - (frameBounds.x + frame.w);

        const croppedImgData = this.tmpBehindCtx.getImageData(
          frameBounds.x,
          frameBounds.y,
          frame.w,
          frame.h,
        );

        this.temporaryCharacterFrames
          .get(character.playerId)
          ?.push(croppedImgData);
      }
    }
  }

  private calculateFrameSizes() {
    for (const npc of this.npcs) {
      this.calculateNpcFrameSizes(npc);
    }

    for (const item of this.items) {
      this.calculateItemSize(item);
    }

    for (const tile of this.tiles) {
      this.calculateTileSize(tile);
    }

    for (const [id, frame] of this.staticEntries) {
      this.calculateStaticSize(id, frame);
    }

    for (const emote of this.emotes) {
      this.calculateEmoteSize(emote);
    }

    for (const effect of this.effects) {
      this.calculateEffectSize(effect);
    }
  }

  private calculateNpcFrameSizes(npc: NpcAtlasEntry) {
    const blankIndexes = [];
    for (const [index, frame] of npc.frames.entries()) {
      if (!frame || frame.w !== -1) {
        continue;
      }

      const baseId = (npc.graphicId - 1) * 40;
      const bmp = this.getBmp(GfxType.NPC, baseId + index + 1);
      if (!bmp) {
        continue;
      }

      this.tmpCanvas.width = bmp.width;
      this.tmpCanvas.height = bmp.height;
      this.tmpCtx.clearRect(0, 0, bmp.width, bmp.height);
      this.tmpCtx.drawImage(bmp, 0, 0, bmp.width, bmp.height);

      // Check if image is blank
      const imgData = this.tmpCtx.getImageData(0, 0, bmp.width, bmp.height);
      const frameBounds = {
        x: bmp.width,
        y: bmp.height,
        maxX: 0,
        maxY: 0,
      };
      const colors: Set<number> = new Set();
      for (let y = 0; y < bmp.height; ++y) {
        for (let x = 0; x < bmp.width; ++x) {
          const base = (y * bmp.width + x) * 4;
          colors.add(
            (imgData.data[base] << 16) |
              (imgData.data[base + 1] << 8) |
              imgData.data[base + 2],
          );
          const alpha = imgData.data[base + 3];
          if (alpha !== 0) {
            if (x < frameBounds.x) frameBounds.x = x;
            if (y < frameBounds.y) frameBounds.y = y;
            if (x > frameBounds.maxX) frameBounds.maxX = x;
            if (y > frameBounds.maxY) frameBounds.maxY = y;
          }
        }
      }

      if (colors.size <= 2 || !frameBounds.maxX) {
        blankIndexes.push(index);
        continue;
      }

      // Calculate width and height from min/max values
      const w = frameBounds.maxX - frameBounds.x + 1;
      const h = frameBounds.maxY - frameBounds.y + 1;

      const halfBmpWidth = bmp.width >> 1;
      frame.xOffset = frameBounds.x - halfBmpWidth;
      frame.yOffset = frameBounds.y - (bmp.height - 23);
      frame.mirroredXOffset = halfBmpWidth - (frameBounds.x + w);
      frame.x = frameBounds.x;
      frame.y = frameBounds.y;
      frame.w = w;
      frame.h = h;
    }

    // Mark blank frames as undefined
    for (const i of blankIndexes) {
      npc.frames[i] = undefined;
    }
  }

  private calculateItemSize(item: ItemAtlasEntry) {
    if (item.w !== -1) {
      return;
    }

    const bmp = this.getBmp(GfxType.Items, item.graphicId);
    if (!bmp) {
      return;
    }

    this.tmpCanvas.width = bmp.width;
    this.tmpCanvas.height = bmp.height;
    this.tmpCtx.clearRect(0, 0, bmp.width, bmp.height);
    this.tmpCtx.drawImage(bmp, 0, 0, bmp.width, bmp.height);

    const imgData = this.tmpCtx.getImageData(0, 0, bmp.width, bmp.height);
    const bounds = {
      x: bmp.width,
      y: bmp.height,
      maxX: 0,
      maxY: 0,
    };

    for (let y = 0; y < bmp.height; ++y) {
      for (let x = 0; x < bmp.width; ++x) {
        const base = (y * bmp.width + x) * 4;
        const alpha = imgData.data[base + 3];
        if (alpha !== 0) {
          if (x < bounds.x) bounds.x = x;
          if (y < bounds.y) bounds.y = y;
          if (x > bounds.maxX) bounds.maxX = x;
          if (y > bounds.maxY) bounds.maxY = y;
        }
      }
    }

    // Calculate width and height from min/max values
    const w = bounds.maxX - bounds.x + 1;
    const h = bounds.maxY - bounds.y + 1;

    item.xOffset = bounds.x - (bmp.width >> 1);
    item.yOffset = bounds.y - (bmp.height >> 1);
    item.x = bounds.x;
    item.y = bounds.y;
    item.w = w;
    item.h = h;
  }

  private calculateTileSize(tile: TileAtlasEntry) {
    if (tile.w !== -1) {
      return;
    }

    const bmp = this.getBmp(tile.gfxType, tile.graphicId);
    if (!bmp) {
      return;
    }

    tile.w = bmp.width;
    tile.h = bmp.height;
    tile.x = 0;
    tile.y = 0;
  }

  private calculateStaticSize(id: StaticAtlasEntryType, entry: TileAtlasEntry) {
    if (entry.w !== -1) {
      return;
    }

    const bmp =
      id === StaticAtlasEntryType.Sans11
        ? this.getBmpByPath('/sans-11.png')
        : this.getBmp(entry.gfxType, entry.graphicId);
    if (!bmp) {
      return;
    }

    switch (id) {
      case StaticAtlasEntryType.HealthBars: {
        entry.x = 0;
        entry.y = 28;
        entry.w = 40;
        entry.h = 35;
        break;
      }
      case StaticAtlasEntryType.DamageNumbers: {
        entry.x = 40;
        entry.y = 28;
        entry.w = 89;
        entry.h = 11;
        break;
      }
      case StaticAtlasEntryType.HealNumbers: {
        entry.x = 40;
        entry.y = 40;
        entry.w = 89;
        entry.h = 11;
        break;
      }
      case StaticAtlasEntryType.Miss: {
        entry.x = 132;
        entry.y = 28;
        entry.w = 30;
        entry.h = 11;
        break;
      }
      case StaticAtlasEntryType.PlayerMenu: {
        entry.x = 0;
        entry.y = 0;
        entry.w = 190;
        entry.h = bmp.height;
        break;
      }
      default: {
        entry.x = 0;
        entry.y = 0;
        entry.w = bmp.width;
        entry.h = bmp.height;
        break;
      }
    }
  }

  private calculateEmoteSize(emote: EmoteAtlasEntry) {
    this.tmpCanvas.width = 50;
    this.tmpCanvas.height = 50;

    const bmp = this.getBmp(GfxType.PostLoginUI, 38);
    if (!bmp) {
      return;
    }

    for (const [frameIndex, frame] of emote.frames.entries()) {
      this.tmpCtx.clearRect(0, 0, this.tmpCanvas.width, this.tmpCanvas.height);
      this.tmpCtx.drawImage(
        bmp,
        emote.emoteId * 200 + frameIndex * 50,
        0,
        50,
        50,
        0,
        0,
        50,
        50,
      );

      const imgData = this.tmpCtx.getImageData(
        0,
        0,
        this.tmpCanvas.width,
        this.tmpCanvas.height,
      );
      const bounds = {
        x: 50,
        y: 50,
        maxX: 0,
        maxY: 0,
      };

      for (let y = 0; y < 50; ++y) {
        for (let x = 0; x < 50; ++x) {
          const base = (y * 50 + x) * 4;
          const alpha = imgData.data[base + 3];
          if (alpha !== 0) {
            if (x < bounds.x) bounds.x = x;
            if (y < bounds.y) bounds.y = y;
            if (x > bounds.maxX) bounds.maxX = x;
            if (y > bounds.maxY) bounds.maxY = y;
          }
        }
      }

      // Calculate width and height from min/max values
      const w = bounds.maxX - bounds.x + 1;
      const h = bounds.maxY - bounds.y + 1;

      frame.xOffset = bounds.x - 25;
      frame.yOffset = bounds.y - 25;
      frame.x = emote.emoteId * 200 + frameIndex * 50 + bounds.x;
      frame.y = bounds.y;
      frame.w = w;
      frame.h = h;
    }
  }

  private calculateEffectSize(effect: EffectAtlasEntry) {
    const meta = this.client.getEffectMetadata(effect.effectId);
    let offset = 1;
    for (const frameArray of [
      effect.behindFrames,
      effect.transparentFrames,
      effect.frontFrames,
    ]) {
      const blankIndexes = [];
      for (const [frameIndex, frame] of frameArray.entries()) {
        if (!frame || frame.w !== -1) {
          continue;
        }

        const bmp = this.getBmp(
          GfxType.Spells,
          (effect.effectId - 1) * 3 + offset,
        );
        if (!bmp) {
          continue;
        }

        const frameWidth = Math.floor(bmp.width / frameArray.length);

        this.tmpCanvas.width = frameWidth;
        this.tmpCanvas.height = bmp.height;
        this.tmpCtx.clearRect(0, 0, frameWidth, bmp.height);
        this.tmpCtx.drawImage(
          bmp,
          frameIndex * frameWidth,
          0,
          frameWidth,
          bmp.height,
          0,
          0,
          frameWidth,
          bmp.height,
        );

        const imgData = this.tmpCtx.getImageData(0, 0, frameWidth, bmp.height);
        const bounds = {
          x: frameWidth,
          y: bmp.height,
          maxX: 0,
          maxY: 0,
        };

        const colors: Set<number> = new Set();
        for (let y = 0; y < bmp.height; ++y) {
          for (let x = 0; x < frameWidth; ++x) {
            const base = (y * frameWidth + x) * 4;
            colors.add(
              (imgData.data[base] << 16) |
                (imgData.data[base + 1] << 8) |
                imgData.data[base + 2],
            );
            const alpha = imgData.data[base + 3];
            if (alpha !== 0) {
              if (x < bounds.x) bounds.x = x;
              if (y < bounds.y) bounds.y = y;
              if (x > bounds.maxX) bounds.maxX = x;
              if (y > bounds.maxY) bounds.maxY = y;
            }
          }
        }

        if (colors.size <= 2 || !bounds.maxX) {
          blankIndexes.push(frameIndex);
          continue;
        }

        // Calculate width and height from min/max values
        const w = bounds.maxX - bounds.x + 1;
        const h = bounds.maxY - bounds.y + 1;

        const halfFrameWidth = Math.floor(frameWidth >> 1);

        const additionalOffset = { x: 0, y: 0 };
        if (meta.positionOffsetMetadata) {
          additionalOffset.x +=
            meta.positionOffsetMetadata.offsetByFrameX[frameIndex];
          additionalOffset.y +=
            meta.positionOffsetMetadata.offsetByFrameY[frameIndex];
        }

        if (meta.verticalMetadata) {
          additionalOffset.y += meta.verticalMetadata.frameOffsetY * frameIndex;
        }

        frame.xOffset =
          bounds.x - halfFrameWidth + additionalOffset.x + meta.offsetX;
        frame.yOffset =
          bounds.y -
          (36 + Math.floor((bmp.height - 100) >> 1)) +
          additionalOffset.y +
          meta.offsetY;

        frame.x = bounds.x + frameIndex * frameWidth;
        frame.y = bounds.y;
        frame.w = w;
        frame.h = h;
      }
      offset++;

      // Mark blank frames as undefined
      for (const i of blankIndexes) {
        frameArray[i] = undefined;
      }
    }
  }

  private getBmp(
    gfxType: GfxType,
    graphicId: number,
  ): HTMLImageElement | undefined {
    return this.bmpsToLoad.find(
      (bmp) => bmp.gfxType === gfxType && bmp.id === graphicId,
    )?.img;
  }

  private getBmpByPath(path: string): HTMLImageElement | undefined {
    return this.bmpsToLoad.find((bmp) => bmp.path === path)?.img;
  }

  private renderCharacterHairBehind(
    gender: Gender,
    hairStyle: number,
    hairColor: number,
    upLeft: boolean,
    frame: CharacterFrame,
  ) {
    const baseId = (hairStyle - 1) * 40 + hairColor * 4;
    const graphicId = baseId + 1 + (upLeft ? 2 : 0);
    const bmp = this.getBmp(
      gender === Gender.Female ? GfxType.FemaleHair : GfxType.MaleHair,
      graphicId,
    );

    if (!bmp) {
      console.error(
        `Missing hair bitmap for ${gender} ${hairStyle} ${hairColor}`,
      );
      return;
    }

    const offset = HAIR_OFFSETS[gender][frame];

    const destX = Math.floor(
      HALF_CHARACTER_FRAME_SIZE - (bmp.width >> 1) + offset.x,
    );
    const destY = Math.floor(
      HALF_CHARACTER_FRAME_SIZE - (bmp.height >> 1) + offset.y,
    );

    this.tmpBehindCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
  }

  private renderCharacterHair(
    gender: Gender,
    hairStyle: number,
    hairColor: number,
    upLeft: boolean,
    frame: CharacterFrame,
  ) {
    const baseId = (hairStyle - 1) * 40 + hairColor * 4;
    const graphicId = baseId + 2 + (upLeft ? 2 : 0);
    const bmp = this.getBmp(
      gender === Gender.Female ? GfxType.FemaleHair : GfxType.MaleHair,
      graphicId,
    );

    if (!bmp) {
      console.error(
        `Missing hair bitmap for ${gender} ${hairStyle} ${hairColor}`,
      );
      return;
    }

    const offset = HAIR_OFFSETS[gender][frame];

    const destX = Math.floor(
      HALF_CHARACTER_FRAME_SIZE - (bmp.width >> 1) + offset.x,
    );
    const destY = Math.floor(
      HALF_CHARACTER_FRAME_SIZE - (bmp.height >> 1) + offset.y,
    );

    this.tmpCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
  }

  private renderCharacterSkin(
    gender: Gender,
    skin: number,
    upLeft: boolean,
    size: { w: number; h: number },
    frame: CharacterFrame,
  ) {
    const bmp = this.getBmp(
      GfxType.SkinSprites,
      this.getCharacterFrameGraphicId(frame),
    );

    if (!bmp) {
      return;
    }

    const frameCount = FRAMES_TO_FRAME_COUNT_MAP[frame];
    const frameNumber = FRAME_TO_FRAME_NUMBER_MAP[frame];

    const startX = gender === Gender.Female ? 0 : size.w * frameCount * 2;
    const sourceX =
      startX + (upLeft ? size.w * frameCount : 0) + size.w * frameNumber;
    const sourceY = skin * size.h;

    const destX = HALF_CHARACTER_FRAME_SIZE - (size.w >> 1);
    const destY = HALF_CHARACTER_FRAME_SIZE - (size.h >> 1);

    this.tmpCtx.drawImage(
      bmp,
      sourceX,
      sourceY,
      size.w,
      size.h,
      destX,
      destY,
      size.w,
      size.h,
    );
  }

  private renderCharacterWeaponBehind(
    gender: Gender,
    weapon: number,
    frame: CharacterFrame,
  ) {
    const graphicId = (weapon - 1) * 100 + WEAPON_FRAME_MAP[frame] + 1;

    const bmp = this.getBmp(
      gender === Gender.Female ? GfxType.FemaleWeapons : GfxType.MaleWeapons,
      graphicId,
    );

    if (!bmp) {
      return;
    }

    const offset = WEAPON_OFFSETS[gender][frame];

    const destX = Math.floor(
      HALF_CHARACTER_FRAME_SIZE - (bmp.width >> 1) + offset.x,
    );
    const destY = Math.floor(
      HALF_CHARACTER_FRAME_SIZE - (bmp.height >> 1) + offset.y,
    );

    this.tmpBehindCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
  }

  private renderCharacterWeaponFront(gender: Gender, weapon: number) {
    const graphicId = (weapon - 1) * 100 + 17;

    const bmp = this.getBmp(
      gender === Gender.Female ? GfxType.FemaleWeapons : GfxType.MaleWeapons,
      graphicId,
    );

    if (!bmp) {
      console.error(
        `Missing weapon bitmap for ${Gender[gender]} ${weapon} MeleeAttackDownRight2`,
      );
      return;
    }

    const offset = WEAPON_OFFSETS[gender][CharacterFrame.MeleeAttackDownRight2];

    const destX = HALF_CHARACTER_FRAME_SIZE - (bmp.width >> 1) + offset.x;
    const destY = HALF_CHARACTER_FRAME_SIZE - (bmp.height >> 1) + offset.y;

    this.tmpCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
  }

  private renderCharacterBack(
    gender: Gender,
    back: number,
    frame: number,
    behind = true,
  ) {
    const graphicId = (back - 1) * 50 + BACK_FRAME_MAP[frame] + 1;

    const bmp = this.getBmp(
      gender === Gender.Female ? GfxType.FemaleBack : GfxType.MaleBack,
      graphicId,
    );

    if (!bmp) {
      console.error(
        `Missing back bitmap for ${Gender[gender]} ${back} ${CharacterFrame[frame]}`,
      );
      return;
    }

    const offset = BACK_OFFSETS[gender][frame];
    const destX = HALF_CHARACTER_FRAME_SIZE - (bmp.width >> 1) + offset.x;
    const destY = HALF_CHARACTER_FRAME_SIZE - (bmp.height >> 1) + offset.y;

    if (behind) {
      this.tmpBehindCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
    } else {
      this.tmpCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
    }
  }

  private renderCharacterShield(gender: Gender, shield: number, frame: number) {
    const graphicId = (shield - 1) * 50 + frame + 1;

    const bmp = this.getBmp(
      gender === Gender.Female ? GfxType.FemaleBack : GfxType.MaleBack,
      graphicId,
    );

    if (!bmp) {
      return;
    }

    const offset = SHIELD_OFFSETS[gender][frame];

    const destX = HALF_CHARACTER_FRAME_SIZE - (bmp.width >> 1) + offset.x;
    const destY = HALF_CHARACTER_FRAME_SIZE - (bmp.height >> 1) + offset.y;

    this.tmpCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
  }

  private renderCharacterSlash(
    gender: Gender,
    index: number,
    frame: CharacterFrame,
  ) {
    const bmp = this.getBmp(GfxType.PostLoginUI, 40);
    if (!bmp) {
      return;
    }

    const frameWidth = Math.floor(bmp.width / 4);
    const frameHeight = Math.floor(bmp.height / NUMBER_OF_SLASHES);

    const sourceX =
      (frame === CharacterFrame.MeleeAttackDownRight2 ? 0 : 1) * frameWidth;
    const sourceY = index * frameHeight;

    const destX = Math.floor(
      HALF_CHARACTER_FRAME_SIZE -
        (frameWidth >> 1) +
        (frame === CharacterFrame.MeleeAttackDownRight2 ? -9 : -13) +
        (gender === Gender.Female ? 0 : -1),
    );
    const destY = Math.floor(
      HALF_CHARACTER_FRAME_SIZE -
        (frameHeight >> 1) +
        (frame === CharacterFrame.MeleeAttackDownRight2 ? 4 : -9) +
        (gender === Gender.Female ? 0 : -1),
    );

    this.tmpCtx.globalAlpha = 0.4;
    this.tmpCtx.drawImage(
      bmp,
      sourceX,
      sourceY,
      frameWidth,
      frameHeight,
      destX,
      destY,
      frameWidth,
      frameHeight,
    );
    this.tmpCtx.globalAlpha = 1.0;
  }

  private renderCharacterBoots(
    gender: Gender,
    boots: number,
    frame: CharacterFrame,
  ) {
    const baseId = (boots - 1) * 40;
    let graphicId = (boots - 1) * 40 + frame + 1;

    switch (true) {
      case frame === CharacterFrame.RaisedHandDownRight:
      case frame === CharacterFrame.MeleeAttackDownRight1:
        graphicId = baseId + 1;
        break;
      case frame === CharacterFrame.RaisedHandUpLeft:
      case frame === CharacterFrame.MeleeAttackUpLeft1:
        graphicId = baseId + 2;
        break;
      case frame === CharacterFrame.MeleeAttackDownRight2:
      case frame === CharacterFrame.RangeAttackDownRight:
        graphicId = baseId + 11;
        break;
      case frame === CharacterFrame.MeleeAttackUpLeft2:
      case frame === CharacterFrame.RangeAttackUpLeft:
        graphicId = baseId + 12;
        break;
      case frame === CharacterFrame.ChairDownRight:
        graphicId = baseId + 13;
        break;
      case frame === CharacterFrame.ChairUpLeft:
        graphicId = baseId + 14;
        break;
      case frame === CharacterFrame.FloorDownRight:
        graphicId = baseId + 15;
        break;
      case frame === CharacterFrame.FloorUpLeft:
        graphicId = baseId + 16;
        break;
    }

    const bmp = this.getBmp(
      gender === Gender.Female ? GfxType.FemaleShoes : GfxType.MaleShoes,
      graphicId,
    );

    if (!bmp) {
      console.error(
        `Missing boots bitmap for ${Gender[gender]} ${boots} ${CharacterFrame[frame]}`,
      );
      return;
    }

    const offset = BOOTS_OFFSETS[gender][frame];

    const destX = HALF_CHARACTER_FRAME_SIZE - (bmp.width >> 1) + offset.x;
    const destY = HALF_CHARACTER_FRAME_SIZE - (bmp.height >> 1) + offset.y;

    this.tmpCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
  }

  private renderCharacterArmor(
    gender: Gender,
    armor: number,
    frame: CharacterFrame,
  ) {
    const graphicId = (armor - 1) * 50 + frame + 1;

    const bmp = this.getBmp(
      gender === Gender.Female ? GfxType.FemaleArmor : GfxType.MaleArmor,
      graphicId,
    );

    if (!bmp) {
      console.error(
        `Missing armor bitmap for ${Gender[gender]} ${armor} ${CharacterFrame[frame]}`,
      );
      return;
    }

    const offset = ARMOR_OFFSETS[gender][frame];

    const destX = HALF_CHARACTER_FRAME_SIZE - (bmp.width >> 1) + offset.x;
    const destY = HALF_CHARACTER_FRAME_SIZE - (bmp.height >> 1) + offset.y;

    this.tmpCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
  }

  private renderCharacterHat(
    gender: Gender,
    hat: number,
    frame: CharacterFrame,
    upLeft: boolean,
  ) {
    const graphicId = (hat - 1) * 10 + (upLeft ? 3 : 1);

    const bmp = this.getBmp(
      gender === Gender.Female ? GfxType.FemaleHat : GfxType.MaleHat,
      graphicId,
    );

    if (!bmp) {
      console.error(
        `Missing hat bitmap for ${Gender[gender]} ${hat} ${CharacterFrame[frame]}`,
      );
      return;
    }

    const offset = HAT_OFFSETS[gender][frame];

    const destX = HALF_CHARACTER_FRAME_SIZE - (bmp.width >> 1) + offset.x;
    const destY = -(bmp.height >> 1) + offset.y;

    this.tmpCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
  }

  private getCharacterFrameGraphicId(frame: CharacterFrame): number {
    switch (frame) {
      case CharacterFrame.StandingDownRight:
      case CharacterFrame.StandingUpLeft:
        return 1;
      case CharacterFrame.WalkingDownRight1:
      case CharacterFrame.WalkingDownRight2:
      case CharacterFrame.WalkingDownRight3:
      case CharacterFrame.WalkingDownRight4:
      case CharacterFrame.WalkingUpLeft1:
      case CharacterFrame.WalkingUpLeft2:
      case CharacterFrame.WalkingUpLeft3:
      case CharacterFrame.WalkingUpLeft4:
        return 2;
      case CharacterFrame.MeleeAttackDownRight1:
      case CharacterFrame.MeleeAttackDownRight2:
      case CharacterFrame.MeleeAttackUpLeft1:
      case CharacterFrame.MeleeAttackUpLeft2:
        return 3;
      case CharacterFrame.RaisedHandDownRight:
      case CharacterFrame.RaisedHandUpLeft:
        return 4;
      case CharacterFrame.ChairDownRight:
      case CharacterFrame.ChairUpLeft:
        return 5;
      case CharacterFrame.FloorDownRight:
      case CharacterFrame.FloorUpLeft:
        return 6;
      case CharacterFrame.RangeAttackDownRight:
      case CharacterFrame.RangeAttackUpLeft:
        return 7;
      default:
        throw new Error(`Unknown character frame: ${frame}`);
    }
  }

  private getCharacterFrameSize(frame: CharacterFrame): {
    w: number;
    h: number;
  } {
    switch (frame) {
      case CharacterFrame.StandingDownRight:
      case CharacterFrame.StandingUpLeft:
        return { w: CHARACTER_WIDTH, h: CHARACTER_HEIGHT };
      case CharacterFrame.WalkingDownRight1:
      case CharacterFrame.WalkingDownRight2:
      case CharacterFrame.WalkingDownRight3:
      case CharacterFrame.WalkingDownRight4:
      case CharacterFrame.WalkingUpLeft1:
      case CharacterFrame.WalkingUpLeft2:
      case CharacterFrame.WalkingUpLeft3:
      case CharacterFrame.WalkingUpLeft4:
        return { w: CHARACTER_WALKING_WIDTH, h: CHARACTER_WALKING_HEIGHT };
      case CharacterFrame.MeleeAttackDownRight1:
      case CharacterFrame.MeleeAttackDownRight2:
      case CharacterFrame.MeleeAttackUpLeft1:
      case CharacterFrame.MeleeAttackUpLeft2:
        return { w: CHARACTER_MELEE_ATTACK_WIDTH, h: CHARACTER_HEIGHT };
      case CharacterFrame.RaisedHandDownRight:
      case CharacterFrame.RaisedHandUpLeft:
        return {
          w: CHARACTER_WIDTH,
          h: CHARACTER_RAISED_HAND_HEIGHT,
        };
      case CharacterFrame.ChairDownRight:
      case CharacterFrame.ChairUpLeft:
        return { w: CHARACTER_SIT_CHAIR_WIDTH, h: CHARACTER_SIT_CHAIR_HEIGHT };
      case CharacterFrame.FloorDownRight:
      case CharacterFrame.FloorUpLeft:
        return {
          w: CHARACTER_SIT_GROUND_WIDTH,
          h: CHARACTER_SIT_GROUND_HEIGHT,
        };
      case CharacterFrame.RangeAttackDownRight:
      case CharacterFrame.RangeAttackUpLeft:
        return { w: CHARACTER_RANGE_ATTACK_WIDTH, h: CHARACTER_HEIGHT };
      default:
        throw new Error(`Unknown character frame: ${frame}`);
    }
  }
}

function generateCharacterHash(character: CharacterMapInfo) {
  return `${character.skin}${character.gender}${character.hairStyle}${character.hairColor}${character.equipment.armor}${character.equipment.boots}${character.equipment.hat}${character.equipment.shield}${character.equipment.weapon}`;
}

const HAIR_OFFSETS = {
  [Gender.Female]: {
    [CharacterFrame.StandingDownRight]: { x: -1, y: -14 },
    [CharacterFrame.StandingUpLeft]: { x: -1, y: -14 },
    [CharacterFrame.WalkingDownRight1]: { x: -1, y: -14 },
    [CharacterFrame.WalkingDownRight2]: { x: -1, y: -14 },
    [CharacterFrame.WalkingDownRight3]: { x: -1, y: -14 },
    [CharacterFrame.WalkingDownRight4]: { x: -1, y: -14 },
    [CharacterFrame.WalkingUpLeft1]: { x: -1, y: -14 },
    [CharacterFrame.WalkingUpLeft2]: { x: -1, y: -14 },
    [CharacterFrame.WalkingUpLeft3]: { x: -1, y: -14 },
    [CharacterFrame.WalkingUpLeft4]: { x: -1, y: -14 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 0, y: -14 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -4, y: -9 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 0, y: -14 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -4, y: -13 },
    [CharacterFrame.RaisedHandDownRight]: { x: -1, y: -12 },
    [CharacterFrame.RaisedHandUpLeft]: { x: -1, y: -12 },
    [CharacterFrame.ChairDownRight]: { x: 1, y: -13 },
    [CharacterFrame.ChairUpLeft]: { x: 2, y: -13 },
    [CharacterFrame.FloorDownRight]: { x: 1, y: -8 },
    [CharacterFrame.FloorUpLeft]: { x: 3, y: -8 },
    [CharacterFrame.RangeAttackDownRight]: { x: 5, y: -15 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 3, y: -14 },
  },
  [Gender.Male]: {
    [CharacterFrame.StandingDownRight]: { x: -1, y: -15 },
    [CharacterFrame.StandingUpLeft]: { x: -1, y: -15 },
    [CharacterFrame.WalkingDownRight1]: { x: 0, y: -15 },
    [CharacterFrame.WalkingDownRight2]: { x: 0, y: -15 },
    [CharacterFrame.WalkingDownRight3]: { x: 0, y: -15 },
    [CharacterFrame.WalkingDownRight4]: { x: 0, y: -15 },
    [CharacterFrame.WalkingUpLeft1]: { x: -1, y: -15 },
    [CharacterFrame.WalkingUpLeft2]: { x: -1, y: -15 },
    [CharacterFrame.WalkingUpLeft3]: { x: -1, y: -15 },
    [CharacterFrame.WalkingUpLeft4]: { x: -1, y: -15 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 1, y: -15 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -5, y: -11 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 1, y: -15 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -3, y: -14 },
    [CharacterFrame.RaisedHandDownRight]: { x: -1, y: -13 },
    [CharacterFrame.RaisedHandUpLeft]: { x: -1, y: -13 },
    [CharacterFrame.ChairDownRight]: { x: 2, y: -12 },
    [CharacterFrame.ChairUpLeft]: { x: 2, y: -12 },
    [CharacterFrame.FloorDownRight]: { x: 2, y: -7 },
    [CharacterFrame.FloorUpLeft]: { x: 4, y: -7 },
    [CharacterFrame.RangeAttackDownRight]: { x: 4, y: -15 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 2, y: -15 },
  },
};

const BOOTS_OFFSETS = {
  [Gender.Female]: {
    [CharacterFrame.StandingDownRight]: { x: 0, y: 21 },
    [CharacterFrame.StandingUpLeft]: { x: 0, y: 21 },
    [CharacterFrame.WalkingDownRight1]: { x: 0, y: 21 },
    [CharacterFrame.WalkingDownRight2]: { x: 0, y: 21 },
    [CharacterFrame.WalkingDownRight3]: { x: 0, y: 21 },
    [CharacterFrame.WalkingDownRight4]: { x: 0, y: 21 },
    [CharacterFrame.WalkingUpLeft1]: { x: 0, y: 21 },
    [CharacterFrame.WalkingUpLeft2]: { x: 0, y: 21 },
    [CharacterFrame.WalkingUpLeft3]: { x: 0, y: 21 },
    [CharacterFrame.WalkingUpLeft4]: { x: 0, y: 20 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 1, y: 21 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -1, y: 21 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 1, y: 21 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -1, y: 21 },
    [CharacterFrame.RaisedHandDownRight]: { x: 0, y: 23 },
    [CharacterFrame.RaisedHandUpLeft]: { x: 0, y: 23 },
    [CharacterFrame.ChairDownRight]: { x: 2, y: 15 },
    [CharacterFrame.ChairUpLeft]: { x: 3, y: 8 },
    [CharacterFrame.FloorDownRight]: { x: 1, y: 13 },
    [CharacterFrame.FloorUpLeft]: { x: 3, y: 6 },
    [CharacterFrame.RangeAttackDownRight]: { x: 2, y: 21 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 2, y: 21 },
  },
  [Gender.Male]: {
    [CharacterFrame.StandingDownRight]: { x: 0, y: 20 },
    [CharacterFrame.StandingUpLeft]: { x: 0, y: 20 },
    [CharacterFrame.WalkingDownRight1]: { x: 1, y: 19 },
    [CharacterFrame.WalkingDownRight2]: { x: 1, y: 19 },
    [CharacterFrame.WalkingDownRight3]: { x: 1, y: 19 },
    [CharacterFrame.WalkingDownRight4]: { x: 1, y: 19 },
    [CharacterFrame.WalkingUpLeft1]: { x: 0, y: 19 },
    [CharacterFrame.WalkingUpLeft2]: { x: 0, y: 19 },
    [CharacterFrame.WalkingUpLeft3]: { x: 0, y: 19 },
    [CharacterFrame.WalkingUpLeft4]: { x: 0, y: 19 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 2, y: 20 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -2, y: 20 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 2, y: 20 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -2, y: 20 },
    [CharacterFrame.RaisedHandDownRight]: { x: 0, y: 21 },
    [CharacterFrame.RaisedHandUpLeft]: { x: 0, y: 21 },
    [CharacterFrame.ChairDownRight]: { x: 3, y: 16 },
    [CharacterFrame.ChairUpLeft]: { x: 3, y: 9 },
    [CharacterFrame.FloorDownRight]: { x: 3, y: 15 },
    [CharacterFrame.FloorUpLeft]: { x: 3, y: 7 },
    [CharacterFrame.RangeAttackDownRight]: { x: 2, y: 20 },
    [CharacterFrame.RangeAttackUpLeft]: { x: -2, y: 20 },
  },
};

const ARMOR_OFFSETS = {
  [Gender.Female]: {
    [CharacterFrame.StandingDownRight]: { x: 0, y: -3 },
    [CharacterFrame.StandingUpLeft]: { x: 0, y: -3 },
    [CharacterFrame.WalkingDownRight1]: { x: 0, y: -4 },
    [CharacterFrame.WalkingDownRight2]: { x: 0, y: -4 },
    [CharacterFrame.WalkingDownRight3]: { x: 0, y: -4 },
    [CharacterFrame.WalkingDownRight4]: { x: 0, y: -4 },
    [CharacterFrame.WalkingUpLeft1]: { x: 0, y: -4 },
    [CharacterFrame.WalkingUpLeft2]: { x: 0, y: -4 },
    [CharacterFrame.WalkingUpLeft3]: { x: 0, y: -4 },
    [CharacterFrame.WalkingUpLeft4]: { x: 0, y: -4 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 1, y: -3 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -1, y: -3 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 1, y: -3 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -1, y: -3 },
    [CharacterFrame.RaisedHandDownRight]: { x: 0, y: -1 },
    [CharacterFrame.RaisedHandUpLeft]: { x: 0, y: -1 },
    [CharacterFrame.ChairDownRight]: { x: 2, y: -8 },
    [CharacterFrame.ChairUpLeft]: { x: 3, y: -8 },
    [CharacterFrame.FloorDownRight]: { x: 1, y: -3 },
    [CharacterFrame.FloorUpLeft]: { x: 3, y: -3 },
    [CharacterFrame.RangeAttackDownRight]: { x: 1, y: -3 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 1, y: -3 },
  },
  [Gender.Male]: {
    [CharacterFrame.StandingDownRight]: { x: 0, y: -4 },
    [CharacterFrame.StandingUpLeft]: { x: 0, y: -4 },
    [CharacterFrame.WalkingDownRight1]: { x: 1, y: -5 },
    [CharacterFrame.WalkingDownRight2]: { x: 1, y: -5 },
    [CharacterFrame.WalkingDownRight3]: { x: 1, y: -5 },
    [CharacterFrame.WalkingDownRight4]: { x: 1, y: -5 },
    [CharacterFrame.WalkingUpLeft1]: { x: 0, y: -5 },
    [CharacterFrame.WalkingUpLeft2]: { x: 0, y: -5 },
    [CharacterFrame.WalkingUpLeft3]: { x: 0, y: -5 },
    [CharacterFrame.WalkingUpLeft4]: { x: 0, y: -5 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 2, y: -4 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -2, y: -4 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 2, y: -4 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -2, y: -4 },
    [CharacterFrame.RaisedHandDownRight]: { x: 0, y: -2 },
    [CharacterFrame.RaisedHandUpLeft]: { x: 0, y: -2 },
    [CharacterFrame.ChairDownRight]: { x: 3, y: -7 },
    [CharacterFrame.ChairUpLeft]: { x: 3, y: -7 },
    [CharacterFrame.FloorDownRight]: { x: 3, y: -3 },
    [CharacterFrame.FloorUpLeft]: { x: 3, y: -2 },
    [CharacterFrame.RangeAttackDownRight]: { x: 2, y: -4 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 2, y: -4 },
  },
};

const HAT_OFFSETS = {
  [Gender.Female]: {
    [CharacterFrame.StandingDownRight]: { x: 0, y: 23 },
    [CharacterFrame.StandingUpLeft]: { x: 0, y: 23 },
    [CharacterFrame.WalkingDownRight1]: { x: 0, y: 23 },
    [CharacterFrame.WalkingDownRight2]: { x: 0, y: 23 },
    [CharacterFrame.WalkingDownRight3]: { x: 0, y: 23 },
    [CharacterFrame.WalkingDownRight4]: { x: 0, y: 23 },
    [CharacterFrame.WalkingUpLeft1]: { x: 0, y: 23 },
    [CharacterFrame.WalkingUpLeft2]: { x: 0, y: 23 },
    [CharacterFrame.WalkingUpLeft3]: { x: 0, y: 23 },
    [CharacterFrame.WalkingUpLeft4]: { x: 0, y: 23 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 1, y: 23 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -3, y: 28 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 1, y: 23 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -3, y: 24 },
    [CharacterFrame.RaisedHandDownRight]: { x: 0, y: 25 },
    [CharacterFrame.RaisedHandUpLeft]: { x: 0, y: 25 },
    [CharacterFrame.ChairDownRight]: { x: 2, y: 24 },
    [CharacterFrame.ChairUpLeft]: { x: 3, y: 24 },
    [CharacterFrame.FloorDownRight]: { x: 2, y: 29 },
    [CharacterFrame.FloorUpLeft]: { x: 4, y: 29 },
    [CharacterFrame.RangeAttackDownRight]: { x: 6, y: 22 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 4, y: 23 },
  },
  [Gender.Male]: {
    [CharacterFrame.StandingDownRight]: { x: 0, y: 22 },
    [CharacterFrame.StandingUpLeft]: { x: 0, y: 22 },
    [CharacterFrame.WalkingDownRight1]: { x: 1, y: 22 },
    [CharacterFrame.WalkingDownRight2]: { x: 1, y: 22 },
    [CharacterFrame.WalkingDownRight3]: { x: 1, y: 22 },
    [CharacterFrame.WalkingDownRight4]: { x: 1, y: 22 },
    [CharacterFrame.WalkingUpLeft1]: { x: 0, y: 22 },
    [CharacterFrame.WalkingUpLeft2]: { x: 0, y: 22 },
    [CharacterFrame.WalkingUpLeft3]: { x: 0, y: 22 },
    [CharacterFrame.WalkingUpLeft4]: { x: 0, y: 22 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 2, y: 22 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -4, y: 26 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 2, y: 22 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -2, y: 23 },
    [CharacterFrame.RaisedHandDownRight]: { x: 0, y: 24 },
    [CharacterFrame.RaisedHandUpLeft]: { x: 0, y: 24 },
    [CharacterFrame.ChairDownRight]: { x: 3, y: 25 },
    [CharacterFrame.ChairUpLeft]: { x: 3, y: 25 },
    [CharacterFrame.FloorDownRight]: { x: 3, y: 30 },
    [CharacterFrame.FloorUpLeft]: { x: 5, y: 30 },
    [CharacterFrame.RangeAttackDownRight]: { x: 5, y: 22 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 3, y: 22 },
  },
};

const WEAPON_OFFSETS = {
  [Gender.Female]: {
    [CharacterFrame.StandingDownRight]: { x: -9, y: -6 },
    [CharacterFrame.StandingUpLeft]: { x: -9, y: -6 },
    [CharacterFrame.WalkingDownRight1]: { x: -9, y: -7 },
    [CharacterFrame.WalkingDownRight2]: { x: -9, y: -7 },
    [CharacterFrame.WalkingDownRight3]: { x: -9, y: -7 },
    [CharacterFrame.WalkingDownRight4]: { x: -9, y: -7 },
    [CharacterFrame.WalkingUpLeft1]: { x: -9, y: -7 },
    [CharacterFrame.WalkingUpLeft2]: { x: -9, y: -7 },
    [CharacterFrame.WalkingUpLeft3]: { x: -9, y: -7 },
    [CharacterFrame.WalkingUpLeft4]: { x: -9, y: -7 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: -8, y: -6 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -10, y: -6 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: -8, y: -6 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -10, y: -6 },
    [CharacterFrame.RaisedHandDownRight]: { x: -9, y: -4 },
    [CharacterFrame.RaisedHandUpLeft]: { x: -9, y: -4 },
    [CharacterFrame.RangeAttackDownRight]: { x: -8, y: -6 },
    [CharacterFrame.RangeAttackUpLeft]: { x: -8, y: -6 },
  },
  [Gender.Male]: {
    [CharacterFrame.StandingDownRight]: { x: -9, y: -7 },
    [CharacterFrame.StandingUpLeft]: { x: -9, y: -7 },
    [CharacterFrame.WalkingDownRight1]: { x: -8, y: -8 },
    [CharacterFrame.WalkingDownRight2]: { x: -8, y: -8 },
    [CharacterFrame.WalkingDownRight3]: { x: -8, y: -8 },
    [CharacterFrame.WalkingDownRight4]: { x: -8, y: -8 },
    [CharacterFrame.WalkingUpLeft1]: { x: -9, y: -8 },
    [CharacterFrame.WalkingUpLeft2]: { x: -9, y: -8 },
    [CharacterFrame.WalkingUpLeft3]: { x: -9, y: -8 },
    [CharacterFrame.WalkingUpLeft4]: { x: -9, y: -8 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: -7, y: -7 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -11, y: -7 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: -7, y: -7 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -11, y: -7 },
    [CharacterFrame.RaisedHandDownRight]: { x: -9, y: -5 },
    [CharacterFrame.RaisedHandUpLeft]: { x: -9, y: -5 },
    [CharacterFrame.RangeAttackDownRight]: { x: -7, y: -7 },
    [CharacterFrame.RangeAttackUpLeft]: { x: -7, y: -7 },
  },
};

const SHIELD_OFFSETS = {
  [Gender.Female]: {
    [CharacterFrame.StandingDownRight]: { x: -5, y: 5 },
    [CharacterFrame.StandingUpLeft]: { x: -5, y: 5 },
    [CharacterFrame.WalkingDownRight1]: { x: -5, y: 4 },
    [CharacterFrame.WalkingDownRight2]: { x: -5, y: 4 },
    [CharacterFrame.WalkingDownRight3]: { x: -5, y: 4 },
    [CharacterFrame.WalkingDownRight4]: { x: -5, y: 4 },
    [CharacterFrame.WalkingUpLeft1]: { x: -5, y: 4 },
    [CharacterFrame.WalkingUpLeft2]: { x: -5, y: 4 },
    [CharacterFrame.WalkingUpLeft3]: { x: -5, y: 4 },
    [CharacterFrame.WalkingUpLeft4]: { x: -5, y: 4 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: -4, y: 5 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -6, y: 5 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: -4, y: 5 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -6, y: 5 },
    [CharacterFrame.RaisedHandDownRight]: { x: -5, y: 7 },
    [CharacterFrame.RaisedHandUpLeft]: { x: -5, y: 7 },
  },
  [Gender.Male]: {
    [CharacterFrame.StandingDownRight]: { x: -5, y: 4 },
    [CharacterFrame.StandingUpLeft]: { x: -5, y: 4 },
    [CharacterFrame.WalkingDownRight1]: { x: -4, y: 3 },
    [CharacterFrame.WalkingDownRight2]: { x: -4, y: 3 },
    [CharacterFrame.WalkingDownRight3]: { x: -4, y: 3 },
    [CharacterFrame.WalkingDownRight4]: { x: -4, y: 3 },
    [CharacterFrame.WalkingUpLeft1]: { x: -5, y: 3 },
    [CharacterFrame.WalkingUpLeft2]: { x: -5, y: 3 },
    [CharacterFrame.WalkingUpLeft3]: { x: -5, y: 3 },
    [CharacterFrame.WalkingUpLeft4]: { x: -5, y: 3 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: -3, y: 4 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -7, y: 4 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: -3, y: 4 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -7, y: 4 },
    [CharacterFrame.RaisedHandDownRight]: { x: -5, y: 6 },
    [CharacterFrame.RaisedHandUpLeft]: { x: -5, y: 6 },
  },
};

const BACK_OFFSETS = {
  [Gender.Female]: {
    [CharacterFrame.StandingDownRight]: { x: 0, y: -17 },
    [CharacterFrame.StandingUpLeft]: { x: 0, y: -17 },
    [CharacterFrame.WalkingDownRight1]: { x: 0, y: -17 },
    [CharacterFrame.WalkingDownRight2]: { x: 0, y: -17 },
    [CharacterFrame.WalkingDownRight3]: { x: 0, y: -17 },
    [CharacterFrame.WalkingDownRight4]: { x: 0, y: -17 },
    [CharacterFrame.WalkingUpLeft1]: { x: 0, y: -17 },
    [CharacterFrame.WalkingUpLeft2]: { x: 0, y: -17 },
    [CharacterFrame.WalkingUpLeft3]: { x: 0, y: -17 },
    [CharacterFrame.WalkingUpLeft4]: { x: 0, y: -17 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 0, y: -17 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: 0, y: -17 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 0, y: -17 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: 0, y: -17 },
    [CharacterFrame.RaisedHandDownRight]: { x: 0, y: -15 },
    [CharacterFrame.RaisedHandUpLeft]: { x: 0, y: -15 },
    [CharacterFrame.ChairDownRight]: { x: 2, y: -16 },
    [CharacterFrame.ChairUpLeft]: { x: 3, y: -16 },
    [CharacterFrame.FloorDownRight]: { x: 2, y: -11 },
    [CharacterFrame.FloorUpLeft]: { x: 4, y: -11 },
    [CharacterFrame.RangeAttackDownRight]: { x: 1, y: -17 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 1, y: -17 },
  },
  [Gender.Male]: {
    [CharacterFrame.StandingDownRight]: { x: 0, y: -18 },
    [CharacterFrame.StandingUpLeft]: { x: 0, y: -18 },
    [CharacterFrame.WalkingDownRight1]: { x: 1, y: -18 },
    [CharacterFrame.WalkingDownRight2]: { x: 1, y: -18 },
    [CharacterFrame.WalkingDownRight3]: { x: 1, y: -18 },
    [CharacterFrame.WalkingDownRight4]: { x: 1, y: -18 },
    [CharacterFrame.WalkingUpLeft1]: { x: 0, y: -18 },
    [CharacterFrame.WalkingUpLeft2]: { x: 0, y: -18 },
    [CharacterFrame.WalkingUpLeft3]: { x: 0, y: -18 },
    [CharacterFrame.WalkingUpLeft4]: { x: 0, y: -18 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 2, y: -18 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -2, y: -18 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 2, y: -18 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -2, y: -18 },
    [CharacterFrame.RaisedHandDownRight]: { x: 0, y: -16 },
    [CharacterFrame.RaisedHandUpLeft]: { x: 0, y: -16 },
    [CharacterFrame.ChairDownRight]: { x: 3, y: -15 },
    [CharacterFrame.ChairUpLeft]: { x: 3, y: -15 },
    [CharacterFrame.FloorDownRight]: { x: 3, y: -10 },
    [CharacterFrame.FloorUpLeft]: { x: 5, y: -10 },
    [CharacterFrame.RangeAttackDownRight]: { x: 2, y: -18 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 2, y: -18 },
  },
};

export const CHARACTER_FRAME_OFFSETS = {
  [Gender.Female]: {
    [CharacterFrame.StandingDownRight]: {
      [Direction.Down]: { x: 0, y: 0 },
      [Direction.Right]: { x: 0, y: 0 },
    },
    [CharacterFrame.StandingUpLeft]: {
      [Direction.Up]: { x: 0, y: 0 },
      [Direction.Left]: { x: 0, y: 0 },
    },
    [CharacterFrame.WalkingDownRight1]: {
      [Direction.Down]: { x: 0, y: 0 },
      [Direction.Right]: { x: 0, y: 0 },
    },
    [CharacterFrame.WalkingDownRight2]: {
      [Direction.Down]: { x: 0, y: 0 },
      [Direction.Right]: { x: 0, y: 0 },
    },
    [CharacterFrame.WalkingDownRight3]: {
      [Direction.Down]: { x: 0, y: 0 },
      [Direction.Right]: { x: 0, y: 0 },
    },
    [CharacterFrame.WalkingDownRight4]: {
      [Direction.Down]: { x: 0, y: 0 },
      [Direction.Right]: { x: 0, y: 0 },
    },
    [CharacterFrame.WalkingUpLeft1]: {
      [Direction.Up]: { x: 0, y: 0 },
      [Direction.Left]: { x: 0, y: 0 },
    },
    [CharacterFrame.WalkingUpLeft2]: {
      [Direction.Up]: { x: 0, y: 0 },
      [Direction.Left]: { x: 0, y: 0 },
    },
    [CharacterFrame.WalkingUpLeft3]: {
      [Direction.Up]: { x: 0, y: 0 },
      [Direction.Left]: { x: 0, y: 0 },
    },
    [CharacterFrame.WalkingUpLeft4]: {
      [Direction.Up]: { x: 0, y: 0 },
      [Direction.Left]: { x: 0, y: 0 },
    },
    [CharacterFrame.RaisedHandDownRight]: {
      [Direction.Down]: { x: 0, y: -2 },
      [Direction.Right]: { x: 0, y: -2 },
    },
    [CharacterFrame.RaisedHandUpLeft]: {
      [Direction.Up]: { x: 0, y: -2 },
      [Direction.Left]: { x: 0, y: -2 },
    },
    [CharacterFrame.MeleeAttackDownRight1]: {
      [Direction.Down]: { x: -1, y: 0 },
      [Direction.Right]: { x: 1, y: 0 },
    },
    [CharacterFrame.MeleeAttackDownRight2]: {
      [Direction.Down]: { x: -5, y: 1 },
      [Direction.Right]: { x: 5, y: 1 },
    },
    [CharacterFrame.MeleeAttackUpLeft1]: {
      [Direction.Up]: { x: 1, y: 0 },
      [Direction.Left]: { x: -1, y: 0 },
    },
    [CharacterFrame.MeleeAttackUpLeft2]: {
      [Direction.Up]: { x: 5, y: -1 },
      [Direction.Left]: { x: -5, y: -1 },
    },
    [CharacterFrame.ChairDownRight]: {
      [Direction.Down]: { x: -2, y: 13 },
      [Direction.Right]: { x: 2, y: 13 },
    },
    [CharacterFrame.ChairUpLeft]: {
      [Direction.Up]: { x: 3, y: 15 },
      [Direction.Left]: { x: -3, y: 15 },
    },
    [CharacterFrame.FloorDownRight]: {
      [Direction.Down]: { x: -2, y: 13 },
      [Direction.Right]: { x: 2, y: 13 },
    },
    [CharacterFrame.FloorUpLeft]: {
      [Direction.Up]: { x: 2, y: 16 },
      [Direction.Left]: { x: -2, y: 16 },
    },
    [CharacterFrame.RangeAttackDownRight]: {
      [Direction.Down]: { x: -7, y: 1 },
      [Direction.Right]: { x: 7, y: 1 },
    },
    [CharacterFrame.RangeAttackUpLeft]: {
      [Direction.Up]: { x: 5, y: 0 },
      [Direction.Left]: { x: -5, y: 0 },
    },
  },
  [Gender.Male]: {
    [CharacterFrame.StandingDownRight]: {
      [Direction.Down]: { x: 0, y: 1 },
      [Direction.Right]: { x: 0, y: 1 },
    },
    [CharacterFrame.StandingUpLeft]: {
      [Direction.Up]: { x: 0, y: 1 },
      [Direction.Left]: { x: 0, y: 1 },
    },
    [CharacterFrame.WalkingDownRight1]: {
      [Direction.Down]: { x: -1, y: 1 },
      [Direction.Right]: { x: 1, y: 1 },
    },
    [CharacterFrame.WalkingDownRight2]: {
      [Direction.Down]: { x: -1, y: 1 },
      [Direction.Right]: { x: 1, y: 1 },
    },
    [CharacterFrame.WalkingDownRight3]: {
      [Direction.Down]: { x: -1, y: 1 },
      [Direction.Right]: { x: 1, y: 1 },
    },
    [CharacterFrame.WalkingDownRight4]: {
      [Direction.Down]: { x: -1, y: 1 },
      [Direction.Right]: { x: 1, y: 1 },
    },
    [CharacterFrame.WalkingUpLeft1]: {
      [Direction.Up]: { x: 0, y: 1 },
      [Direction.Left]: { x: 0, y: 1 },
    },
    [CharacterFrame.WalkingUpLeft2]: {
      [Direction.Up]: { x: 0, y: 1 },
      [Direction.Left]: { x: 0, y: 1 },
    },
    [CharacterFrame.WalkingUpLeft3]: {
      [Direction.Up]: { x: 0, y: 1 },
      [Direction.Left]: { x: 0, y: 1 },
    },
    [CharacterFrame.WalkingUpLeft4]: {
      [Direction.Up]: { x: 0, y: 1 },
      [Direction.Left]: { x: 0, y: 1 },
    },
    [CharacterFrame.RaisedHandDownRight]: {
      [Direction.Down]: { x: 0, y: -1 },
      [Direction.Right]: { x: 0, y: -1 },
    },
    [CharacterFrame.RaisedHandUpLeft]: {
      [Direction.Up]: { x: 0, y: -1 },
      [Direction.Left]: { x: 0, y: -1 },
    },
    [CharacterFrame.MeleeAttackDownRight1]: {
      [Direction.Down]: { x: -2, y: 1 },
      [Direction.Right]: { x: 2, y: 1 },
    },
    [CharacterFrame.MeleeAttackDownRight2]: {
      [Direction.Down]: { x: -4, y: 2 },
      [Direction.Right]: { x: 4, y: 2 },
    },
    [CharacterFrame.MeleeAttackUpLeft1]: {
      [Direction.Up]: { x: 2, y: 1 },
      [Direction.Left]: { x: -2, y: 1 },
    },
    [CharacterFrame.MeleeAttackUpLeft2]: {
      [Direction.Up]: { x: 4, y: 0 },
      [Direction.Left]: { x: -4, y: 0 },
    },
    [CharacterFrame.ChairDownRight]: {
      [Direction.Down]: { x: -3, y: 12 },
      [Direction.Right]: { x: 3, y: 12 },
    },
    [CharacterFrame.ChairUpLeft]: {
      [Direction.Up]: { x: 3, y: 14 },
      [Direction.Left]: { x: -3, y: 14 },
    },
    [CharacterFrame.FloorDownRight]: {
      [Direction.Down]: { x: -3, y: 12 },
      [Direction.Right]: { x: 3, y: 12 },
    },
    [CharacterFrame.FloorUpLeft]: {
      [Direction.Up]: { x: 2, y: 15 },
      [Direction.Left]: { x: -2, y: 15 },
    },
    [CharacterFrame.RangeAttackDownRight]: {
      [Direction.Down]: { x: -8, y: 2 },
      [Direction.Right]: { x: 8, y: 2 },
    },
    [CharacterFrame.RangeAttackUpLeft]: {
      [Direction.Up]: { x: 6, y: 1 },
      [Direction.Left]: { x: -6, y: 1 },
    },
  },
};
