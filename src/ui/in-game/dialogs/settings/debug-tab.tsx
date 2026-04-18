import { useCallback, useState } from 'preact/hooks';
import { useClient, useLocale } from '@/ui/context';
import { SettingRow } from './setting-row';

const LAYER_NAMES = [
  'settingsDebugLayerGround',
  'settingsDebugLayerObjects',
  'settingsDebugLayerOverlay',
  'settingsDebugLayerDownWall',
  'settingsDebugLayerRightWall',
  'settingsDebugLayerRoof',
  'settingsDebugLayerTop',
  'settingsDebugLayerShadow',
  'settingsDebugLayerOverlay2',
] as const;

export function DebugTab() {
  const { locale } = useLocale();
  const client = useClient();
  const cfg = client.configController;

  const [visibility, setVisibility] = useState<Record<number, boolean>>(() => ({
    ...cfg.layerVisibility,
  }));

  const toggle = useCallback(
    (layer: number) => {
      const next = !cfg.layerVisible(layer);
      cfg.setLayerVisible(layer, next);
      setVisibility((prev) => ({ ...prev, [layer]: next }));
    },
    [cfg],
  );

  return (
    <div class='flex flex-col gap-3 p-2'>
      <p class='font-semibold text-sm opacity-70'>
        {locale.settingsDebugMapLayers}
      </p>
      {LAYER_NAMES.map((key, layer) => (
        <SettingRow key={layer} label={locale[key]} asLabel>
          <input
            type='checkbox'
            class='checkbox checkbox-sm'
            checked={visibility[layer] ?? true}
            onChange={() => toggle(layer)}
          />
        </SettingRow>
      ))}
      <div class='divider my-0' />
      <button
        type='button'
        class='btn btn-sm btn-disabled w-full'
        disabled
        title={locale.settingsDebugPacketLogSoon}
      >
        {locale.settingsDebugPacketLog}
      </button>
    </div>
  );
}
