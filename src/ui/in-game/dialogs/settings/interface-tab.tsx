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

const LANGUAGES: {
  value: Language;
  labelKey: keyof ReturnType<typeof useLocale>['locale'];
}[] = [
  { value: 'en', labelKey: 'langEn' },
  { value: 'nl', labelKey: 'langNl' },
  { value: 'sv', labelKey: 'langSv' },
  { value: 'pt', labelKey: 'langPt' },
];

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
    value: l.value,
    label: locale[l.labelKey] as string,
  }));

  const handleThemeChange = (v: string) => {
    setTheme(v);
    // Apply immediately in case the main.tsx listener doesn't catch it
    document.documentElement.dataset.theme = v;
  };

  return (
    <div class='flex flex-col gap-3 p-2'>
      <CycleInput
        label={locale.settingsUiScale}
        value={scaleIndex}
        min={0}
        max={UI_SCALE_OPTIONS.length - 1}
        format={(i) => `${UI_SCALE_OPTIONS[i]}x`}
        onChange={setScaleIndex}
      />
      <div class='divider my-0' />
      <Select
        label={locale.settingsTheme}
        value={theme}
        options={themeOptions}
        onChange={handleThemeChange}
        variant='sm'
      />
      <div class='divider my-0' />
      <Select
        label={locale.settingsLanguage}
        value={language}
        options={langOptions}
        onChange={(v) => setLanguage(v as Language)}
        variant='sm'
      />
      <div class='divider my-0' />
      <SettingRow label={locale.settingsBackdropBlur} asLabel>
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
          {locale.settingsTouchRepositionHint}
        </p>
        <SettingRow label={locale.settingsTouchReposition} asLabel>
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
        <p class='text-xs font-semibold opacity-70'>
          {locale.settingsMobileControls}
        </p>
        <VisibilityCycle
          label={locale.settingsMobileJoystick}
          visKey='touch-joystick'
          autoDefaults={{ mobile: true, desktop: false }}
          formatLabel={(v) =>
            locale[`settingsVisibility_${v}` as keyof typeof locale] as string
          }
        />
        <VisibilityCycle
          label={locale.settingsMobileActionButtons}
          visKey='touch-actions'
          autoDefaults={{ mobile: true, desktop: false }}
          formatLabel={(v) =>
            locale[`settingsVisibility_${v}` as keyof typeof locale] as string
          }
        />
      </div>
      <div class='divider my-0' />
      <VisibilityCycle
        label={locale.settingsDesktopEmoteButton}
        visKey='desktop-emote'
        autoDefaults={{ mobile: false, desktop: true }}
        formatLabel={(v) =>
          locale[`settingsVisibility_${v}` as keyof typeof locale] as string
        }
      />
    </div>
  );
}
