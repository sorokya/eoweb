import type { Language } from '@/controllers';
import { CycleInput, Select } from '@/ui/components';
import { useLocale } from '@/ui/context';
import {
  type HudVisibility,
  UI_SCALE_OPTIONS,
  useConfigSetting,
  useHudVisibility,
  useRepositionMode,
  useUiScale,
} from '@/ui/in-game';
import { SettingRow } from './setting-row';

const DAISYUI_THEMES = [
  'light',
  'dark',
  'cupcake',
  'bumblebee',
  'emerald',
  'corporate',
  'synthwave',
  'retro',
  'cyberpunk',
  'valentine',
  'halloween',
  'garden',
  'forest',
  'aqua',
  'lofi',
  'pastel',
  'fantasy',
  'wireframe',
  'black',
  'luxury',
  'dracula',
  'cmyk',
  'autumn',
  'business',
  'acid',
  'lemonade',
  'night',
  'coffee',
  'winter',
  'dim',
  'nord',
  'sunset',
  'caramellatte',
  'abyss',
  'silk',
];

const LANGUAGES: Language[] = ['en', 'nl', 'sv', 'pt'];

const VIS_VALUES: HudVisibility[] = ['auto', 'always', 'never'];

type VisibilityCycleProps = {
  label: string;
  visKey: string;
  autoDefaults: { mobile: boolean; desktop: boolean };
  formatLabel: (v: HudVisibility) => string;
};

function VisibilityCycle({
  label,
  visKey,
  autoDefaults,
  formatLabel,
}: VisibilityCycleProps) {
  const [, visibility, setVisibility] = useHudVisibility(visKey, autoDefaults);
  const idx = VIS_VALUES.indexOf(visibility);
  return (
    <CycleInput
      label={label}
      value={idx < 0 ? 0 : idx}
      min={0}
      max={VIS_VALUES.length - 1}
      format={(i) => formatLabel(VIS_VALUES[i])}
      onChange={(i) => setVisibility(VIS_VALUES[i])}
    />
  );
}

export function InterfaceTab() {
  const { locale } = useLocale();
  const [repositionMode, setRepositionMode] = useRepositionMode();

  const [scaleIndex, setScaleIndex] = useUiScale();

  const [theme, setTheme] = useConfigSetting<string>(
    'theme',
    (c) => c.theme,
    (c, v) => c.setTheme(v),
  );

  const [language, setLanguage] = useConfigSetting<Language>(
    'language',
    (c) => c.language,
    (c, v) => c.setLanguage(v),
  );

  const [backdropBlur, setBackdropBlur] = useConfigSetting<boolean>(
    'backdropBlur',
    (c) => c.backdropBlur,
    (c, v) => c.setBackdropBlur(v),
  );

  const themeOptions = DAISYUI_THEMES.map((t) => ({ value: t, label: t }));
  const langOptions = LANGUAGES.map((l) => ({
    value: l,
    label: locale.lang[l as keyof typeof locale.lang],
  }));

  const handleThemeChange = (v: string) => {
    setTheme(v);
    // Apply immediately in case the main.tsx listener doesn't catch it
    document.documentElement.dataset.theme = v;
  };

  return (
    <div class='flex flex-col gap-3 p-2'>
      <CycleInput
        label={locale.settings.uiScale}
        value={scaleIndex}
        min={0}
        max={UI_SCALE_OPTIONS.length - 1}
        format={(i) => `${UI_SCALE_OPTIONS[i]}x`}
        onChange={setScaleIndex}
      />
      <div class='divider my-0' />
      <Select
        label={locale.settings.theme}
        value={theme}
        options={themeOptions}
        onChange={handleThemeChange}
        variant='sm'
      />
      <div class='divider my-0' />
      <Select
        label={locale.settings.language}
        value={language}
        options={langOptions}
        onChange={(v) => setLanguage(v as Language)}
        variant='sm'
      />
      <div class='divider my-0' />
      <SettingRow label={locale.settings.backdropBlur} asLabel>
        <input
          type='checkbox'
          class='checkbox checkbox-sm'
          checked={backdropBlur}
          onChange={(e) =>
            setBackdropBlur((e.target as HTMLInputElement).checked)
          }
        />
      </SettingRow>
      <div class='divider my-0' />
      <div>
        <p class='mb-1 text-xs opacity-50'>
          {locale.settings.touchRepositionHint}
        </p>
        <SettingRow label={locale.settings.touchReposition} asLabel>
          <input
            type='checkbox'
            class='checkbox checkbox-sm'
            checked={repositionMode}
            onChange={(e) =>
              setRepositionMode((e.target as HTMLInputElement).checked)
            }
          />
        </SettingRow>
      </div>
      <div class='divider my-0' />
      <div class='flex flex-col gap-2'>
        <p class='font-semibold text-xs opacity-70'>
          {locale.settings.mobileControls}
        </p>
        <VisibilityCycle
          label={locale.settings.mobileJoystick}
          visKey='touch-joystick'
          autoDefaults={{ mobile: true, desktop: false }}
          formatLabel={(v) =>
            locale.settings[
              `visibility_${v}` as
                | 'visibility_auto'
                | 'visibility_always'
                | 'visibility_never'
            ]
          }
        />
        <VisibilityCycle
          label={locale.settings.mobileActionButtons}
          visKey='touch-actions'
          autoDefaults={{ mobile: true, desktop: false }}
          formatLabel={(v) =>
            locale.settings[
              `visibility_${v}` as
                | 'visibility_auto'
                | 'visibility_always'
                | 'visibility_never'
            ]
          }
        />
      </div>
      <div class='divider my-0' />
      <VisibilityCycle
        label={locale.settings.desktopEmoteButton}
        visKey='desktop-emote'
        autoDefaults={{ mobile: false, desktop: true }}
        formatLabel={(v) =>
          locale.settings[
            `visibility_${v}` as
              | 'visibility_auto'
              | 'visibility_always'
              | 'visibility_never'
          ]
        }
      />
    </div>
  );
}
