import { CharacterIcon, type OnlinePlayer } from 'eolib';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { FaUser, FaUserFriends } from 'react-icons/fa';
import { FaUserSlash, FaUsers } from 'react-icons/fa6';
import { Tabs } from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';
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

function PlayerIcon(icon: CharacterIcon): preact.ComponentChildren {
  switch (icon) {
    case CharacterIcon.Player:
    case CharacterIcon.Gm:
    case CharacterIcon.Hgm:
      return <FaUser size={16} />;
    case CharacterIcon.Party:
    case CharacterIcon.GmParty:
    case CharacterIcon.HgmParty:
      return <FaUsers size={16} />;
  }
}

function PlayerBadge(player: OnlinePlayer): preact.ComponentChildren | null {
  const client = useClient();
  const { locale } = useLocale();

  const className = client.ecf?.classes[player.classId]?.name || null;

  return (
    <>
      {player.icon === CharacterIcon.Gm ||
      player.icon === CharacterIcon.GmParty ? (
        <span class='badge badge-accent badge-xs'>
          {locale.adminBadgeGameMaster}
        </span>
      ) : player.icon === CharacterIcon.Hgm ||
        player.icon === CharacterIcon.HgmParty ? (
        <span class='badge badge-accent badge-xs'>
          {locale.adminBadgeHighGameMaster}
        </span>
      ) : null}

      {player.guildTag && (
        <span class='badge badge-primary badge-xs'>{player.guildTag}</span>
      )}

      <span class='badge badge-info badge-xs'>
        {locale.hudLvl} {player.level}
        {className ? ` ${className}` : ''}
      </span>
    </>
  );
}

function OnlineTab({ players }: TabProps) {
  return (
    <ul class='menu w-full'>
      {players.map((p) => (
        <li key={p.name}>
          <div class='flex flex-col gap-1'>
            <div class='flex items-center gap-2'>
              {PlayerIcon(p.icon)}
              <span>{p.name}</span>
              {PlayerBadge(p)}
            </div>
            <div>
              {p.title && <span class='text-xs opacity-70'>{p.title}</span>}
            </div>
          </div>
        </li>
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
            icon={<FaUsers size={12} />}
            text={`Online (${playerList.length})`}
          />
        ),
      },
      {
        id: 'friends',
        label: <TabLabel icon={<FaUserFriends size={12} />} text='Friends' />,
      },
      {
        id: 'ignore',
        label: <TabLabel icon={<FaUserSlash size={12} />} text='Ignore' />,
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
