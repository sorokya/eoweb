/**
 * Main-thread client for the atlas compositor worker.
 * Manages the worker lifecycle and serializes compositing requests.
 */

import type { GfxLoader } from '@/gfx';
import { getHatMetadata, getShieldMetaData, getWeaponMetaData } from '@/utils';
import type {
  CompositeCharacterSpec,
  CompositeResult,
  RawPixels,
} from './compositor.worker';

type PendingRequest = {
  resolve: (results: CompositeResult[]) => void;
  reject: (err: unknown) => void;
};

export class CompositorClient {
  private worker: Worker;
  private pending = new Map<number, PendingRequest>();
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
      }
    };

    this.worker.onerror = (err) => {
      console.error('Compositor worker error:', err);
      for (const [id, p] of this.pending) {
        p.reject(err);
        this.pending.delete(id);
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

  destroy() {
    this.worker.terminate();
    this.pending.clear();
  }
}
