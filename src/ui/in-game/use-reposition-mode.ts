import { useCallback, useEffect, useState } from 'preact/hooks';

const REPOSITION_EVENT = 'eoweb:reposition-mode-change';

let _enabled = false;

export function useRepositionMode(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState(() => _enabled);

  useEffect(() => {
    const handler = () => setEnabled(_enabled);
    window.addEventListener(REPOSITION_EVENT, handler);
    return () => window.removeEventListener(REPOSITION_EVENT, handler);
  }, []);

  const update = useCallback((next: boolean) => {
    _enabled = next;
    setEnabled(next);
    window.dispatchEvent(new CustomEvent(REPOSITION_EVENT));
  }, []);

  return [enabled, update];
}
