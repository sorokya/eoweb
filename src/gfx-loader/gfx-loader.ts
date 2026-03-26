import { LoadType } from './load-type';
import type { ResourceInfo } from './pe-reader';

interface PendingPromise<T> {
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  promise: Promise<T>;
}

function createPendingPromise<T>(): PendingPromise<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { resolve, reject, promise };
}

const LRU_MAX_SIZE = 500;

export class GfxLoader {
  private worker: Worker;
  private egfs: Map<number, Map<number, ResourceInfo>> = new Map();
  private pendingEGFs: Map<number, PendingPromise<Map<number, ResourceInfo>>> =
    new Map();
  private pendingResources: Map<
    string,
    PendingPromise<{ pixels: ArrayBuffer; width: number; height: number }>
  > = new Map();

  // LRU in-memory cache: key = "fileID:resourceID"
  private bitmapCache: Map<string, ImageBitmap> = new Map();

  private batchPromises: Map<number, PendingPromise<void>> = new Map();
  private batchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.worker = new Worker(
      new URL('./gfx-loader.worker.ts', import.meta.url),
      { type: 'module' },
    );

    this.worker.onmessage = (event: MessageEvent) => {
      const data = event.data;
      switch (data.loadType) {
        case LoadType.DIB:
          this.handleDIBMessage(data);
          break;
        case LoadType.EGF:
          this.handleEGFMessage(data);
          break;
        default:
          console.error(`Unhandled LoadType: ${data.loadType}`);
      }
    };

    this.worker.onerror = (error) => {
      console.error('GFX Worker error:', error);
    };
  }

  private handleDIBMessage(data: {
    fileID: number;
    resourceID: number;
    pixels?: ArrayBuffer;
    width?: number;
    height?: number;
    error?: string;
  }) {
    const key = `${data.fileID}:${data.resourceID}`;
    const pending = this.pendingResources.get(key);
    if (pending) {
      this.pendingResources.delete(key);
      if (data.error) {
        pending.reject(data.error);
      } else {
        pending.resolve({
          pixels: data.pixels!,
          width: data.width!,
          height: data.height!,
        });
      }
    }
  }

  private handleEGFMessage(data: {
    fileID: number;
    resourceInfo?: Map<number, ResourceInfo>;
    error?: string;
  }) {
    const pending = this.pendingEGFs.get(data.fileID);
    if (pending) {
      this.pendingEGFs.delete(data.fileID);
      if (data.error) {
        pending.reject(data.error);
      } else {
        pending.resolve(data.resourceInfo!);
      }
    }
  }

  private async fetchEGF(fileID: number): Promise<ArrayBuffer> {
    const url = `/gfx/gfx${String(fileID).padStart(3, '0')}.egf`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
    }

    return response.arrayBuffer();
  }

  async loadEGFs(fileIDs: number[]): Promise<void> {
    await Promise.all(fileIDs.map((id) => this.loadEGF(id)));
  }

  private scheduleBatchEGF(fileID: number): Promise<void> {
    if (this.egfs.has(fileID)) return Promise.resolve();

    if (this.batchPromises.has(fileID)) {
      return this.batchPromises.get(fileID)!.promise;
    }

    const pending = createPendingPromise<void>();
    this.batchPromises.set(fileID, pending);

    if (this.batchTimer === null) {
      this.batchTimer = setTimeout(() => {
        this.batchTimer = null;
        const entries = [...this.batchPromises.entries()];
        this.batchPromises.clear();
        Promise.all(
          entries.map(([id, p]) =>
            this.loadEGF(id).then(
              () => p.resolve(),
              (err) => p.reject(err),
            ),
          ),
        );
      }, 100);
    }

    return pending.promise;
  }

  async loadEGF(fileID: number): Promise<void> {
    if (this.egfs.has(fileID)) return;
    if (this.pendingEGFs.has(fileID)) {
      await this.pendingEGFs.get(fileID)?.promise;
      return;
    }

    const pending = createPendingPromise<Map<number, ResourceInfo>>();
    this.pendingEGFs.set(fileID, pending);

    const buffer = await this.fetchEGF(fileID);

    this.worker.postMessage({ loadType: LoadType.EGF, buffer, fileID }, [
      buffer,
    ]);

    const resourceInfo = await pending.promise;
    this.egfs.set(fileID, resourceInfo);
  }

  async loadResource(fileID: number, resourceID: number): Promise<ImageBitmap> {
    const cacheKey = `${fileID}:${resourceID}`;

    // Tier 2: in-memory LRU
    if (this.bitmapCache.has(cacheKey)) {
      // Move to end (most recently used)
      const bm = this.bitmapCache.get(cacheKey)!;
      this.bitmapCache.delete(cacheKey);
      this.bitmapCache.set(cacheKey, bm);
      return bm;
    }

    if (!this.egfs.has(fileID)) {
      await this.scheduleBatchEGF(fileID);
    }

    if (this.pendingResources.has(cacheKey)) {
      const result = await this.pendingResources.get(cacheKey)!.promise;
      return this.toImageBitmap(cacheKey, result);
    }

    const pending = createPendingPromise<{
      pixels: ArrayBuffer;
      width: number;
      height: number;
    }>();
    this.pendingResources.set(cacheKey, pending);

    this.worker.postMessage({
      loadType: LoadType.DIB,
      fileID,
      resourceID,
    });

    const result = await pending.promise;
    return this.toImageBitmap(cacheKey, result);
  }

  private async toImageBitmap(
    cacheKey: string,
    result: { pixels: ArrayBuffer; width: number; height: number },
  ): Promise<ImageBitmap> {
    const imageData = new ImageData(
      new Uint8ClampedArray(result.pixels),
      result.width,
      result.height,
    );
    const bm = await createImageBitmap(imageData);

    // LRU eviction
    if (this.bitmapCache.size >= LRU_MAX_SIZE) {
      const firstKey = this.bitmapCache.keys().next().value as string;
      this.bitmapCache.get(firstKey)?.close();
      this.bitmapCache.delete(firstKey);
    }

    this.bitmapCache.set(cacheKey, bm);
    return bm;
  }

  destroy() {
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.worker.terminate();
    for (const bm of this.bitmapCache.values()) {
      bm.close();
    }
    this.bitmapCache.clear();
    this.egfs.clear();
    this.pendingEGFs.clear();
    this.pendingResources.clear();
  }
}
