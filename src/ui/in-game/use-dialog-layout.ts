import type { DialogId } from './window-manager';

export type DialogLayout = 'center' | 'manual';

const STORAGE_PREFIX = 'eoweb:layout:dialog:';

function readDialogLayout(id: string): DialogLayout | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id);
    if (raw === 'center' || raw === 'manual') return raw;
    return null;
  } catch {
    return null;
  }
}

/** Read a dialog's saved layout preference (falls back to 'center'). */
export function getDialogLayoutById(id: DialogId): DialogLayout {
  return readDialogLayout(id) ?? 'center';
}

export function clearAllDialogLayouts(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(STORAGE_PREFIX)) keysToRemove.push(k);
  }
  for (const k of keysToRemove) localStorage.removeItem(k);
}
