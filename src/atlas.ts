import {
  type CharacterMapInfo,
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
  CHARACTER_RAISED_HAND_WIDTH,
  CHARACTER_RANGE_ATTACK_WIDTH,
  CHARACTER_SIT_CHAIR_HEIGHT,
  CHARACTER_SIT_CHAIR_WIDTH,
  CHARACTER_SIT_GROUND_HEIGHT,
  CHARACTER_SIT_GROUND_WIDTH,
  CHARACTER_WALKING_HEIGHT,
  CHARACTER_WALKING_WIDTH,
  CHARACTER_WIDTH,
} from './consts';
import { GfxType } from './gfx';
import { LAYER_GFX_MAP } from './map';
import { clipHair } from './utils/clip-hair';
import { HatMaskType } from './utils/get-hat-metadata';
import { getItemGraphicId } from './utils/get-item-graphic-id';
import { padWithZeros } from './utils/pad-with-zeros';

const ATLAS_SIZE = 2048;
export const CHARACTER_FRAME_SIZE = 100;
export const HALF_CHARACTER_FRAME_SIZE = CHARACTER_FRAME_SIZE >> 1;

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
  dirty: boolean;
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
  gfxType: GfxType;
  id: number;
  img: HTMLImageElement;
  loaded: boolean;
};

class AtlasCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private img: HTMLImageElement;
  private loaded = false;
  free: Rect[] = [{ x: 0, y: 0, w: ATLAS_SIZE, h: ATLAS_SIZE }];

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

  mergeFreeRects() {
    // Simple O(n^2) merge pass
    for (let i = 0; i < this.free.length; i++) {
      for (let j = i + 1; j < this.free.length; j++) {
        const a = this.free[i];
        const b = this.free[j];

        // Merge vertically
        if (a.x === b.x && a.w === b.w) {
          if (a.y + a.h === b.y) {
            a.h += b.h;
            this.free.splice(j, 1);
            j--;
          } else if (b.y + b.h === a.y) {
            a.y = b.y;
            a.h += b.h;
            this.free.splice(j, 1);
            j--;
          }
        }

        // Merge horizontally
        else if (a.y === b.y && a.h === b.h) {
          if (a.x + a.w === b.x) {
            a.w += b.w;
            this.free.splice(j, 1);
            j--;
          } else if (b.x + b.w === a.x) {
            a.x = b.x;
            a.w += b.w;
            this.free.splice(j, 1);
            j--;
          }
        }
      }
    }
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

export class Atlas {
  private characters: CharacterAtlasEntry[] = [];
  private npcs: NpcAtlasEntry[] = [];
  private items: ItemAtlasEntry[] = [];
  private tiles: TileAtlasEntry[] = [];
  private client: Client;
  private mapId = 0;
  private mapHasChairs = false;
  private bmpsToLoad: Bmp[] = [];
  private loading = false;
  private appended = true;
  private atlases: AtlasCanvas[];
  private currentAtlasIndex = 0;
  private ctx: CanvasRenderingContext2D;
  private staleFrames: Frame[] = [];

  /*
  private mapCanvas: HTMLCanvasElement;
  private mapCtx: CanvasRenderingContext2D;
  private mapRendered = false;
  private mapOriginX = 0;
  */

  private characterCanvas: HTMLCanvasElement;
  private characterCtx: CanvasRenderingContext2D;

  offsetFrame: HTMLSelectElement =
    document.querySelector<HTMLSelectElement>('#offset-frame');
  offsetX: HTMLInputElement =
    document.querySelector<HTMLInputElement>('#offset-x');
  offsetY: HTMLInputElement =
    document.querySelector<HTMLInputElement>('#offset-y');

  constructor(client: Client) {
    this.client = client;
    this.atlases = [new AtlasCanvas()];
    this.ctx = this.atlases[0].getContext();
    this.characterCanvas = document.createElement('canvas');
    this.characterCanvas.width = CHARACTER_FRAME_SIZE;
    this.characterCanvas.height = CHARACTER_FRAME_SIZE;
    this.characterCtx = this.characterCanvas.getContext('2d', {
      willReadFrequently: true,
    });

    /*
    this.mapCanvas = document.createElement('canvas');
    this.mapCtx = this.mapCanvas.getContext('2d');
    */
  }

  /*
  getMapCanvas(): HTMLCanvasElement | undefined {
    if (!this.mapRendered) {
      return;
    }
    return this.mapCanvas;
  }

  getMapOriginX(): number {
    return this.mapOriginX;
  }
  */

  getAtlas(index: number): HTMLImageElement | undefined {
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

  insert(w: number, h: number): Rect {
    let bestIndex = -1;
    let bestArea = Number.POSITIVE_INFINITY;
    let bestAtlasIndex = -1;

    for (const [index, atlas] of this.atlases.entries()) {
      for (let i = 0; i < atlas.free.length; ++i) {
        const rect = atlas.free[i];
        if (w <= rect.w && h <= rect.h) {
          const areaWaste = rect.w * rect.h - w * h;
          if (areaWaste < bestArea) {
            bestArea = areaWaste;
            bestIndex = i;
            bestAtlasIndex = index;
          }
        }
      }
    }

    if (bestIndex === -1) {
      this.atlases.push(new AtlasCanvas());
      this.currentAtlasIndex = this.atlases.length - 1;
      this.ctx = this.atlases[this.currentAtlasIndex].getContext();
      bestIndex = 0;
    } else if (bestAtlasIndex !== this.currentAtlasIndex) {
      this.currentAtlasIndex = bestAtlasIndex;
      this.ctx = this.atlases[this.currentAtlasIndex].getContext();
    }

    const atlas = this.atlases[this.currentAtlasIndex];
    const free = atlas.free[bestIndex];
    const placed = { x: free.x, y: free.y, w, h };

    atlas.free.splice(bestIndex, 1);

    const right = { x: free.x + w, y: free.y, w: free.w - w, h: free.h };
    const bottom = { x: free.x, y: free.y + h, w: w, h: free.h - h };

    if (right.w > 0 && right.h > 0) atlas.free.push(right);
    if (bottom.w > 0 && bottom.h > 0) atlas.free.push(bottom);

    atlas.mergeFreeRects();

    return placed;
  }

  private addStaleFrame(frame: Frame) {
    this.staleFrames.push({ ...frame });
  }

  clearStaleFrames() {
    if (!this.staleFrames.length) return;

    for (const [index, atlas] of this.atlases.entries()) {
      const ctx = atlas.getContext();

      for (const frame of this.staleFrames) {
        if (frame.atlasIndex !== index) continue;
        ctx.clearRect(frame.x, frame.y, frame.w, frame.h);
        atlas.free.push({ x: frame.x, y: frame.y, w: frame.w, h: frame.h });
      }

      atlas.mergeFreeRects();
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
      this.reset();
    }

    this.refreshCharacters();
    this.refreshNpcs();
    this.refreshItems();

    if (this.characters.some((c) => c.dirty)) {
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

  reset() {
    this.characters = [];
    this.npcs = [];
    this.items = [];
    this.tiles = [];
    this.mapId = this.client.mapId;
    //this.mapRendered = false;

    for (const atlas of this.atlases) {
      const ctx = atlas.getContext();
      atlas.free = [{ x: 0, y: 0, w: ATLAS_SIZE, h: ATLAS_SIZE }];
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
  }

  private loadMapGraphicLayers() {
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

          for (let i = 1; i <= 17; ++i) {
            this.addBmpToLoad(gfxType, baseId + i);
          }
        }

        if (existing) {
          existing.hash = hash;
          existing.dirty = true;
          existing.hairStyle = char.hairStyle;
          existing.hairColor = char.hairColor;
          existing.skin = char.skin;
          existing.gender = char.gender;

          for (const frame of existing.frames) {
            if (frame && frame.atlasIndex !== -1) {
              this.addStaleFrame(frame);
            }
          }
        } else {
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

          this.characters.push({
            playerId: char.playerId,
            gender: char.gender,
            skin: char.skin,
            hairStyle: char.hairStyle,
            hairColor: char.hairColor,
            equipment: char.equipment,
            hash,
            dirty: true,
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
          npc.frames.push({ x: -1, y: -1, w: -1, h: -1 });
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

  private async updateAtlas() {
    this.clearStaleFrames();

    /*
    if (!this.mapRendered) {
      this.updateMap();
      this.mapRendered = true;
    }
    */

    this.updateItems();
    this.updateCharacters();
    this.updateNpcs();
    this.updateMapLayers();

    for (const atlas of this.atlases) {
      atlas.commit();
    }

    if (!this.appended) {
      this.appended = true;

      /*
      const h1 = document.createElement('h1');
      h1.innerText = 'Map';
      const mapCanvas = this.getMapCanvas();
      document.body.appendChild(h1);
      document.body.appendChild(mapCanvas);
      */

      for (const atlas of this.atlases) {
        const h1 = document.createElement('h1');
        h1.innerText = `Atlas ${this.atlases.indexOf(atlas)}`;
        const canvas = atlas.getCanvas();
        canvas.classList.add('debug');
        document.body.appendChild(h1);
        document.body.appendChild(canvas);
      }
    }

    this.loading = false;
    this.bmpsToLoad = [];
  }

  private getBmp(
    gfxType: GfxType,
    graphicId: number,
  ): HTMLImageElement | undefined {
    return this.bmpsToLoad.find(
      (bmp) => bmp.gfxType === gfxType && bmp.id === graphicId,
    )?.img;
  }

  private updateItems() {
    const tmpCanvas = document.createElement('canvas');
    const tmpCtx = tmpCanvas.getContext('2d', { willReadFrequently: true });
    for (const item of this.items) {
      if (item.x !== -1) {
        continue;
      }

      const bmp = this.getBmp(GfxType.Items, item.graphicId);
      if (!bmp) {
        continue;
      }

      tmpCanvas.width = bmp.width;
      tmpCanvas.height = bmp.height;
      tmpCtx.clearRect(0, 0, bmp.width, bmp.height);
      tmpCtx.drawImage(bmp, 0, 0, bmp.width, bmp.height);

      const imgData = tmpCtx.getImageData(0, 0, bmp.width, bmp.height);
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

      const placement = this.insert(w, h);
      item.atlasIndex = this.currentAtlasIndex;
      item.x = placement.x;
      item.y = placement.y;
      item.w = w;
      item.h = h;

      this.ctx.drawImage(
        bmp,
        bounds.x,
        bounds.y,
        w,
        h,
        item.x,
        item.y,
        item.w,
        item.h,
      );
    }
  }

  private updateNpcs() {
    const tmpCanvas = document.createElement('canvas');
    const tmpCtx = tmpCanvas.getContext('2d', { willReadFrequently: true });

    for (const npc of this.npcs) {
      const blankIndexes = [];
      for (const [index, frame] of npc.frames.entries()) {
        if (!frame || frame.x !== -1) {
          continue;
        }

        const baseId = (npc.graphicId - 1) * 40;
        const bmp = this.getBmp(GfxType.NPC, baseId + index + 1);
        if (!bmp) {
          continue;
        }

        tmpCanvas.width = bmp.width;
        tmpCanvas.height = bmp.height;
        tmpCtx.clearRect(0, 0, bmp.width, bmp.height);
        tmpCtx.drawImage(bmp, 0, 0, bmp.width, bmp.height);

        // Check if image is blank
        const imgData = tmpCtx.getImageData(0, 0, bmp.width, bmp.height);
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

        const placement = this.insert(w, h);
        frame.atlasIndex = this.currentAtlasIndex;
        frame.x = placement.x;
        frame.y = placement.y;
        frame.w = w;
        frame.h = h;

        this.ctx.drawImage(
          bmp,
          frameBounds.x,
          frameBounds.y,
          w,
          h,
          frame.x,
          frame.y,
          frame.w,
          frame.h,
        );
      }

      // Mark blank frames as undefined
      for (const i of blankIndexes) {
        npc.frames[i] = undefined;
      }
    }
  }

  private updateCharacters() {
    for (const character of this.characters) {
      if (!character.dirty) {
        continue;
      }

      for (const [index, frame] of character.frames.entries()) {
        if (!frame) {
          continue;
        }

        this.characterCtx.clearRect(
          0,
          0,
          CHARACTER_FRAME_SIZE,
          CHARACTER_FRAME_SIZE,
        );

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

        if (maskType !== HatMaskType.HideHair && character.hairStyle) {
          this.renderCharacterHairBehind(
            character.gender,
            character.hairStyle,
            character.hairColor,
            upLeft,
            index,
          );
        }

        /*
        if (character.equipment.shield > 0) {
          const meta = this.client.getShieldMetadata(
            character.equipment.shield,
          );
          if (meta.back && !upLeft) {
            this.renderCharacterBack(
              character.gender,
              character.equipment.shield,
              frame,
              index,
            );
          }
        }
        */

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

        clipHair(
          this.characterCtx,
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

        const imgData = this.characterCtx.getImageData(
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
        const w = frameBounds.maxX - frameBounds.x + 1;
        const h = frameBounds.maxY - frameBounds.y + 1;

        frame.xOffset = frameBounds.x - HALF_CHARACTER_FRAME_SIZE;
        frame.yOffset = frameBounds.y - CHARACTER_FRAME_SIZE;
        frame.mirroredXOffset = HALF_CHARACTER_FRAME_SIZE - (frameBounds.x + w);

        const placement = this.insert(w, h);

        frame.atlasIndex = this.currentAtlasIndex;
        frame.x = placement.x;
        frame.y = placement.y;
        frame.w = w;
        frame.h = h;
        frame.x = placement.x;
        frame.y = placement.y;

        this.ctx.drawImage(
          this.characterCanvas,
          frameBounds.x,
          frameBounds.y,
          w,
          h,
          frame.x,
          frame.y,
          frame.w,
          frame.h,
        );
      }

      character.dirty = false;
    }
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

    this.characterCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
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

    this.characterCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
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

    this.characterCtx.drawImage(
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

    this.characterCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
  }

  private renderCharacterBack(
    gender: Gender,
    back: number,
    frame: CharacterFrame,
  ) {
    const baseGfxId = (back - 1) * 50;
    const graphicId =
      baseGfxId +
      ([
        CharacterFrame.MeleeAttackDownRight1,
        CharacterFrame.MeleeAttackDownRight2,
        CharacterFrame.RaisedHandDownRight,
      ].includes(frame)
        ? 3
        : 1);

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

    let offset = { x: 0, y: 0 };
    const selectedFrame = Number.parseInt(
      this.offsetFrame.value,
      10,
    ) as CharacterFrame;
    if (selectedFrame === frame) {
      const offsetX = Number.parseInt(this.offsetX.value, 10) || 0;
      const offsetY = Number.parseInt(this.offsetY.value, 10) || 0;
      offset = { x: offsetX, y: offsetY };
    } else {
      offset = BACK_OFFSETS[gender][frame];
    }

    const destX = HALF_CHARACTER_FRAME_SIZE - (bmp.width >> 1) + offset.x;
    const destY = HALF_CHARACTER_FRAME_SIZE - (bmp.height >> 1) + offset.y;

    this.characterCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
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

    this.characterCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
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

    this.characterCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
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
          w: CHARACTER_RAISED_HAND_WIDTH,
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

  private updateMapLayers() {
    //const tilesToRemove: number[] = [];
    for (const [_index, tile] of this.tiles.entries()) {
      if (tile.x !== -1) {
        continue;
      }

      const bmp = this.getBmp(tile.gfxType, tile.graphicId);
      if (!bmp) {
        continue;
      }

      /*
      if (tile.gfxType === GfxType.Shadows || (tile.gfxType === GfxType.MapTiles && bmp.width === TILE_WIDTH)) {
        const usedInTop = this.client.map.graphicLayers[Layer.Top]?.graphicRows.some((row) =>
          row.tiles.some((t) => t.graphic === tile.graphicId)
        );
        if (!usedInTop) {
          tilesToRemove.push(index);
          continue;
        }
      }
      */

      const placement = this.insert(bmp.width, bmp.height);
      tile.atlasIndex = this.currentAtlasIndex;
      tile.x = placement.x;
      tile.y = placement.y;
      tile.w = bmp.width;
      tile.h = bmp.height;

      this.ctx.drawImage(bmp, tile.x, tile.y, tile.w, tile.h);
    }

    // Remove any tiles that don't need to be in the atlas
    /*
    for (let i = tilesToRemove.length - 1; i >= 0; --i) {
      this.tiles.splice(tilesToRemove[i], 1);
    }
    */
  }

  /*
  private updateMap() {
    const map = this.client.map;
    this.mapCanvas.width = (map.width + 1 + map.height + 1) * HALF_TILE_WIDTH;
    this.mapCanvas.height = (map.width + 1 + map.height + 1) * HALF_TILE_HEIGHT;
    const offsetX = map.height < map.width ? (((map.width - map.height) * HALF_TILE_WIDTH) >> 1) :
      (((map.height - map.width) * HALF_TILE_WIDTH) >> 1);
    //const offsetX = (this.mapCanvas.width >> 1) - ((map.width + 1) * HALF_TILE_WIDTH >> 1);


    this.mapCtx.clearRect(
      0,
      0,
      this.mapCanvas.width,
      this.mapCanvas.height,
    );

    const HALF_MAP_WIDTH = this.mapCanvas.width >> 1;

    for (const layer of [Layer.Ground, Layer.Shadow]) {
      const gfxLayer = map.graphicLayers[layer]
      if (!gfxLayer) {
        continue;
      }

      if (layer === Layer.Shadow) {
        this.mapCtx.globalAlpha = 0.2;
      } else {
        this.mapCtx.globalAlpha = 1.0;
      }

      for (let y = 0; y <= map.height; ++y) {
        const row = gfxLayer.graphicRows.find((r) => r.y === y);
        for (let x = 0; x <= map.width; ++x) {
          const tile = row?.tiles.find((t) => t.x === x);
          if (tile && tile.graphic === 0) {
            continue;
          }

          const graphicId = tile?.graphic ? tile.graphic : layer === Layer.Ground && map.fillTile ? map.fillTile : 0;
          if (graphicId === 0) {
            continue;
          }

          const bmp = this.getBmp(LAYER_GFX_MAP[layer], graphicId);
          if (!bmp) {
            console.error(`Missing map tile: ${graphicId} (layer ${Layer[layer]})`);
            continue;
          }

          // Skip animated ground tiles
          if (layer === Layer.Ground && bmp.width > TILE_WIDTH) {
            continue;
          }

          const tileScreen = isoToScreen({ x: x, y: y });
          const offset = layer === Layer.Ground ? { x: 0, y: 0 } : { x: -24, y: -12 };
          const screenX = Math.floor(
            tileScreen.x - HALF_TILE_WIDTH + HALF_MAP_WIDTH + offset.x + offsetX
          );
          const screenY = Math.floor(
            tileScreen.y + offset.y
          );

          if (x === 0 && y === 0) {
            this.mapOriginX = screenX;
          }

          this.mapCtx.drawImage(bmp, screenX, screenY, bmp.width, bmp.height);
        }
      }
    }
  }
    */
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
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 1, y: -12 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -3, y: -11 },
    [CharacterFrame.RaisedHandDownRight]: { x: -1, y: -12 },
    [CharacterFrame.RaisedHandUpLeft]: { x: -1, y: -12 },
    [CharacterFrame.ChairDownRight]: { x: 2, y: -13 },
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
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -3, y: -11 },
    [CharacterFrame.RaisedHandDownRight]: { x: -1, y: -12 },
    [CharacterFrame.RaisedHandUpLeft]: { x: -1, y: -12 },
    [CharacterFrame.ChairDownRight]: { x: 2, y: -13 },
    [CharacterFrame.ChairUpLeft]: { x: 2, y: -13 },
    [CharacterFrame.FloorDownRight]: { x: 2, y: -7 },
    [CharacterFrame.FloorUpLeft]: { x: 4, y: -7 },
    [CharacterFrame.RangeAttackDownRight]: { x: 4, y: -15 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 2, y: -14 },
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
    [CharacterFrame.RaisedHandDownRight]: { x: 0, y: 22 },
    [CharacterFrame.RaisedHandUpLeft]: { x: 0, y: 23 },
    [CharacterFrame.ChairDownRight]: { x: 2, y: 15 },
    [CharacterFrame.ChairUpLeft]: { x: 3, y: 8 },
    [CharacterFrame.FloorDownRight]: { x: 2, y: 12 },
    [CharacterFrame.FloorUpLeft]: { x: 4, y: 6 },
    [CharacterFrame.RangeAttackDownRight]: { x: 2, y: 21 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 2, y: 21 },
  },
  [Gender.Male]: {
    [CharacterFrame.StandingDownRight]: { x: 0, y: 21 },
    [CharacterFrame.StandingUpLeft]: { x: 0, y: 21 },
    [CharacterFrame.WalkingDownRight1]: { x: 0, y: 19 },
    [CharacterFrame.WalkingDownRight2]: { x: 0, y: 19 },
    [CharacterFrame.WalkingDownRight3]: { x: 0, y: 19 },
    [CharacterFrame.WalkingDownRight4]: { x: 0, y: 19 },
    [CharacterFrame.WalkingUpLeft1]: { x: 0, y: 19 },
    [CharacterFrame.WalkingUpLeft2]: { x: 0, y: 19 },
    [CharacterFrame.WalkingUpLeft3]: { x: 0, y: 19 },
    [CharacterFrame.WalkingUpLeft4]: { x: 0, y: 19 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 2, y: 19 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -2, y: 19 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 2, y: 20 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -2, y: 19 },
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
    [CharacterFrame.MeleeAttackDownRight1]: { x: 1, y: -4 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -1, y: -4 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 1, y: -4 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -1, y: -4 },
    [CharacterFrame.RaisedHandDownRight]: { x: 0, y: -2 },
    [CharacterFrame.RaisedHandUpLeft]: { x: 0, y: -2 },
    [CharacterFrame.ChairDownRight]: { x: 2, y: -9 },
    [CharacterFrame.ChairUpLeft]: { x: 3, y: -9 },
    [CharacterFrame.FloorDownRight]: { x: 1, y: -4 },
    [CharacterFrame.FloorUpLeft]: { x: 3, y: -4 },
    [CharacterFrame.RangeAttackDownRight]: { x: 1, y: -4 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 1, y: -4 },
  },
  [Gender.Male]: {
    [CharacterFrame.StandingDownRight]: { x: 0, y: -5 },
    [CharacterFrame.StandingUpLeft]: { x: 0, y: -5 },
    [CharacterFrame.WalkingDownRight1]: { x: 1, y: -6 },
    [CharacterFrame.WalkingDownRight2]: { x: 1, y: -6 },
    [CharacterFrame.WalkingDownRight3]: { x: 1, y: -6 },
    [CharacterFrame.WalkingDownRight4]: { x: 1, y: -6 },
    [CharacterFrame.WalkingUpLeft1]: { x: 0, y: -5 },
    [CharacterFrame.WalkingUpLeft2]: { x: 0, y: -5 },
    [CharacterFrame.WalkingUpLeft3]: { x: 0, y: -5 },
    [CharacterFrame.WalkingUpLeft4]: { x: 0, y: -5 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 1, y: -5 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -1, y: -5 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 2, y: -5 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -1, y: -5 },
    [CharacterFrame.RaisedHandDownRight]: { x: 0, y: -3 },
    [CharacterFrame.RaisedHandUpLeft]: { x: 0, y: -3 },
    [CharacterFrame.ChairDownRight]: { x: 3, y: -7 },
    [CharacterFrame.ChairUpLeft]: { x: 3, y: -7 },
    [CharacterFrame.FloorDownRight]: { x: 3, y: -3 },
    [CharacterFrame.FloorUpLeft]: { x: 3, y: -3 },
    [CharacterFrame.RangeAttackDownRight]: { x: 2, y: -5 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 2, y: -5 },
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
    [CharacterFrame.WalkingDownRight1]: { x: 0, y: 22 },
    [CharacterFrame.WalkingDownRight2]: { x: 0, y: 22 },
    [CharacterFrame.WalkingDownRight3]: { x: 0, y: 22 },
    [CharacterFrame.WalkingDownRight4]: { x: 0, y: 22 },
    [CharacterFrame.WalkingUpLeft1]: { x: 0, y: 22 },
    [CharacterFrame.WalkingUpLeft2]: { x: 0, y: 22 },
    [CharacterFrame.WalkingUpLeft3]: { x: 0, y: 22 },
    [CharacterFrame.WalkingUpLeft4]: { x: 0, y: 22 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 1, y: 22 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -3, y: 27 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 1, y: 22 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -3, y: 23 },
    [CharacterFrame.RaisedHandDownRight]: { x: 0, y: 24 },
    [CharacterFrame.RaisedHandUpLeft]: { x: 0, y: 24 },
    [CharacterFrame.ChairDownRight]: { x: 3, y: 25 },
    [CharacterFrame.ChairUpLeft]: { x: 3, y: 25 },
    [CharacterFrame.FloorDownRight]: { x: 2, y: 30 },
    [CharacterFrame.FloorUpLeft]: { x: 6, y: 30 },
    [CharacterFrame.RangeAttackDownRight]: { x: 5, y: 22 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 3, y: 22 },
  },
};

const BACK_OFFSETS = {
  [Gender.Female]: {
    [CharacterFrame.StandingDownRight]: { x: 0, y: -32 },
    [CharacterFrame.StandingUpLeft]: { x: 0, y: -32 },
    [CharacterFrame.WalkingDownRight1]: { x: 0, y: -32 },
    [CharacterFrame.WalkingDownRight2]: { x: 0, y: -32 },
    [CharacterFrame.WalkingDownRight3]: { x: 0, y: -32 },
    [CharacterFrame.WalkingDownRight4]: { x: 0, y: -32 },
    [CharacterFrame.WalkingUpLeft1]: { x: 0, y: -32 },
    [CharacterFrame.WalkingUpLeft2]: { x: 0, y: -32 },
    [CharacterFrame.WalkingUpLeft3]: { x: 0, y: -32 },
    [CharacterFrame.WalkingUpLeft4]: { x: 0, y: -32 },
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
    [CharacterFrame.WalkingDownRight1]: { x: 0, y: 22 },
    [CharacterFrame.WalkingDownRight2]: { x: 0, y: 22 },
    [CharacterFrame.WalkingDownRight3]: { x: 0, y: 22 },
    [CharacterFrame.WalkingDownRight4]: { x: 0, y: 22 },
    [CharacterFrame.WalkingUpLeft1]: { x: 0, y: 22 },
    [CharacterFrame.WalkingUpLeft2]: { x: 0, y: 22 },
    [CharacterFrame.WalkingUpLeft3]: { x: 0, y: 22 },
    [CharacterFrame.WalkingUpLeft4]: { x: 0, y: 22 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 1, y: 22 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -3, y: 27 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 1, y: 22 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -3, y: 23 },
    [CharacterFrame.RaisedHandDownRight]: { x: 0, y: 24 },
    [CharacterFrame.RaisedHandUpLeft]: { x: 0, y: 24 },
    [CharacterFrame.ChairDownRight]: { x: 3, y: 25 },
    [CharacterFrame.ChairUpLeft]: { x: 3, y: 25 },
    [CharacterFrame.FloorDownRight]: { x: 2, y: 30 },
    [CharacterFrame.FloorUpLeft]: { x: 6, y: 30 },
    [CharacterFrame.RangeAttackDownRight]: { x: 5, y: 22 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 3, y: 22 },
  },
};
