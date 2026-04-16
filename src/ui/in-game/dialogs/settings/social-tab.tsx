import type { SocialFilter } from '@/controllers';
import { Select } from '@/ui/components';
import { useLocale } from '@/ui/context';
import { useConfigSetting } from '@/ui/in-game';
import { SettingRow } from './setting-row';

export function SocialTab() {
  const { locale } = useLocale();

  const socialOptions = [
    { value: 'all', label: locale.settingsSocialAll },
    { value: 'friends', label: locale.settingsSocialFriends },
    { value: 'none', label: locale.settingsSocialNone },
  ];

  const [whispers, setWhispers] = useConfigSetting<SocialFilter>(
    'whispers',
    (c) => c.whispers,
    (c, v) => c.setWhispers(v),
  );

  const [tradeRequests, setTradeRequests] = useConfigSetting<SocialFilter>(
    'tradeRequests',
    (c) => c.tradeRequests,
    (c, v) => c.setTradeRequests(v),
  );

  const [partyRequests, setPartyRequests] = useConfigSetting<SocialFilter>(
    'partyRequests',
    (c) => c.partyRequests,
    (c, v) => c.setPartyRequests(v),
  );

  const [profanityFilter, setProfanityFilter] = useConfigSetting<boolean>(
    'profanityFilter',
    (c) => c.profanityFilter,
    (c, v) => c.setProfanityFilter(v),
  );

  const [chatLog, setChatLog] = useConfigSetting<boolean>(
    'chatLog',
    (c) => c.chatLog,
    (c, v) => c.setChatLog(v),
  );

  return (
    <div class='flex flex-col gap-3 p-2'>
      <Select
        label={locale.settingsWhispers}
        value={whispers}
        options={socialOptions}
        onChange={(v) => setWhispers(v as SocialFilter)}
        variant='sm'
      />
      <div class='divider my-0' />
      <Select
        label={locale.settingsTradeRequests}
        value={tradeRequests}
        options={socialOptions}
        onChange={(v) => setTradeRequests(v as SocialFilter)}
        variant='sm'
      />
      <div class='divider my-0' />
      <Select
        label={locale.settingsPartyRequests}
        value={partyRequests}
        options={socialOptions}
        onChange={(v) => setPartyRequests(v as SocialFilter)}
        variant='sm'
      />
      <div class='divider my-0' />
      <SettingRow label={locale.settingsProfanityFilter} asLabel>
        <input
          type='checkbox'
          class='checkbox checkbox-sm'
          checked={profanityFilter}
          onChange={(e) =>
            setProfanityFilter((e.target as HTMLInputElement).checked)
          }
        />
      </SettingRow>
      <div class='divider my-0' />
      <SettingRow label={locale.settingsChatLog} asLabel>
        <input
          type='checkbox'
          class='checkbox checkbox-sm'
          checked={chatLog}
          onChange={(e) => setChatLog((e.target as HTMLInputElement).checked)}
        />
      </SettingRow>
    </div>
  );
}
