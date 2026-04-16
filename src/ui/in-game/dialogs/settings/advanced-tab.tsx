import { useCallback, useEffect, useState } from 'preact/hooks';
import { useLocale } from '@/ui/context';

type StorageInfo = {
  localStorageBytes: number;
  idbBytes: number | null;
  idbSupported: boolean;
};

async function estimateStorage(): Promise<StorageInfo> {
  // Count localStorage bytes
  let lsBytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) ?? '';
    lsBytes += key.length + (localStorage.getItem(key)?.length ?? 0);
  }

  // Try the Storage API for IndexedDB estimate
  let idbBytes: number | null = null;
  let idbSupported = false;
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    idbSupported = true;
    try {
      const estimate = await navigator.storage.estimate();
      // usage includes IDB + cache; subtract localStorage approximation
      idbBytes = (estimate.usage ?? 0) - lsBytes * 2;
    } catch {
      // ignore
    }
  }

  return { localStorageBytes: lsBytes * 2, idbBytes, idbSupported };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function clearAllCache(): Promise<void> {
  // Delete IndexedDB database
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('db');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve(); // blocked but proceed
  });

  // Clear all eoweb localStorage keys except the main config (user may want to keep settings)
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('eoweb:') && !key.startsWith('eoweb:config')) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

export function AdvancedTab() {
  const { locale } = useLocale();
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  const refresh = useCallback(() => {
    estimateStorage().then(setStorage);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleClear = useCallback(async () => {
    if (!window.confirm(locale.settingsAdvancedClearConfirm)) {
      return;
    }
    setClearing(true);
    try {
      await clearAllCache();
      setCleared(true);
      await refresh();
    } finally {
      setClearing(false);
    }
  }, [locale, refresh]);

  return (
    <div class='flex flex-col gap-4 p-2'>
      <div class='flex flex-col gap-2'>
        <p class='font-semibold text-sm opacity-70'>
          {locale.settingsAdvancedStorage}
        </p>
        {storage === null ? (
          <span class='loading loading-sm' />
        ) : (
          <div class='rounded-box bg-base-300 p-3 text-xs'>
            <div class='flex justify-between py-0.5'>
              <span class='opacity-70'>
                {locale.settingsAdvancedLocalStorage}
              </span>
              <span class='font-mono'>
                {formatBytes(storage.localStorageBytes)}
              </span>
            </div>
            {storage.idbSupported && (
              <div class='flex justify-between py-0.5'>
                <span class='opacity-70'>
                  {locale.settingsAdvancedIndexedDB}
                </span>
                <span class='font-mono'>
                  {storage.idbBytes !== null
                    ? formatBytes(Math.max(0, storage.idbBytes))
                    : '—'}
                </span>
              </div>
            )}
          </div>
        )}
        <button
          type='button'
          class='btn btn-xs btn-ghost self-start'
          onClick={refresh}
        >
          {locale.settingsAdvancedRefresh}
        </button>
      </div>

      <div class='divider my-0' />

      <div class='flex flex-col gap-2'>
        <p class='text-xs opacity-50'>{locale.settingsAdvancedClearHint}</p>
        {cleared && (
          <div class='alert alert-success py-2 text-xs'>
            {locale.settingsAdvancedCleared}
          </div>
        )}
        <button
          type='button'
          class='btn btn-error btn-sm w-full'
          onClick={handleClear}
          disabled={clearing}
        >
          {clearing ? (
            <span class='loading loading-xs' />
          ) : (
            locale.settingsAdvancedClearCache
          )}
        </button>
      </div>
    </div>
  );
}
