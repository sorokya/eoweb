import { useLocale } from '@/ui/context';
import { useConfigSetting } from '@/ui/in-game';
import { SettingRow } from './setting-row';
import { SliderInput } from './slider-input';

export function SoundTab() {
  const { locale } = useLocale();

  const [master, setMaster] = useConfigSetting<number>(
    'masterVolume',
    (c) => c.masterVolume,
    (c, v) => c.setMasterVolume(v),
  );

  const [effect, setEffect] = useConfigSetting<number>(
    'effectVolume',
    (c) => c.effectVolume,
    (c, v) => c.setEffectVolume(v),
  );

  const [ambient, setAmbient] = useConfigSetting<number>(
    'ambientVolume',
    (c) => c.ambientVolume,
    (c, v) => c.setAmbientVolume(v),
  );

  const [music, setMusic] = useConfigSetting<number>(
    'musicVolume',
    (c) => c.musicVolume,
    (c, v) => c.setMusicVolume(v),
  );

  const [forceMusicLoop, setForceMusicLoop] = useConfigSetting<boolean>(
    'forceMusicLoop',
    (c) => c.forceMusicLoop,
    (c, v) => c.setForceMusicLoop(v),
  );

  return (
    <div class='flex flex-col gap-3 p-2'>
      <SliderInput
        label={locale.settingsMasterVolume}
        value={master}
        onChange={setMaster}
      />
      <div class='divider my-0' />
      <SliderInput
        label={locale.settingsEffectVolume}
        value={effect}
        onChange={setEffect}
      />
      <div class='divider my-0' />
      <SliderInput
        label={locale.settingsAmbientVolume}
        value={ambient}
        onChange={setAmbient}
      />
      <div class='divider my-0' />
      <SliderInput
        label={locale.settingsMusicVolume}
        value={music}
        onChange={setMusic}
      />
      <div class='divider my-0' />
      <SettingRow label={locale.settingsMusicForceLoop} asLabel>
        <input
          type='checkbox'
          class='checkbox checkbox-sm'
          checked={forceMusicLoop}
          onChange={(e) =>
            setForceMusicLoop((e.target as HTMLInputElement).checked)
          }
        />
      </SettingRow>
    </div>
  );
}
