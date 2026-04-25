import {
  type CharacterMapInfo,
  Direction,
  Emote,
  type EquipmentMapInfo,
  Gender,
} from 'eolib';
import { CanvasSource, Rectangle, Texture } from 'pixi.js';
import type { Client } from '@/client';
import {
  ATLAS_EXPIRY_TICKS,
  DEFRAG_FILL_THRESHOLD,
  NUMBER_OF_EFFECTS,
  NUMBER_OF_EMOTES,
} from '@/consts';
import { GfxType } from '@/gfx';
import { LAYER_GFX_MAP } from '@/map';
import { getItemGraphicId } from '@/utils';
import type {
  BoundsRequest,
  BoundsResult,
  CompositeCharacterSpec,
  CompositeFaceEmoteSpec,
  CompositeResult,
  FaceEmoteCompositeResult,
  RawPixels,
} from './compositor.worker';
import { CompositorClient } from './compositor-client';

const ATLAS_SIZE = 2048;

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
  pendingFrames?: (Frame | undefined)[];
  neededGfx: Array<{ gfxType: GfxType; graphicId: number }>;
};

export type TileAtlasEntry = {
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
  img: ImageBitmap | null;
  loaded: boolean;
};

type FaceEmoteAtlasEntry = {
  playerId: number;
  emoteId: number;
  characterHash: string;
  frame: Frame;
  pendingFrame?: Frame;
};

