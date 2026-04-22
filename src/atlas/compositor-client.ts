/**
 * Main-thread client for the atlas compositor worker.
 * Manages the worker lifecycle and serializes compositing requests.
 */

import type { GfxLoader } from '@/gfx';
import { getHatMetadata, getShieldMetaData, getWeaponMetaData } from '@/utils';
import type {
  BoundsRequest,
  BoundsResult,
  CompositeCharacterSpec,
  CompositeFaceEmoteSpec,
  CompositeResult,
  FaceEmoteCompositeResult,
  RawPixels,
} from './compositor.worker';

export type {
  BoundsRequest,
  BoundsResult,
  CompositeFaceEmoteSpec,
  FaceEmoteCompositeResult,
};

type PendingRequest = {
  resolve: (results: CompositeResult[]) => void;
  reject: (err: unknown) => void;
};

type PendingBoundsRequest = {
  resolve: (results: BoundsResult[]) => void;
  reject: (err: unknown) => void;
};

type PendingFaceEmoteRequest = {
  resolve: (results: FaceEmoteCompositeResult[]) => void;
  reject: (err: unknown) => void;
};

export class CompositorClient {
  private worker: Worker;
  private pending = new Map<number, PendingRequest>();
  private pendingBounds = new Map<number, PendingBoundsRequest>();
  private pendingFaceEmotes = new Map<number, PendingFaceEmoteRequest>();
  private nextRequestId = 0;
  private gfxLoader: GfxLoader;

  constructor(gfxLoader: GfxLoader) {
    this.gfxLoader = gfxLoader;
    this.worker = new Worker(
      new URL('./compositor.worker.ts', import.meta.url),
      { type: 'module' },
    );

    this.worker.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (data.type === 'COMPOSITE_RESULT') {
        const pending = this.pending.get(data.requestId);
        if (pending) {
          this.pending.delete(data.requestId);
          pending.resolve(data.results as CompositeResult[]);
        }
      } else if (data.type === 'BOUNDS_RESULT') {
        const pending = this.pendingBounds.get(data.requestId);
        if (pending) {
          this.pendingBounds.delete(data.requestId);
          pending.resolve(data.results as BoundsResult[]);
        }
      } else if (data.type === 'FACE_EMOTE_RESULT') {
        const pending = this.pendingFaceEmotes.get(data.requestId);
        if (pending) {
          this.pendingFaceEmotes.delete(data.requestId);
          pending.resolve(data.results as FaceEmoteCompositeResult[]);
        }
      }
    };

    this.worker.onerror = (err) => {
      console.error('Compositor worker error:', err);
      for (const [id, p] of this.pending) {
        p.reject(err);
        this.pending.delete(id);
      }
      for (const [id, p] of this.pendingBounds) {
        p.reject(err);
        this.pendingBounds.delete(id);
      }
      for (const [id, p] of this.pendingFaceEmotes) {
        p.reject(err);
        this.pendingFaceEmotes.delete(id);
      }
    };

    this.sendInit();
  }

  private sendInit() {
    const hatMeta = getHatMetadata();
    const shieldMeta = getShieldMetaData();
    const weaponMeta = getWeaponMetaData();

    const hatMetadata: Record<number, number> = {};
    for (const [k, v] of hatMeta) hatMetadata[k] = v;

    const shieldMetadata: Record<number, boolean> = {};
    for (const [k, v] of shieldMeta) shieldMetadata[k] = v.back;

    const weaponMetadata: Record<number, { slash: number | null }> = {};
    for (const [k, v] of weaponMeta) weaponMetadata[k] = { slash: v.slash };

    this.worker.postMessage({
      type: 'INIT',
      hatMetadata,
      shieldMetadata,
      weaponMetadata,
    });
  }

  /**
   * Composite character frames off the main thread.
   * @param specs  Characters to composite (resources must be pre-populated).
   */
  compositeCharacterFrames(
    specs: CompositeCharacterSpec[],
  ): Promise<CompositeResult[]> {
    if (specs.length === 0) return Promise.resolve([]);

    return new Promise((resolve, reject) => {
      const requestId = this.nextRequestId++;
      this.pending.set(requestId, { resolve, reject });
      this.worker.postMessage({
        type: 'COMPOSITE',
        requestId,
        characters: specs,
      });
    });
  }

  /**
   * Compute tight alpha bounding boxes off the main thread.
   * Pixel data is cloned into the worker (the gfxLoader cache retains its copy).
   */
  calculateBounds(requests: BoundsRequest[]): Promise<BoundsResult[]> {
    if (requests.length === 0) return Promise.resolve([]);

    return new Promise((resolve, reject) => {
      const requestId = this.nextRequestId++;
      this.pendingBounds.set(requestId, { resolve, reject });
      this.worker.postMessage({
        type: 'CALCULATE_BOUNDS',
        requestId,
        requests,
      });
    });
  }

  /**
   * Build a CompositeCharacterSpec for a single character, collecting the raw
   * pixel data for every GFX resource needed to composite the requested frames.
   * Returns null if any required pixel data is not yet in the GfxLoader cache
   * (caller should ensure all GFX loads have completed before calling this).
   */
  buildSpec(params: {
    playerId: number;
    gender: number;
    skin: number;
    hairStyle: number;
    hairColor: number;
    equipment: {
      armor: number;
      boots: number;
      hat: number;
      shield: number;
      weapon: number;
    };
    frameIndices: number[];
    /** GFX file IDs actually loaded (same entries as bmpsToLoad in atlas) */
    loadedGfx: Array<{ gfxType: number; graphicId: number }>;
  }): CompositeCharacterSpec {
    const resources: Record<string, RawPixels> = {};

    for (const { gfxType, graphicId } of params.loadedGfx) {
      const key = `${gfxType}:${graphicId}`;
      if (!resources[key]) {
        const raw = this.gfxLoader.getRawPixels(gfxType, graphicId + 100);
        if (raw) {
          resources[key] = raw;
        }
      }
    }

    return {
      playerId: params.playerId,
      gender: params.gender,
      skin: params.skin,
      hairStyle: params.hairStyle,
      hairColor: params.hairColor,
      equipment: params.equipment,
      frameIndices: params.frameIndices,
      resources,
    };
  }

  /**
   * Composite face-emote overlay tiles off the main thread.
   */
  compositeFaceEmotes(
    specs: CompositeFaceEmoteSpec[],
  ): Promise<FaceEmoteCompositeResult[]> {
    if (specs.length === 0) return Promise.resolve([]);

    return new Promise((resolve, reject) => {
      const requestId = this.nextRequestId++;
      this.pendingFaceEmotes.set(requestId, { resolve, reject });
      this.worker.postMessage({
        type: 'COMPOSITE_FACE_EMOTE',
        requestId,
        specs,
      });
    });
  }

  destroy() {
    this.worker.terminate();
    this.pending.clear();
    this.pendingBounds.clear();
  }
}
