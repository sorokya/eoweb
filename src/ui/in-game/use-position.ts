import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

export type Position = { x: number; y: number };

const STORAGE_PREFIX = 'eoweb:pos:';
export const RESET_EVENT = 'eoweb:reset-positions';

function readPosition(key: string): Position | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as Position;
  } catch {
    return null;
  }
}

function writePosition(key: string, pos: Position): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(pos));
  } catch {
    // ignore storage errors
  }
}

export function clearAllPositions(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(k);
    }
  }
  for (const k of keysToRemove) {
    localStorage.removeItem(k);
  }
}

/**
 * Manages a persistent absolute position for a HUD element.
 *
 * - `defaultPos` may be a factory `() => Position` that reads `window.innerWidth/innerHeight`
 *   so the default recalculates correctly on resize.
 * - If the element has no saved (custom) position it will recompute from the factory
 *   on every window resize.
 * - Dispatching `RESET_EVENT` on `window` resets all elements to their defaults.
 */
export function usePosition(
  key: string,
  defaultPos: Position | (() => Position),
): [Position, (pos: Position) => void] {
  const getDefault =
    typeof defaultPos === 'function' ? defaultPos : () => defaultPos;

  const isCustomRef = useRef<boolean>(readPosition(key) !== null);
  const getDefaultRef = useRef(getDefault);
  getDefaultRef.current = getDefault;

  const [pos, setPos] = useState<Position>(
    () => readPosition(key) ?? getDefault(),
  );

  // Recompute on resize if the user has not manually set a position
  useEffect(() => {
    const onResize = () => {
      if (!isCustomRef.current) {
        setPos(getDefaultRef.current());
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Reset to default when a global reset is dispatched
  useEffect(() => {
    const onReset = () => {
      isCustomRef.current = false;
      setPos(getDefaultRef.current());
    };
    window.addEventListener(RESET_EVENT, onReset);
    return () => window.removeEventListener(RESET_EVENT, onReset);
  }, []);

  const updatePos = useCallback(
    (next: Position) => {
      isCustomRef.current = true;
      setPos(next);
      writePosition(key, next);
    },
    [key],
  );

  return [pos, updatePos];
}
