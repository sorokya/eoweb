import { useCallback, useEffect, useState } from 'preact/hooks';
import type { ConfigController } from '@/controllers';
import { useClient } from '@/ui/context';

/**
 * Subscribes to a ConfigController setting by key and returns a reactive
 * [value, setter] pair. `selector` extracts the value from the controller;
 * `updater` applies the new value back.
 */
export function useConfigSetting<T>(
  key: string,
  selector: (c: ConfigController) => T,
  updater: (c: ConfigController, value: T) => void,
): [T, (value: T) => void] {
  const client = useClient();
  const cfg = client.configController;

  const [value, setValue] = useState<T>(() => selector(cfg));

  useEffect(() => {
    const unsub = cfg.subscribe(key, () => {
      setValue(selector(cfg));
    });
    return unsub;
  }, [cfg, key, selector]);

  const set = useCallback(
    (next: T) => {
      updater(cfg, next);
      setValue(next);
    },
    [cfg, updater],
  );

  return [value, set];
}
