import { useCallback, useEffect, useState } from 'preact/hooks';
import { isMobile } from '@/utils';

export type HudVisibility = 'auto' | 'always' | 'never';

const STORAGE_PREFIX = 'eoweb:vis:';

// Module-level subscriber map so all hook instances for the same key stay in sync.
const subscribers = new Map<string, Set<(v: HudVisibility) => void>>();

function notify(key: string, vis: HudVisibility): void {
  subscribers.get(key)?.forEach((fn) => {
    fn(vis);
  });
}

function readVisibility(key: string): HudVisibility | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === 'auto' || raw === 'always' || raw === 'never') return raw;
    return null;
  } catch {
    return null;
  }
}

function writeVisibility(key: string, vis: HudVisibility): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, vis);
  } catch {
    // ignore storage errors
  }
}

export function clearAllVisibilityOverrides(): void {
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

type HudAutoDefaults = {
  /** Whether this element is visible by default on mobile screens */
  mobile: boolean;
  /** Whether this element is visible by default on desktop screens */
  desktop: boolean;
};

/**
 * Manages per-HUD-element visibility with user override support.
 *
 * `auto` → visible based on screen size using the provided defaults.
 * `always` → always visible regardless of screen size.
 * `never` → always hidden regardless of screen size.
 *
 * Persisted in localStorage at `eoweb:vis:<key>`.
 * All hook instances sharing the same key stay in sync without a page reload.
 */
export function useHudVisibility(
  key: string,
  autoDefaults: HudAutoDefaults,
): [boolean, HudVisibility, (vis: HudVisibility) => void] {
  const [visibility, setVisibility] = useState<HudVisibility>(
    () => readVisibility(key) ?? 'auto',
  );

  // Register/unregister this instance as a subscriber for the key.
  useEffect(() => {
    if (!subscribers.has(key)) subscribers.set(key, new Set());
    subscribers.get(key)!.add(setVisibility);
    return () => {
      subscribers.get(key)?.delete(setVisibility);
    };
  }, [key]);

  const updateVisibility = useCallback(
    (next: HudVisibility) => {
      writeVisibility(key, next);
      notify(key, next);
    },
    [key],
  );

  let isVisible: boolean;
  if (visibility === 'always') {
    isVisible = true;
  } else if (visibility === 'never') {
    isVisible = false;
  } else {
    // auto — use screen-size defaults
    isVisible = isMobile() ? autoDefaults.mobile : autoDefaults.desktop;
  }

  return [isVisible, visibility, updateVisibility];
}
