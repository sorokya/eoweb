import { useCallback, useEffect, useState } from 'preact/hooks';
import { ConfigController } from '@/controllers';
import { useClient } from '@/ui/context';

export const UI_SCALE_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3];

function applyScale(idx: number): void {
  document.documentElement.style.fontSize = `${16 * UI_SCALE_OPTIONS[idx]}px`;
}

/** Apply the persisted UI scale to the root font size immediately (call before first render). */
export function applyUiScale(): void {
  // Read from ConfigController which handles migration from old key
  const cfg = new ConfigController();
  applyScale(cfg.uiScaleIndex);
}

/** Returns [scaleIndex, setScaleIndex]. Changing the index updates ConfigController and the root font size. */
export function useUiScale(): [number, (idx: number) => void] {
  const client = useClient();
  const cfg = client.configController;

  const [scaleIndex, setScaleIndex] = useState(() => cfg.uiScaleIndex);

  useEffect(() => {
    const unsub = cfg.subscribe('uiScaleIndex', () => {
      setScaleIndex(cfg.uiScaleIndex);
      applyScale(cfg.uiScaleIndex);
    });
    return unsub;
  }, [cfg]);

  const updateScale = useCallback(
    (idx: number) => {
      cfg.setUiScaleIndex(idx);
      setScaleIndex(idx);
      applyScale(idx);
    },
    [cfg],
  );

  return [scaleIndex, updateScale];
}