type CharacterFrameImg = {
  playerId: number;
  frameIndex: number;
  img: ImageBitmap | null;
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
  FaceEmote = 9,
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
  private source: CanvasSource;
  private texture: Texture;
  private labelPrefix: string;
  private committed = false;
  private subTextureCache = new Map<string, Texture>();
  skyline = [{ x: 0, y: 0, w: ATLAS_SIZE }];

  constructor(labelPrefix: string) {
    this.labelPrefix = labelPrefix;
    this.canvas = document.createElement('canvas');
    this.canvas.width = ATLAS_SIZE;
    this.canvas.height = ATLAS_SIZE;
    this.canvas.id = `${labelPrefix}-canvas`;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.source = new CanvasSource({
      resource: this.canvas,
      scaleMode: 'nearest',
      label: `${labelPrefix}-source`,
    });
    this.texture = new Texture({
      source: this.source,
      label: `${labelPrefix}-texture`,
    });
  }

  commit() {
    this.source.update();
    this.subTextureCache.clear();
    this.committed = true;
  }

  getTexture(): Texture | undefined {
    if (!this.committed) return undefined;
    return this.texture;
  }

  getSubTexture(x: number, y: number, w: number, h: number): Texture {
    const key = `${x},${y},${w},${h}`;
    let t = this.subTextureCache.get(key);
    if (!t) {
      t = new Texture({
        source: this.source,
        frame: new Rectangle(x, y, w, h),
        label: `${this.labelPrefix}-subtex(${x},${y},${w},${h})`,
      });
      this.subTextureCache.set(key, t);
    }
    return t;
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
  private characters = new Map<number, CharacterAtlasEntry>();
  private npcs = new Map<number, NpcAtlasEntry>();
  private items = new Map<number, ItemAtlasEntry>();
  private tiles = new Map<string, TileAtlasEntry>();
  private emotes = new Map<number, EmoteAtlasEntry>();
  private effects = new Map<number, EffectAtlasEntry>();
  private faceEmoteEntries = new Map<string, FaceEmoteAtlasEntry>();
  private staticEntries: Map<StaticAtlasEntryType, TileAtlasEntry> = new Map();
  private client: Client;
  mapId = 0;
  private bmpsToLoad = new Map<string, Bmp>();
  private pendingBmpPromises: Promise<void>[] = [];
  private loading = false;
  private loadingPromise: Promise<void> | null = null;
  private appended = true;
  private staticAtlas: AtlasCanvas;
  private mapAtlas: AtlasCanvas;
  private atlases: AtlasCanvas[];
  private currentAtlasIndex = 0;
  private ctx: CanvasRenderingContext2D;
  private temporaryCharacterFrames = new Map<string, CharacterFrameImg>();
  private temporaryFaceEmoteFrames = new Map<
    string,
    { playerId: number; emoteId: number; img: ImageBitmap }
  >();
  private compositorClient: CompositorClient;
  private dirtyDynamicAtlasIndices: Set<number> = new Set();
  pendingDefrag = false;

  offsetFrame: HTMLSelectElement =
    document.querySelector<HTMLSelectElement>('#offset-frame')!;
  offsetX: HTMLInputElement =
    document.querySelector<HTMLInputElement>('#offset-x')!;
  offsetY: HTMLInputElement =
    document.querySelector<HTMLInputElement>('#offset-y')!;

  constructor(client: Client) {
    this.client = client;
    this.staticAtlas = new AtlasCanvas('atlas-static');
    this.mapAtlas = new AtlasCanvas('atlas-map');
    this.atlases = [new AtlasCanvas('atlas-dynamic-0')];
    this.ctx = this.atlases[0].getContext();
    this.compositorClient = new CompositorClient(client.gfxLoader);
  }

  getAtlas(index: number): HTMLCanvasElement | undefined {
    // Kept for ground pre-rendering (renderTile with canvas 2D ctx).
    // Returns a hidden img backed by the atlas canvas for drawImage compatibility.
    const atlasCanvas = this.getAtlasCanvas(index);
    if (!atlasCanvas?.getTexture()) return undefined;
    // Expose the underlying HTML canvas as an image-like source for ctx.drawImage.
    return atlasCanvas.getCanvas();
  }

  getAtlasTexture(index: number): Texture | undefined {
    return this.getAtlasCanvas(index)?.getTexture();
  }

  getFrameTexture(
    frame:
      | Frame
      | TileAtlasEntry
      | ItemAtlasEntry
      | { atlasIndex: number; x: number; y: number; w: number; h: number },
  ): Texture | undefined {
    const atlasCanvas = this.getAtlasCanvas(frame.atlasIndex);
    if (!atlasCanvas?.getTexture()) return undefined;
    return atlasCanvas.getSubTexture(frame.x, frame.y, frame.w, frame.h);
  }

  private getAtlasCanvas(index: number): AtlasCanvas | undefined {
    if (index === STATIC_ATLAS_INDEX) return this.staticAtlas;
    if (index === MAP_ATLAS_INDEX) return this.mapAtlas;
    return this.atlases[index];
  }

  getItem(graphicId: number): ItemAtlasEntry | undefined {
    return this.items.get(graphicId);
  }

  getTile(gfxType: GfxType, graphicId: number): TileAtlasEntry | undefined {
    return this.tiles.get(`${gfxType}:${graphicId}`);
  }

  getNpcFrame(graphicId: number, frame: number): Frame | undefined {
    return this.npcs.get(graphicId)?.frames[frame];
  }

  getCharacterFrame(
    playerId: number,
    frame: CharacterFrame,
  ): Frame | undefined {
    return this.characters.get(playerId)?.frames[frame];
  }

  getStaticEntry(type: StaticAtlasEntryType): TileAtlasEntry | undefined {
    return this.staticEntries.get(type);
  }

  getEmoteFrame(emoteId: number, frameIndex: number): Frame | undefined {
    const slot = this.getEmoteSlot(emoteId);
    return this.emotes.get(slot)?.frames[frameIndex];
  }

  getFaceEmoteFrame(playerId: number, emoteId: number): Frame | undefined {
    const entry = this.faceEmoteEntries.get(`${playerId}:${emoteId}`);
    if (!entry) return undefined;
    return entry.pendingFrame ?? entry.frame;
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
    return this.effects.get(effectId)?.behindFrames[frameIndex];
  }

  getEffectTransparentFrame(
    effectId: number,
    frameIndex: number,
  ): Frame | undefined {
    return this.effects.get(effectId)?.transparentFrames[frameIndex];
  }

  getEffectFrontFrame(effectId: number, frameIndex: number): Frame | undefined {
    return this.effects.get(effectId)?.frontFrames[frameIndex];
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
      const newAtlas = new AtlasCanvas(`atlas-dynamic-${this.atlases.length}`);
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

  private maxDynamicFillRatio(): number {
    let max = 0;
    for (const atlas of this.atlases) {
      const watermark = atlas.skyline.reduce(
        (m, node) => Math.max(m, node.y),
        0,
      );
      max = Math.max(max, watermark / ATLAS_SIZE);
    }
    return max;
  }

  maybeDefrag(): void {
    if (this.pendingDefrag && this.client.usageController.idle) {
      this.defragmentAtlases();
      this.pendingDefrag = false;
    }
  }

  defragmentAtlases() {
    const placeableFrames: {
      atlasIndex: number;
      type: FrameType;
      typeId: number;
      frameIndex: number;
      x: number;
      y: number;
      w: number;
      h: number;
    }[] = [];

    for (const character of this.characters.values()) {
      for (const [index, frame] of character.frames.entries()) {
        if (!frame || frame.atlasIndex === -1) continue;

        placeableFrames.push({
          atlasIndex: frame.atlasIndex,
          type: FrameType.Character,
          typeId: character.playerId,
          frameIndex: index,
          x: frame.x,
          y: frame.y,
          w: frame.w,
          h: frame.h,
        });
      }
    }

    for (const entry of this.faceEmoteEntries.values()) {
      const frame = entry.pendingFrame ?? entry.frame;
      if (frame.atlasIndex === -1) continue;

      placeableFrames.push({
        atlasIndex: frame.atlasIndex,
        type: FrameType.FaceEmote,
        typeId: entry.playerId,
        frameIndex: entry.emoteId,
        x: frame.x,
        y: frame.y,
        w: frame.w,
        h: frame.h,
      });
    }

    for (const npc of this.npcs.values()) {
      for (const [index, frame] of npc.frames.entries()) {
        if (!frame || frame.atlasIndex === -1) {
          continue;
        }

        placeableFrames.push({
          atlasIndex: frame.atlasIndex,
          type: FrameType.Npc,
          typeId: npc.graphicId,
          frameIndex: index,
          x: frame.x,
          y: frame.y,
          w: frame.w,
          h: frame.h,
        });
      }
    }

    for (const item of this.items.values()) {
      if (item.atlasIndex === -1) {
        continue;
      }

      placeableFrames.push({
        atlasIndex: item.atlasIndex,
        type: FrameType.Item,
        typeId: item.graphicId,
        frameIndex: 0,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      });
    }

    placeableFrames.sort((a, b) => b.h - a.h);

    if (!placeableFrames.length) {
      return;
    }

    // Snapshot every atlas canvas BEFORE clearing so we can copy from the
    // original positions even after the destination canvases are wiped.
    const snapshots: HTMLCanvasElement[] = this.atlases.map((atlas) => {
      const snap = document.createElement('canvas');
      snap.width = ATLAS_SIZE;
      snap.height = ATLAS_SIZE;
      snap.getContext('2d')!.drawImage(atlas.getCanvas(), 0, 0);
      return snap;
    });

    for (const atlas of this.atlases) {
      const ctx = atlas.getContext();
      ctx.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
      atlas.skyline = [{ x: 0, y: 0, w: ATLAS_SIZE }];
    }

    for (const placeable of placeableFrames) {
      const rect = this.insert(placeable.w, placeable.h);
      const atlas = this.atlases[placeable.atlasIndex];
      if (!atlas) {
        console.error(
          'Atlas not found for defragmentation',
          placeable.atlasIndex,
        );
        continue;
      }

      const img = snapshots[placeable.atlasIndex];
      if (!img) {
        console.error(
          'Atlas snapshot not found for defragmentation',
          placeable.atlasIndex,
        );
        continue;
      }

      this.ctx.drawImage(
        img,
        placeable.x,
        placeable.y,
        placeable.w,
        placeable.h,
        rect.x,
        rect.y,
        rect.w,
        rect.h,
      );

      switch (placeable.type) {
        case FrameType.Character: {
          const character = this.characters.get(placeable.typeId);
          if (character) {
            const frame = character.frames[placeable.frameIndex];
            frame!.atlasIndex = this.currentAtlasIndex;
            frame!.x = rect.x;
            frame!.y = rect.y;
          }
          break;
        }
        case FrameType.Npc: {
          const npc = this.npcs.get(placeable.typeId);
          if (npc) {
            const frame = npc.frames[placeable.frameIndex];
            frame!.atlasIndex = this.currentAtlasIndex;
            frame!.x = rect.x;
            frame!.y = rect.y;
          }
          break;
        }
        case FrameType.Item: {
          const item = this.items.get(placeable.typeId);

          if (item) {
            item.atlasIndex = this.currentAtlasIndex;
            item.x = rect.x;
            item.y = rect.y;
          }
          break;
        }
        case FrameType.FaceEmote: {
          const entry = this.faceEmoteEntries.get(
            `${placeable.typeId}:${placeable.frameIndex}`,
          );
          if (entry) {
            const frame = entry.pendingFrame ?? entry.frame;
            frame!.atlasIndex = this.currentAtlasIndex;
            frame!.x = rect.x;
            frame!.y = rect.y;
          }
          break;
        }
      }
    }

    for (const atlas of this.atlases) {
      atlas.commit();
    }
  }

  async refreshAsync(): Promise<void> {
    await (this.refresh() ?? Promise.resolve());
  }

  refresh(): Promise<void> | void {
    if (this.loading) return this.loadingPromise ?? undefined;
    this.loading = true;

    this.bmpsToLoad.clear();
    this.pendingBmpPromises = [];

    if (this.mapId !== this.client.mapId) {
      this.tiles.clear();
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
      [...this.characters.values()].some((c) => {
        const f = c.pendingFrames || c.frames;
        return f.some((f) => f && f.atlasIndex === -1);
      })
    ) {
      for (let i = 1; i <= 8; ++i) {
        this.addBmpToLoad(GfxType.SkinSprites, i);
      }
    }

    if (this.bmpsToLoad.size) {
      this.loadingPromise = Promise.all(this.pendingBmpPromises).then(() =>
        this.updateAtlas(),
      );
      return this.loadingPromise;
    }

    // If face emote entries need compositing (no new BMPs needed — face sheet is
    // already cached after the first character composite cycle), trigger updateAtlas directly.
    const hasPendingFaceEmotes = [...this.faceEmoteEntries.values()].some(
      (e) => (e.pendingFrame ?? e.frame).atlasIndex === -1,
    );
    if (hasPendingFaceEmotes) {
      this.loadingPromise = Promise.resolve().then(() => this.updateAtlas());
      return this.loadingPromise;
    }

    this.loading = false;
    this.loadingPromise = null;
  }

  private addBmpToLoad(gfxType: GfxType, id: number) {
    const key = `g:${gfxType}:${id}`;
    if (!this.bmpsToLoad.has(key)) {
      const bmp: Bmp = { gfxType, id, img: null, loaded: false };
      this.bmpsToLoad.set(key, bmp);

      this.pendingBmpPromises.push(
        this.client.gfxLoader
          .loadResource(gfxType, id + 100)
          .then((imageBitmap) => {
            bmp.img = imageBitmap;
            bmp.loaded = true;
          })
          .catch((err) => {
            console.error(`Failed to load gfx ${gfxType}/${id}:`, err);
            bmp.loaded = true;
          }),
      );
    }
  }

  private addBmpToLoadByPath(path: string) {
    const key = `p:${path}`;
    if (!this.bmpsToLoad.has(key)) {
      const bmp: Bmp = { path, img: null, loaded: false };
      this.bmpsToLoad.set(key, bmp);

      this.pendingBmpPromises.push(
        fetch(path)
          .then((r) => r.blob())
          .then((blob) => createImageBitmap(blob))
          .then((imageBitmap) => {
            bmp.img = imageBitmap;
            bmp.loaded = true;
          })
          .catch((err) => {
            console.error(`Failed to load ${path}:`, err);
            bmp.loaded = true;
          }),
      );
    }
  }

  reset() {
    this.characters.clear();
    this.npcs.clear();
    this.items.clear();
    this.faceEmoteEntries.clear();
    this.mapId = this.client.mapId;

    for (const atlas of this.atlases) {
      const ctx = atlas.getContext();
      atlas.skyline = [{ x: 0, y: 0, w: ATLAS_SIZE }];
      ctx.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
    }

    this.currentAtlasIndex = 0;
    this.ctx = this.atlases[0].getContext();

    this.loadMapGraphicLayers();
    this.loadStaticEntries();
    this.loadEmoteEntries();
    this.loadEffectEntries();
  }

  private loadMapGraphicLayers() {
    if (this.tiles.size) {
      return;
    }

    if (this.client.map!.fillTile > 0) {
      this.addBmpToLoad(GfxType.MapTiles, this.client.map!.fillTile);
      const fillKey = `${GfxType.MapTiles}:${this.client.map!.fillTile}`;
      this.tiles.set(fillKey, {
        gfxType: GfxType.MapTiles,
        graphicId: this.client.map!.fillTile,
        atlasIndex: -1,
        x: -1,
        y: -1,
        w: -1,
        h: -1,
        xOffset: 0,
        yOffset: 0,
      });
    }

    for (const [index, layer] of this.client.map!.graphicLayers.entries()) {
      for (const row of layer.graphicRows) {
        for (const tile of row.tiles) {
          if (!tile.graphic) {
            continue;
          }

          const gfxType = LAYER_GFX_MAP[index];
          const tileKey = `${gfxType}:${tile.graphic}`;
          if (!this.tiles.has(tileKey)) {
            this.addBmpToLoad(gfxType, tile.graphic);
            this.tiles.set(tileKey, {
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
              this.client.mapController.getDoor({ x: tile.x, y: row.y })
            ) {
              const doorKey = `${gfxType}:${tile.graphic + 1}`;
              if (!this.tiles.has(doorKey)) {
                this.addBmpToLoad(gfxType, tile.graphic + 1);
                this.tiles.set(doorKey, {
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
    }

    for (const spawn of this.client.map!.npcs) {
      const record = this.client.getEnfRecordById(spawn.id);
      if (!record) {
        continue;
      }

      if (this.npcs.has(record.graphicId)) {
        continue;
      }

      const npc = {
        graphicId: record.graphicId,
        frames: [] as {
          atlasIndex: number;
          x: number;
          y: number;
          w: number;
          h: number;
          xOffset: number;
          yOffset: number;
          mirroredXOffset: number;
        }[],
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

      this.npcs.set(npc.graphicId, npc);
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
    if (this.emotes.size > 0) {
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
      this.emotes.set(i, {
        emoteId: i,
        frames,
      });
    }
  }

  private loadEffectEntries() {
    if (this.effects.size > 0) {
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

      this.effects.set(i, {
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
      const existing = this.characters.get(char.playerId);

      if (existing) {
        existing.tickCount = this.client.tickCount;
      }

      if (!existing || existing.hash !== hash) {
        const neededGfx: Array<{ gfxType: GfxType; graphicId: number }> = [];

        if (char.hairStyle) {
          const baseId = (char.hairStyle - 1) * 40 + char.hairColor * 4;
          const gfxType =
            char.gender === Gender.Female
              ? GfxType.FemaleHair
              : GfxType.MaleHair;

          for (let i = 1; i <= 4; ++i) {
            this.addBmpToLoad(gfxType, baseId + i);
            neededGfx.push({ gfxType, graphicId: baseId + i });
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
            neededGfx.push({ gfxType, graphicId: baseId + i });
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
            neededGfx.push({ gfxType, graphicId: baseId + i });
          }
        }

        if (char.equipment.hat > 0) {
          const baseId = (char.equipment.hat - 1) * 10;
          const gfxType =
            char.gender === Gender.Female ? GfxType.FemaleHat : GfxType.MaleHat;

          this.addBmpToLoad(gfxType, baseId + 1);
          neededGfx.push({ gfxType, graphicId: baseId + 1 });
          this.addBmpToLoad(gfxType, baseId + 3);
          neededGfx.push({ gfxType, graphicId: baseId + 3 });
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
            neededGfx.push({ gfxType, graphicId: baseId + i });
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
            neededGfx.push({ gfxType, graphicId: baseId + i });
          }

          if (meta.slash !== null) {
            this.addBmpToLoad(GfxType.PostLoginUI, 40);
            neededGfx.push({ gfxType: GfxType.PostLoginUI, graphicId: 40 });
          }
        }

        if (existing) {
          existing.hash = hash;
          existing.hairStyle = char.hairStyle;
          existing.hairColor = char.hairColor;
          existing.skin = char.skin;
          existing.gender = char.gender;
          existing.equipment = char.equipment;
          existing.neededGfx = neededGfx;
        }

        // Pre-render face sheet so face emote frames are ready immediately
        this.addBmpToLoad(GfxType.SkinSprites, 8);

        // Pre-create / invalidate face emote entries for all 11 emote types
        const FACE_EMOTE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14];
        for (const emoteId of FACE_EMOTE_IDS) {
          const faceKey = `${char.playerId}:${emoteId}`;
          const existingFace = this.faceEmoteEntries.get(faceKey);
          const blankFrame = () => ({
            atlasIndex: -1 as const,
            x: -1,
            y: -1,
            w: -1,
            h: -1,
            xOffset: 0,
            yOffset: 0,
            mirroredXOffset: 0,
          });
          if (!existingFace) {
            this.faceEmoteEntries.set(faceKey, {
              playerId: char.playerId,
              emoteId,
              characterHash: hash,
              frame: blankFrame(),
            });
          } else {
            // Character appearance changed — re-composite all faces
            existingFace.characterHash = hash;
            existingFace.pendingFrame = blankFrame();
          }
        }

        const frames = [];
        for (let i = 0; i < 22; ++i) {
          if (
            [
              CharacterFrame.ChairDownRight,
              CharacterFrame.ChairUpLeft,
            ].includes(i as CharacterFrame) &&
            !this.client.mapRenderer.hasChairs
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
          existing.pendingFrames = frames;
        } else {
          this.characters.set(char.playerId, {
            playerId: char.playerId,
            gender: char.gender,
            skin: char.skin,
            hairStyle: char.hairStyle,
            hairColor: char.hairColor,
            equipment: char.equipment,
            hash,
            frames,
            tickCount: this.client.tickCount,
            neededGfx,
          });
        }
      }
    }

    for (const [playerId, character] of this.characters) {
      const ticksSinceSeen = this.client.tickCount - character.tickCount;
      if (
        ticksSinceSeen > ATLAS_EXPIRY_TICKS &&
        !this.client.nearby.characters.some((c) => c.playerId === playerId)
      ) {
        this.characters.delete(playerId);
      }
    }

    // Expire face emote entries for characters no longer nearby
    for (const [key, entry] of this.faceEmoteEntries) {
      if (!this.characters.has(entry.playerId)) {
        this.faceEmoteEntries.delete(key);
      }
    }
  }

  private refreshNpcs() {
    for (const npc of this.client.nearby.npcs) {
      const record = this.client.getEnfRecordById(npc.id);
      if (!record) {
        continue;
      }

      const existing = this.npcs.get(record.graphicId);
      if (!existing) {
        const npc = {
          graphicId: record.graphicId,
          frames: [] as (Frame | undefined)[],
          keep: false,
          tickCount: this.client.tickCount,
          size: { w: 0, h: 0 },
        };

        const baseId = (record.graphicId - 1) * 40;
        for (let i = 1; i <= 18; ++i) {
          this.addBmpToLoad(GfxType.NPC, baseId + i);
          npc.frames.push({
            x: -1,
            y: -1,
            w: -1,
            h: -1,
            atlasIndex: -1,
            xOffset: 0,
            yOffset: 0,
            mirroredXOffset: 0,
          });
        }

        this.npcs.set(npc.graphicId, npc);
      } else {
        existing.tickCount = this.client.tickCount;
      }
    }

    for (const [graphicId, npc] of this.npcs) {
      if (npc.keep) {
        continue;
      }

      const ticksSinceSeen = this.client.tickCount - npc.tickCount;
      if (ticksSinceSeen > ATLAS_EXPIRY_TICKS) {
        this.npcs.delete(graphicId);
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
      if (!this.items.has(gfxId)) {
        this.items.set(gfxId, {
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

    const activeGfxIds = new Set<number>();
    for (const it of this.client.nearby.items) {
      const record = this.client.getEifRecordById(it.id);
      if (record) {
        activeGfxIds.add(getItemGraphicId(it.id, record.graphicId, it.amount));
      }
    }
    for (const [graphicId] of this.items) {
      if (!activeGfxIds.has(graphicId)) {
        this.items.delete(graphicId);
      }
    }
  }

  private async updateAtlas(): Promise<void> {
    this.dirtyDynamicAtlasIndices = new Set();
    if (this.maxDynamicFillRatio() >= DEFRAG_FILL_THRESHOLD) {
      this.defragmentAtlases();
      this.pendingDefrag = false;
    } else {
      this.pendingDefrag = true;
    }

    // Build compositor specs and kick off compositing in the worker thread
    // before the main-thread frame-size calculations so they run in parallel.
    const compositorSpecs = this.buildCompositorSpecs();
    const compositePromise =
      compositorSpecs.length > 0
        ? this.compositorClient.compositeCharacterFrames(compositorSpecs)
        : Promise.resolve<CompositeResult[]>([]);

    // Build face emote specs and composite concurrently
    const faceEmoteSpecs = this.buildFaceEmoteSpecs();
    const faceEmotePromise =
      faceEmoteSpecs.length > 0
        ? this.compositorClient.compositeFaceEmotes(faceEmoteSpecs)
        : Promise.resolve<FaceEmoteCompositeResult[]>([]);

    // Run bounds calculation concurrently with character compositing.
    const boundsPromise = this.calculateFrameSizes();

    const [compositeResults, , faceEmoteResults] = await Promise.all([
      compositePromise,
      boundsPromise,
      faceEmotePromise,
    ]);
    this.applyCompositorResults(compositeResults);
    this.applyFaceEmoteResults(faceEmoteResults);

    this.finishUpdatingAtlas();
  }

  private buildCompositorSpecs(): CompositeCharacterSpec[] {
    const specs: CompositeCharacterSpec[] = [];

    for (const character of this.characters.values()) {
      const activeFrames = character.pendingFrames || character.frames;
      if (!activeFrames.some((f) => f && f.atlasIndex === -1)) {
        continue;
      }

      const frameIndices: number[] = [];
      for (const [index, frame] of activeFrames.entries()) {
        if (frame && frame.atlasIndex === -1) {
          frameIndices.push(index);
        }
      }

      const resources: Record<string, RawPixels> = {};

      // Skin sprites are always needed
      for (let i = 1; i <= 8; ++i) {
        const key = `${GfxType.SkinSprites}:${i}`;
        if (!resources[key]) {
          const raw = this.client.gfxLoader.getRawPixels(
            GfxType.SkinSprites,
            i + 100,
          );
          if (raw) resources[key] = raw;
        }
      }

      // Equipment and hair GFX
      for (const { gfxType, graphicId } of character.neededGfx) {
        const key = `${gfxType}:${graphicId}`;
        if (!resources[key]) {
          const raw = this.client.gfxLoader.getRawPixels(
            gfxType,
            graphicId + 100,
          );
          if (raw) resources[key] = raw;
        }
      }

      specs.push({
        playerId: character.playerId,
        gender: character.gender,
        skin: character.skin,
        hairStyle: character.hairStyle,
        hairColor: character.hairColor,
        equipment: {
          armor: character.equipment.armor,
          boots: character.equipment.boots,
          hat: character.equipment.hat,
          shield: character.equipment.shield,
          weapon: character.equipment.weapon,
        },
        frameIndices,
        resources,
      });
    }

    return specs;
  }

  private buildFaceEmoteSpecs(): CompositeFaceEmoteSpec[] {
    const specs: CompositeFaceEmoteSpec[] = [];

    for (const entry of this.faceEmoteEntries.values()) {
      const activeFrame = entry.pendingFrame ?? entry.frame;
      if (activeFrame.atlasIndex !== -1) continue;

      const character = this.characters.get(entry.playerId);
      if (!character) continue;

      const resources: Record<string, import('./compositor.worker').RawPixels> =
        {};

      // Face sheet
      const faceSheetRaw = this.client.gfxLoader.getRawPixels(
        GfxType.SkinSprites,
        8 + 100,
      );
      if (!faceSheetRaw) continue;
      resources[`${GfxType.SkinSprites}:8`] = faceSheetRaw;

      // Hair resources (for hair behind + hair front)
      if (character.hairStyle) {
        const baseId = (character.hairStyle - 1) * 40 + character.hairColor * 4;
        const gfxType =
          character.gender === Gender.Female
            ? GfxType.FemaleHair
            : GfxType.MaleHair;
        for (let i = 1; i <= 4; ++i) {
          const key = `${gfxType}:${baseId + i}`;
          if (!resources[key]) {
            const raw = this.client.gfxLoader.getRawPixels(
              gfxType,
              baseId + i + 100,
            );
            if (raw) resources[key] = raw;
          }
        }
      }

      // Armor resource (StandingDownRight = frame 0 → graphicId = (armor-1)*50 + 1)
      if (character.equipment.armor) {
        const baseId = (character.equipment.armor - 1) * 50;
        const gfxType =
          character.gender === Gender.Female
            ? GfxType.FemaleArmor
            : GfxType.MaleArmor;
        const graphicId = baseId + 1; // StandingDownRight frame
        const key = `${gfxType}:${graphicId}`;
        if (!resources[key]) {
          const raw = this.client.gfxLoader.getRawPixels(
            gfxType,
            graphicId + 100,
          );
          if (raw) resources[key] = raw;
        }
      }

      // Hat resource
      if (character.equipment.hat) {
        const baseId = (character.equipment.hat - 1) * 10;
        const gfxType =
          character.gender === Gender.Female
            ? GfxType.FemaleHat
            : GfxType.MaleHat;
        for (const offset of [1, 3]) {
          const key = `${gfxType}:${baseId + offset}`;
          if (!resources[key]) {
            const raw = this.client.gfxLoader.getRawPixels(
              gfxType,
              baseId + offset + 100,
            );
            if (raw) resources[key] = raw;
          }
        }
      }

      specs.push({
        playerId: entry.playerId,
        emoteId: entry.emoteId,
        gender: character.gender,
        skin: character.skin,
        hairStyle: character.hairStyle,
        hairColor: character.hairColor,
        armor: character.equipment.armor,
        hat: character.equipment.hat,
        resources,
      });
    }

    return specs;
  }

  private applyFaceEmoteResults(results: FaceEmoteCompositeResult[]) {
    this.temporaryFaceEmoteFrames.clear();

    for (const result of results) {
      const entry = this.faceEmoteEntries.get(
        `${result.playerId}:${result.emoteId}`,
      );
      if (!entry) {
        result.bitmap.close();
        continue;
      }

      const activeFrame = entry.pendingFrame ?? entry.frame;
      activeFrame.x = result.x;
      activeFrame.y = result.y;
      activeFrame.w = result.w;
      activeFrame.h = result.h;
      activeFrame.xOffset = result.xOffset;
      activeFrame.yOffset = result.yOffset;
      activeFrame.mirroredXOffset = result.mirroredXOffset;

      this.temporaryFaceEmoteFrames.set(
        `${result.playerId}:${result.emoteId}`,
        {
          playerId: result.playerId,
          emoteId: result.emoteId,
          img: result.bitmap,
        },
      );
    }
  }

  private applyCompositorResults(results: CompositeResult[]) {
    this.temporaryCharacterFrames.clear();

    for (const result of results) {
      const character = this.characters.get(result.playerId);
      if (!character) {
        result.bitmap.close();
        continue;
      }

      const activeFrames = character.pendingFrames || character.frames;
      const frame = activeFrames[result.frameIndex];
      if (!frame) {
        result.bitmap.close();
        continue;
      }

      frame.x = result.x;
      frame.y = result.y;
      frame.w = result.w;
      frame.h = result.h;
      frame.xOffset = result.xOffset;
      frame.yOffset = result.yOffset;
      frame.mirroredXOffset = result.mirroredXOffset;

      this.temporaryCharacterFrames.set(
        `${result.playerId}:${result.frameIndex}`,
        {
          playerId: result.playerId,
          frameIndex: result.frameIndex,
          img: result.bitmap,
          loaded: true,
        },
      );
    }
  }

  private finishUpdatingAtlas() {
    this.placeFrames();
    this.temporaryCharacterFrames.clear();
    this.temporaryFaceEmoteFrames.clear();

    // Swap pending frames → active now that compositing is complete
    for (const character of this.characters.values()) {
      if (character.pendingFrames) {
        character.frames = character.pendingFrames;
        character.pendingFrames = undefined;
      }
    }

    // Swap pending face emote frames
    for (const entry of this.faceEmoteEntries.values()) {
      if (entry.pendingFrame) {
        entry.frame = entry.pendingFrame;
        entry.pendingFrame = undefined;
      }
    }

    // Only commit atlases that were actually written to during placeFrames()
    for (const idx of this.dirtyDynamicAtlasIndices) {
      if (this.atlases[idx]) this.atlases[idx].commit();
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
    this.loadingPromise = null;
    this.bmpsToLoad.clear();
  }

  private placeFrames() {
    const placeableFrames: PlaceableFrame[] = [];
    let sourceX = 0;
    let sourceY = 0;

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

    for (const emote of this.emotes.values()) {
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

    for (const effect of this.effects.values()) {
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

    if (placeableFrames.length) {
      placeableFrames.sort((a, b) => b.h - a.h);
      this.currentAtlasIndex = STATIC_ATLAS_INDEX;
      this.ctx = this.staticAtlas.getContext();
    }

    for (const placeable of placeableFrames) {
      const rect = this.insert(placeable.w, placeable.h);
      let frameImg: ImageBitmap | undefined;

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

          frame.atlasIndex = this.currentAtlasIndex;
          sourceX = frame.x;
          sourceY = frame.y;
          frame.x = rect.x;
          frame.y = rect.y;
          frameImg = bmp;
          break;
        }
        case FrameType.Emote: {
          const emote = this.emotes.get(placeable.typeId);

          if (!emote) {
            continue;
          }

          const frame = emote.frames[placeable.frameIndex];
          const bmp = this.getBmp(GfxType.PostLoginUI, 38);
          if (!bmp) {
            continue;
          }

          frame.atlasIndex = this.currentAtlasIndex;
          sourceX = frame.x;
          sourceY = frame.y;
          frame.x = rect.x;
          frame.y = rect.y;
          frameImg = bmp;
          break;
        }

        case FrameType.EffectBehind:
        case FrameType.EffectTransparent:
        case FrameType.EffectFront: {
          const effect = this.effects.get(placeable.typeId);

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

          frame.atlasIndex = this.currentAtlasIndex;
          sourceX = frame.x;
          sourceY = frame.y;
          frame.x = rect.x;
          frame.y = rect.y;
          frameImg = bmp;
          break;
        }
      }

      if (frameImg) {
        this.ctx.drawImage(
          frameImg,
          sourceX,
          sourceY,
          rect.w,
          rect.h,
          rect.x,
          rect.y,
          rect.w,
          rect.h,
        );
      }
    }

    if (placeableFrames.length) {
      this.staticAtlas.commit();
    }

    placeableFrames.splice(0, placeableFrames.length);

    for (const tile of this.tiles.values()) {
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

    if (placeableFrames.length) {
      placeableFrames.sort((a, b) => b.h - a.h);
      this.currentAtlasIndex = MAP_ATLAS_INDEX;
      this.ctx = this.mapAtlas.getContext();
    }

    for (const placeable of placeableFrames) {
      const rect = this.insert(placeable.w, placeable.h);
      const tile = this.tiles.get(
        `${placeable.typeId}:${placeable.frameIndex}`,
      );
      if (!tile) {
        continue;
      }

      const bmp = this.getBmp(tile.gfxType, tile.graphicId);
      if (!bmp) {
        continue;
      }

      tile.atlasIndex = this.currentAtlasIndex;
      sourceX = tile.x;
      sourceY = tile.y;
      tile.x = rect.x;
      tile.y = rect.y;

      this.ctx.drawImage(
        bmp,
        sourceX,
        sourceY,
        rect.w,
        rect.h,
        rect.x,
        rect.y,
        rect.w,
        rect.h,
      );
    }

    if (placeableFrames.length) {
      this.mapAtlas.commit();
    }

    placeableFrames.splice(0, placeableFrames.length);
    this.currentAtlasIndex = 0;
    this.ctx = this.atlases[0].getContext();

    for (const character of this.characters.values()) {
      const activeFrames = character.pendingFrames || character.frames;
      for (const [index, frame] of activeFrames.entries()) {
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

    for (const npc of this.npcs.values()) {
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

    for (const item of this.items.values()) {
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

    for (const entry of this.faceEmoteEntries.values()) {
      const activeFrame = entry.pendingFrame ?? entry.frame;
      if (activeFrame.atlasIndex !== -1 || activeFrame.w === -1) {
        continue;
      }

      placeableFrames.push({
        type: FrameType.FaceEmote,
        typeId: entry.playerId,
        frameIndex: entry.emoteId,
        w: activeFrame.w,
        h: activeFrame.h,
      });
    }

    placeableFrames.sort((a, b) => b.h - a.h);

    for (const placeable of placeableFrames) {
      const rect = this.insert(placeable.w, placeable.h);
      let frameImg: ImageBitmap | undefined;

      switch (placeable.type) {
        case FrameType.Character: {
          const character = this.characters.get(placeable.typeId);

          if (!character) {
            continue;
          }

          const activeFrames = character.pendingFrames || character.frames;
          const frame = activeFrames[placeable.frameIndex];
          const imgData = this.temporaryCharacterFrames.get(
            `${character.playerId}:${placeable.frameIndex}`,
          );

          if (!imgData) {
            continue;
          }

          frame!.atlasIndex = this.currentAtlasIndex;
          sourceX = frame!.x;
          sourceY = frame!.y;
          frame!.x = rect.x;
          frame!.y = rect.y;
          frameImg = imgData.img!;
          break;
        }
        case FrameType.Npc: {
          const npc = this.npcs.get(placeable.typeId);

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

          frame!.atlasIndex = this.currentAtlasIndex;
          sourceX = frame!.x;
          sourceY = frame!.y;
          frame!.x = rect.x;
          frame!.y = rect.y;
          frameImg = bmp;
          break;
        }
        case FrameType.Item: {
          const item = this.items.get(placeable.typeId);
          if (!item) {
            continue;
          }

          const bmp = this.getBmp(GfxType.Items, placeable.typeId);
          if (!bmp) {
            continue;
          }

          item.atlasIndex = this.currentAtlasIndex;
          sourceX = item.x;
          sourceY = item.y;
          item.x = rect.x;
          item.y = rect.y;
          frameImg = bmp;
          break;
        }
        case FrameType.FaceEmote: {
          const entry = this.faceEmoteEntries.get(
            `${placeable.typeId}:${placeable.frameIndex}`,
          );
          if (!entry) continue;

          const activeFrame = entry.pendingFrame ?? entry.frame;
          const imgData = this.temporaryFaceEmoteFrames.get(
            `${entry.playerId}:${entry.emoteId}`,
          );
          if (!imgData) continue;

          activeFrame.atlasIndex = this.currentAtlasIndex;
          sourceX = activeFrame.x;
          sourceY = activeFrame.y;
          activeFrame.x = rect.x;
          activeFrame.y = rect.y;
          frameImg = imgData.img;
          break;
        }
      }

      if (frameImg) {
        this.ctx.drawImage(
          frameImg,
          sourceX,
          sourceY,
          rect.w,
          rect.h,
          rect.x,
          rect.y,
          rect.w,
          rect.h,
        );
        // Track which dynamic atlases were written to for selective commits
        if (
          this.currentAtlasIndex !== MAP_ATLAS_INDEX &&
          this.currentAtlasIndex !== STATIC_ATLAS_INDEX
        ) {
          this.dirtyDynamicAtlasIndices.add(this.currentAtlasIndex);
        }
      }
    }
  }
  private async calculateFrameSizes(): Promise<void> {
    const requests: BoundsRequest[] = [];
    const applicators = new Map<string, (result: BoundsResult) => void>();
    const postProcessors: Array<() => void> = [];

    // ── Items ───────────────────────────────────────────────────────────────
    for (const item of this.items.values()) {
      if (item.w !== -1) continue;
      const raw = this.client.gfxLoader.getRawPixels(
        GfxType.Items,
        item.graphicId + 100,
      );
      if (!raw) continue;
      const key = `item:${item.graphicId}`;
      requests.push({
        key,
        pixels: raw.pixels,
        width: raw.width,
        height: raw.height,
      });
      applicators.set(key, (result) => {
        if (result.isBlank) return;
        item.xOffset = result.x - (raw.width >> 1);
        item.yOffset = result.y - (raw.height >> 1);
        item.x = result.x;
        item.y = result.y;
        item.w = result.w;
        item.h = result.h;
      });
    }

    // ── NPCs ────────────────────────────────────────────────────────────────
    for (const npc of this.npcs.values()) {
      const baseId = (npc.graphicId - 1) * 40;
      const blankIndices: number[] = [];
      for (const [index, frame] of npc.frames.entries()) {
        if (!frame || frame.w !== -1) continue;
        const raw = this.client.gfxLoader.getRawPixels(
          GfxType.NPC,
          baseId + index + 1 + 100,
        );
        if (!raw) continue;
        const key = `npc:${npc.graphicId}:${index}`;
        const capturedFrame = frame;
        requests.push({
          key,
          pixels: raw.pixels,
          width: raw.width,
          height: raw.height,
          detectBlank: true,
        });
        applicators.set(key, (result) => {
          if (result.isBlank) {
            blankIndices.push(index);
            return;
          }
          capturedFrame.xOffset = result.x - (raw.width >> 1);
          capturedFrame.yOffset = result.y - (raw.height - 23);
          capturedFrame.mirroredXOffset =
            (raw.width >> 1) - (result.x + result.w);
          capturedFrame.x = result.x;
          capturedFrame.y = result.y;
          capturedFrame.w = result.w;
          capturedFrame.h = result.h;
        });
      }
      postProcessors.push(() => {
        for (const i of blankIndices) {
          npc.frames[i] = undefined;
        }
      });
    }

    // ── Tiles (sync, read width/height only) ────────────────────────────────
    for (const tile of this.tiles.values()) {
      this.calculateTileSize(tile);
    }

    // ── Static entries (sync, hardcoded regions) ────────────────────────────
    for (const [id, frame] of this.staticEntries) {
      this.calculateStaticSize(id, frame);
    }

    // ── Emotes ──────────────────────────────────────────────────────────────
    const emoteRaw = this.client.gfxLoader.getRawPixels(
      GfxType.PostLoginUI,
      38 + 100,
    );
    if (emoteRaw) {
      for (const emote of this.emotes.values()) {
        for (const [frameIndex, frame] of emote.frames.entries()) {
          if (frame.w !== -1) continue;
          const key = `emote:${emote.emoteId}:${frameIndex}`;
          // All emote requests share the same pixels object; structured clone
          // deduplicates it so the buffer is only copied once per message.
          requests.push({
            key,
            pixels: emoteRaw.pixels,
            width: emoteRaw.width,
            height: emoteRaw.height,
            cropX: emote.emoteId * 200 + frameIndex * 50,
            cropY: 0,
            cropW: 50,
            cropH: 50,
          });
          applicators.set(key, (result) => {
            if (result.isBlank) return;
            frame.xOffset = result.x - 25;
            frame.yOffset = result.y - 25;
            frame.x = emote.emoteId * 200 + frameIndex * 50 + result.x;
            frame.y = result.y;
            frame.w = result.w;
            frame.h = result.h;
          });
        }
      }
    }

    // ── Effects ─────────────────────────────────────────────────────────────
    for (const effect of this.effects.values()) {
      const meta = this.client.getEffectMetadata(effect.effectId);
      let offset = 1;
      for (const frameArray of [
        effect.behindFrames,
        effect.transparentFrames,
        effect.frontFrames,
      ]) {
        const raw = this.client.gfxLoader.getRawPixels(
          GfxType.Spells,
          (effect.effectId - 1) * 3 + offset + 100,
        );
        if (raw) {
          const frameWidth = Math.floor(raw.width / frameArray.length);
          const blankIndices: number[] = [];
          for (const [frameIndex, frame] of frameArray.entries()) {
            if (!frame || frame.w !== -1) continue;
            const key = `effect:${effect.effectId}:${offset}:${frameIndex}`;
            const capturedFrame = frame;
            const capturedFrameIndex = frameIndex;
            requests.push({
              key,
              pixels: raw.pixels,
              width: raw.width,
              height: raw.height,
              cropX: frameIndex * frameWidth,
              cropY: 0,
              cropW: frameWidth,
              cropH: raw.height,
              detectBlank: true,
            });
            applicators.set(key, (result) => {
              if (result.isBlank) {
                blankIndices.push(capturedFrameIndex);
                return;
              }
              const halfFrameWidth = frameWidth >> 1;
              const additionalOffset = { x: 0, y: 0 };
              if (meta.positionOffsetMetadata) {
                additionalOffset.x +=
                  meta.positionOffsetMetadata.offsetByFrameX[
                    capturedFrameIndex
                  ];
                additionalOffset.y +=
                  meta.positionOffsetMetadata.offsetByFrameY[
                    capturedFrameIndex
                  ];
              }
              if (meta.verticalMetadata) {
                additionalOffset.y +=
                  meta.verticalMetadata.frameOffsetY * capturedFrameIndex;
              }
              capturedFrame.xOffset =
                result.x - halfFrameWidth + additionalOffset.x + meta.offsetX;
              capturedFrame.yOffset =
                result.y -
                (36 + Math.floor((raw.height - 100) >> 1)) +
                additionalOffset.y +
                meta.offsetY;
              capturedFrame.x = result.x + capturedFrameIndex * frameWidth;
              capturedFrame.y = result.y;
              capturedFrame.w = result.w;
              capturedFrame.h = result.h;
            });
          }
          postProcessors.push(() => {
            for (const i of blankIndices) {
              frameArray[i] = undefined!;
            }
          });
        }
        offset++;
      }
    }

    // ── Dispatch to worker and apply results ─────────────────────────────────
    if (requests.length > 0) {
      const results = await this.compositorClient.calculateBounds(requests);
      for (const result of results) {
        applicators.get(result.key)?.(result);
      }
      for (const post of postProcessors) {
        post();
      }
    }
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

  private getBmp(gfxType: GfxType, graphicId: number): ImageBitmap | undefined {
    return this.bmpsToLoad.get(`g:${gfxType}:${graphicId}`)?.img ?? undefined;
  }

  private getBmpByPath(path: string): ImageBitmap | undefined {
    return this.bmpsToLoad.get(`p:${path}`)?.img ?? undefined;
  }
}

function generateCharacterHash(character: CharacterMapInfo) {
  return `${character.skin}${character.gender}${character.hairStyle}${character.hairColor}${character.equipment.armor}${character.equipment.boots}${character.equipment.hat}${character.equipment.shield}${character.equipment.weapon}`;
}
export const HAIR_OFFSETS: Record<
  number,
  Record<number, { x: number; y: number }>
> = {
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
