import { useCallback } from 'preact/hooks';
import type { FpsLimit } from '@/controllers';
import { CycleInput } from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';
import { useConfigSetting } from '@/ui/in-game';
import { SettingRow } from './setting-row';

const FPS_OPTIONS: FpsLimit[] = [20, 30, 60, 0];

export function GraphicsTab() {
  const { locale } = useLocale();
  const client = useClient();

  const [fpsIndex, setFpsIndex] = useConfigSetting<number>(
    'fpsLimit',
    (c) => FPS_OPTIONS.indexOf(c.fpsLimit as FpsLimit),
    (c, i) => c.setFpsLimit(FPS_OPTIONS[i]),
  );

  const [interpolation, setInterpolation] = useConfigSetting<boolean>(
    'interpolation',
    (c) => c.interpolation,
    (c, v) => c.setInterpolation(v),
  );

  const zoomIn = useCallback(() => {
    client.viewportController.zoomIn();
  }, [client]);

  const zoomOut = useCallback(() => {
    client.viewportController.zoomOut();
  }, [client]);

  const zoomReset = useCallback(() => {
    client.viewportController.zoomReset();
  }, [client]);

  const fpsLabel = (i: number) => {
    const v = FPS_OPTIONS[i];
    return v === 0 ? locale.settingsFpsUnlimited : String(v);
  };

  return (
    <div class='flex flex-col gap-3 p-2'>
      <CycleInput
        label={locale.settingsFpsLimit}
        value={fpsIndex}
        min={0}
        max={FPS_OPTIONS.length - 1}
        format={fpsLabel}
        onChange={setFpsIndex}
      />
      <div class='divider my-0' />
      <SettingRow label={locale.settingsInterpolation} asLabel>
        <input
          type='checkbox'
          class='checkbox checkbox-sm'
          checked={interpolation}
          onChange={(e) =>
            setInterpolation((e.target as HTMLInputElement).checked)
          }
        />
      </SettingRow>
      <div class='divider my-0' />
      <SettingRow label={locale.settingsZoom}>
        <button
          type='button'
          class='btn btn-xs btn-ghost'
          onClick={zoomOut}
          aria-label={locale.settingsZoomOut}
        >
          −
        </button>
        <button type='button' class='btn btn-xs btn-ghost' onClick={zoomReset}>
          {locale.settingsZoomReset}
        </button>
        <button
          type='button'
          class='btn btn-xs btn-ghost'
          onClick={zoomIn}
          aria-label={locale.settingsZoomIn}
        >
          +
        </button>
      </SettingRow>
    </div>
  );
}
