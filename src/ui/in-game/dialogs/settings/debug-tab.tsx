import { useCallback, useState } from 'preact/hooks';
import { useClient, useLocale } from '@/ui/context';
import { useWindowManager } from '@/ui/in-game';
import { SettingRow } from './setting-row';

const LAYER_NAMES = [
  'debugLayerGround',
  'debugLayerObjects',
  'debugLayerOverlay',
  'debugLayerDownWall',
  'debugLayerRightWall',
  'debugLayerRoof',
  'debugLayerTop',
  'debugLayerShadow',
  'debugLayerOverlay2',
] as const satisfies ReadonlyArray<
  keyof ReturnType<typeof useLocale>['locale']['settings']
>;

export function DebugTab() {
  const { locale } = useLocale();
  const client = useClient();
  const cfg = client.configController;
  const { toggleDialog } = useWindowManager();

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
        {locale.settings.debugMapLayers}
      </p>
      {LAYER_NAMES.map((key, layer) => (
        <SettingRow key={layer} label={locale.settings[key]} asLabel>
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
        class='btn btn-sm w-full'
        onClick={() => toggleDialog('packet-log')}
      >
        {locale.settings.debugPacketLog}
      </button>
    </div>
  );
}
