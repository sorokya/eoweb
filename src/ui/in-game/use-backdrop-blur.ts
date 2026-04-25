import { UI_BLUR } from '@/ui/consts';
import { useConfigSetting } from './use-config-setting';

/**
 * Returns the canonical backdrop-blur Tailwind class when the user has
 * backdrop blur enabled in settings, or an empty string when disabled.
 */
export function useBackdropBlur(): string {
  const [enabled] = useConfigSetting<boolean>(
    'backdropBlur',
    (c) => c.backdropBlur,
    (c, v) => c.setBackdropBlur(v),
  );
  return enabled ? UI_BLUR : '';
}
