import { CharacterIcon, type OnlinePlayer } from 'eolib';
import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  FaEarthAmericas,
  FaUser,
  FaUserCheck,
  FaUserSlash,
  FaUsers,
} from 'react-icons/fa6';
import { Tabs } from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';
import { capitalize } from '@/utils';
import { DialogBase } from './dialog-base';

type SocialTabId = 'online' | 'friends' | 'ignore';

function TabLabel({
  icon,
  text,
}: {
  icon: preact.ComponentChildren;
  text: string;
}) {
  return (
    <span class='flex items-center gap-1'>
      {icon}
      <span class='hidden sm:inline'>{text}</span>
    </span>
  );
}

type TabProps = {
  players: OnlinePlayer[];
};

function iconColor(icon: CharacterIcon): string {
  switch (icon) {
    case CharacterIcon.Hgm:
    case CharacterIcon.HgmParty:
      return 'text-warning';
    case CharacterIcon.Gm:
    case CharacterIcon.GmParty:
      return 'text-accent';
    case CharacterIcon.Party:
      return 'text-success';
    default:
      return 'text-base-content/40';
  }
}

function isInParty(icon: CharacterIcon): boolean {
  return (
    icon === CharacterIcon.Party ||
    icon === CharacterIcon.GmParty ||
    icon === CharacterIcon.HgmParty
  );
}

function PlayerRow({ player }: { player: OnlinePlayer }) {
  const client = useClient();
  const { locale } = useLocale();

  const className = client.ecf?.classes[player.classId - 1]?.name ?? null;
  const isHgm =
    player.icon === CharacterIcon.Hgm || player.icon === CharacterIcon.HgmParty;
  const isGm =
    player.icon === CharacterIcon.Gm || player.icon === CharacterIcon.GmParty;

  const subtitle = [`${locale.hudLvl} ${player.level}`, className, player.title]
    .filter(Boolean)
    .join(' · ');

  return (
    <li>
      <div class='flex items-center gap-2 rounded px-3 py-1.5'>
        <span class={`shrink-0 ${iconColor(player.icon)}`}>
          {isInParty(player.icon) ? (
            <FaUsers size={13} />
          ) : (
            <FaUser size={13} />
          )}
        </span>
        <div class='min-w-0 flex-1'>
          <div class='flex flex-wrap items-center gap-1.5'>
            <span class='font-semibold text-sm'>{capitalize(player.name)}</span>
            {isHgm && (
              <span class='badge badge-warning badge-xs shrink-0'>
                {locale.adminBadgeHighGameMaster}
              </span>
            )}
            {isGm && (
              <span class='badge badge-accent badge-xs shrink-0'>
                {locale.adminBadgeGameMaster}
              </span>
            )}
            {player.guildTag?.trim() && (
              <span class='badge badge-primary badge-xs shrink-0'>
                {player.guildTag.trim()}
              </span>
            )}
          </div>
          {subtitle && (
            <p class='truncate text-base-content/50 text-xs'>{subtitle}</p>
          )}
        </div>
      </div>
    </li>
  );
}

function OnlineTab({ players }: TabProps) {
  return (
    <ul class='flex flex-col py-1'>
      {players.map((p) => (
        <PlayerRow key={p.name} player={p} />
      ))}
    </ul>
  );
}

function FriendsTab({ players }: TabProps) {
  return <p class='p-2'>Friends list is not implemented yet.</p>; // TODO
}

function IgnoreTab({ players }: TabProps) {
  return <p class='p-2'>Ignore list is not implemented yet.</p>; // TODO
}

export function SocialDialog() {
  const client = useClient();

  const [playerList, setPlayerList] = useState(
    client.socialController.playerList,
  );

  const [activeTab, setActiveTab] = useState<SocialTabId>('online');

  useEffect(() => {
    const handlePlayerListUpdate = (players: OnlinePlayer[]) => {
      setPlayerList(players);
    };

    client.socialController.subscribePlayerList(handlePlayerListUpdate);
    client.socialController.requestOnlinePlayers();

    return () => {
      client.socialController.unsubscribePlayerList(handlePlayerListUpdate);
    };
  }, [client]);

  const tabs = useMemo(
    () => [
      {
        id: 'online',
        label: (
          <TabLabel
            icon={<FaEarthAmericas size={12} />}
            text={`Online (${playerList.length})`}
          />
        ),
      },
      {
        id: 'friends',
        label: <TabLabel icon={<FaUserCheck size={12} />} text='Friends' />,
      },
      {
        id: 'guild',
        label: <TabLabel icon={<FaUsers size={12} />} text='Guild' />,
      },
      {
        id: 'ignore',
        label: <TabLabel icon={<FaUserSlash size={12} />} text='Ignored' />,
      },
    ],
    [playerList.length],
  );

  return (
    <DialogBase id='social' title='Social' size='md'>
      <div class='flex flex-col'>
        <div class='overflow-x-auto'>
          <Tabs
            name='settings'
            items={tabs}
            activeId={activeTab}
            onSelect={(id) => setActiveTab(id as SocialTabId)}
            style='box'
            size='xs'
          />
        </div>
        <div class='max-h-96 overflow-y-auto'>
          {activeTab === 'online' && <OnlineTab players={playerList} />}
          {activeTab === 'friends' && <FriendsTab players={playerList} />}
          {activeTab === 'ignore' && <IgnoreTab players={playerList} />}
        </div>
      </div>
    </DialogBase>
  );
}
