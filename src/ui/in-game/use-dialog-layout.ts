import { useCallback, useEffect, useState } from 'preact/hooks';
import { RESET_EVENT } from './use-position';
import type { DialogId } from './window-manager';

export type DialogLayout = 'center' | 'bottom-left' | 'manual';

const STORAGE_PREFIX = 'eoweb:layout:dialog:';

function defaultLayoutForId(id: string): DialogLayout {
  if (id === 'chat') return 'bottom-left';
  return 'center';
}

function readDialogLayout(id: string): DialogLayout | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id);
    if (raw === 'center' || raw === 'bottom-left' || raw === 'manual')
      return raw;
    return null;
  } catch {
    return null;
  }
}

function writeDialogLayout(id: string, layout: DialogLayout): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + id, layout);
  } catch {
    // ignore storage errors
  }
}

/** Read a dialog's saved layout preference (falls back to default). */
export function getDialogLayoutById(id: DialogId): DialogLayout {
  return readDialogLayout(id) ?? defaultLayoutForId(id);
}

export function clearAllDialogLayouts(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(STORAGE_PREFIX)) keysToRemove.push(k);
  }
  for (const k of keysToRemove) localStorage.removeItem(k);
}

export function useDialogLayout(
  id: DialogId,
): [DialogLayout, (layout: DialogLayout) => void] {
  const defaultLayout = defaultLayoutForId(id);

  const [layout, setLayout] = useState<DialogLayout>(
    () => readDialogLayout(id) ?? defaultLayout,
  );

  useEffect(() => {
    const onReset = () => setLayout(defaultLayout);
    window.addEventListener(RESET_EVENT, onReset);
    return () => window.removeEventListener(RESET_EVENT, onReset);
  }, [defaultLayout]);

  const updateLayout = useCallback(
    (next: DialogLayout) => {
      setLayout(next);
      writeDialogLayout(id, next);
    },
    [id],
  );

  return [layout, updateLayout];
}
