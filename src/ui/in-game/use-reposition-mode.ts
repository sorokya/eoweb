import { useCallback, useEffect, useState } from 'preact/hooks';

const STORAGE_KEY = 'eoweb:reposition-mode';
export const REPOSITION_EVENT = 'eoweb:reposition-mode-change';

function readRepositionMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useRepositionMode(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState(readRepositionMode);

  useEffect(() => {
    const handler = () => setEnabled(readRepositionMode());
    window.addEventListener(REPOSITION_EVENT, handler);
    return () => window.removeEventListener(REPOSITION_EVENT, handler);
  }, []);

  const update = useCallback((next: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // ignore
    }
    setEnabled(next);
    window.dispatchEvent(new CustomEvent(REPOSITION_EVENT));
  }, []);

  return [enabled, update];
}
