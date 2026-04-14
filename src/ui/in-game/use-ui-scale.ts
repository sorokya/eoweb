import { useCallback, useState } from 'preact/hooks';

const STORAGE_KEY = 'eoweb:ui-scale';
export const UI_SCALE_OPTIONS = [0.5, 1, 1.5, 2, 3];
const DEFAULT_SCALE_INDEX = 1; // 1x

function readScaleIndex(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_SCALE_INDEX;
    const idx = Number.parseInt(raw, 10);
    if (idx >= 0 && idx < UI_SCALE_OPTIONS.length) return idx;
    return DEFAULT_SCALE_INDEX;
  } catch {
    return DEFAULT_SCALE_INDEX;
  }
}

/** Apply the persisted UI scale to the root font size immediately (call before first render). */
export function applyUiScale(): void {
  const idx = readScaleIndex();
  document.documentElement.style.fontSize = `${16 * UI_SCALE_OPTIONS[idx]}px`;
}

/** Returns [scaleIndex, setScaleIndex]. Changing the index updates localStorage and the root font size. */
export function useUiScale(): [number, (idx: number) => void] {
  const [scaleIndex, setScaleIndex] = useState(readScaleIndex);

  const updateScale = useCallback((idx: number) => {
    setScaleIndex(idx);
    try {
      localStorage.setItem(STORAGE_KEY, String(idx));
    } catch {
      // ignore storage errors
    }
    document.documentElement.style.fontSize = `${16 * UI_SCALE_OPTIONS[idx]}px`;
  }, []);

  return [scaleIndex, updateScale];
}
