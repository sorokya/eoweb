import { CharacterIcon, type OnlinePlayer } from 'eolib';
import { createPortal } from 'preact/compat';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';
import {
  FaEarthAmericas,
  FaEllipsis,
  FaUser,
  FaUserCheck,
  FaUserSlash,
  FaUsers,
} from 'react-icons/fa6';
import { formatLocaleString } from '@/locale';
import { Tabs } from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';
import { useChatManager } from '@/ui/in-game';
import { capitalize } from '@/utils';
import { DialogBase } from './dialog-base';

type SocialTabId = 'online' | 'friends' | 'guild' | 'ignore';

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

type RowActions = {
  isFriend: boolean;
  isIgnored: boolean;
  onAddFriend: () => void;
  onRemoveFriend: () => void;
  onIgnore: () => void;
  onUnignore: () => void;
  onWhisper: () => void;
};

function PlayerMenu({ actions }: { actions: RowActions }) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const { locale } = useLocale();

  function handleOpen(e: MouseEvent) {
    e.stopPropagation();
    const rect = btnRef.current!.getBoundingClientRect();
    setAnchor({ x: rect.right, y: rect.bottom + 4 });
    setOpen(true);
  }

  useLayoutEffect(() => {
    if (!open || !menuRef.current) return;
    const { width, height } = menuRef.current.getBoundingClientRect();
    const padding = 8;
    const left =
      anchor.x + width + padding <= window.innerWidth
        ? anchor.x + padding
        : anchor.x - width - padding;
    const top = Math.min(anchor.y, window.innerHeight - height - padding);
    setPos({ left: Math.max(padding, left), top: Math.max(padding, top) });
  }, [open, anchor]);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <button
        ref={btnRef}
        type='button'
        class='btn btn-ghost btn-xs shrink-0 px-1 opacity-50 hover:opacity-100'
        onClick={handleOpen}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <FaEllipsis size={12} />
      </button>
      {open &&
        createPortal(
          <>
            <div
              class='fixed inset-0 z-9999'
              onClick={(e) => {
                e.stopPropagation();
                close();
              }}
            />
            <ul
              ref={menuRef}
              class='menu menu-compact fixed z-10000 w-40 rounded-box bg-base-200 p-1 shadow-xl'
              style={{ top: pos.top, left: pos.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <li>
                <button
                  type='button'
                  onClick={() => {
                    actions.onWhisper();
                    close();
                  }}
                >
                  {locale.socialWhisper}
                </button>
              </li>
              <li>
                <button
                  type='button'
                  onClick={() => {
                    actions.isFriend
                      ? actions.onRemoveFriend()
                      : actions.onAddFriend();
                    close();
                  }}
                >
                  {actions.isFriend
                    ? locale.socialRemoveFriend
                    : locale.socialAddFriend}
                </button>
              </li>
              <li>
                <button
                  type='button'
                  onClick={() => {
                    actions.isIgnored
                      ? actions.onUnignore()
                      : actions.onIgnore();
                    close();
                  }}
                >
                  {actions.isIgnored
                    ? locale.socialUnignore
                    : locale.socialIgnore}
                </button>
              </li>
            </ul>
          </>,
          document.getElementById('ui') ?? document.body,
        )}
    </>
  );
}

function PlayerRow({
  player,
  actions,
}: {
  player: OnlinePlayer;
  actions: RowActions;
}) {
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
      <div
        class={`flex items-center gap-2 rounded px-2 py-1.5 ${actions.isIgnored ? 'opacity-40' : ''}`}
      >
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
        <PlayerMenu actions={actions} />
      </div>
    </li>
  );
}

function OfflinePlayerRow({
  name,
  actions,
}: {
  name: string;
  actions: RowActions;
}) {
  return (
    <li>
      <div class='flex items-center gap-2 rounded px-2 py-1.5 opacity-40'>
        <span class='shrink-0 text-base-content/40'>
          <FaUser size={13} />
        </span>
        <div class='min-w-0 flex-1'>
          <span class='font-semibold text-sm'>{capitalize(name)}</span>
          <p class='truncate text-base-content/50 text-xs'>Offline</p>
        </div>
        <PlayerMenu actions={actions} />
      </div>
    </li>
  );
}

function OnlineTab({
  players,
  buildActions,
}: {
  players: OnlinePlayer[];
  buildActions: (name: string, player?: OnlinePlayer) => RowActions;
}) {
  return (
    <ul class='flex flex-col py-1'>
      {players.map((p) => (
        <PlayerRow key={p.name} player={p} actions={buildActions(p.name, p)} />
      ))}
    </ul>
  );
}

function FriendsTab({
  friendList,
  playerList,
  buildActions,
}: {
  friendList: string[];
  playerList: OnlinePlayer[];
  buildActions: (name: string, player?: OnlinePlayer) => RowActions;
}) {
  if (friendList.length === 0) {
    return (
      <p class='p-4 text-center text-base-content/50 text-sm'>
        No friends added yet.
      </p>
    );
  }

  return (
    <ul class='flex flex-col py-1'>
      {friendList.map((name) => {
        const online = playerList.find(
          (p) => p.name.toLowerCase() === name.toLowerCase(),
        );
        return online ? (
          <PlayerRow
            key={name}
            player={online}
            actions={buildActions(name, online)}
          />
        ) : (
          <OfflinePlayerRow
            key={name}
            name={name}
            actions={buildActions(name)}
          />
        );
      })}
    </ul>
  );
}

function GuildTab({
  players,
  buildActions,
}: {
  players: OnlinePlayer[];
  buildActions: (name: string, player?: OnlinePlayer) => RowActions;
}) {
  if (players.length === 0) {
    return (
      <p class='p-4 text-center text-base-content/50 text-sm'>
        No guild members online.
      </p>
    );
  }

  return (
    <ul class='flex flex-col py-1'>
      {players.map((p) => (
        <PlayerRow key={p.name} player={p} actions={buildActions(p.name, p)} />
      ))}
    </ul>
  );
}

function IgnoreTab({
  ignoreList,
  playerList,
  buildActions,
}: {
  ignoreList: string[];
  playerList: OnlinePlayer[];
  buildActions: (name: string, player?: OnlinePlayer) => RowActions;
}) {
  if (ignoreList.length === 0) {
    return (
      <p class='p-4 text-center text-base-content/50 text-sm'>
        No players ignored.
      </p>
    );
  }

  return (
    <ul class='flex flex-col py-1'>
      {ignoreList.map((name) => {
        const online = playerList.find(
          (p) => p.name.toLowerCase() === name.toLowerCase(),
        );
        return online ? (
          <PlayerRow
            key={name}
            player={online}
            actions={buildActions(name, online)}
          />
        ) : (
          <OfflinePlayerRow
            key={name}
            name={name}
            actions={buildActions(name)}
          />
        );
      })}
    </ul>
  );
}

export function SocialDialog() {
  const client = useClient();
  const { locale } = useLocale();
  const { openWhisper } = useChatManager();

  const [playerList, setPlayerList] = useState(
    client.socialController.playerList,
  );
  const [friendList, setFriendList] = useState(() => [
    ...client.socialController.friendList,
  ]);
  const [ignoreList, setIgnoreList] = useState(() => [
    ...client.socialController.ignoreList,
  ]);

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

  const myGuildTag = client.guildTag?.trim();

  const guildPlayers = useMemo(
    () =>
      myGuildTag
        ? playerList.filter((p) => p.guildTag?.trim() === myGuildTag)
        : [],
    [playerList, myGuildTag],
  );

  const onlineFriendCount = useMemo(
    () =>
      friendList.filter((name) =>
        playerList.some((p) => p.name.toLowerCase() === name.toLowerCase()),
      ).length,
    [friendList, playerList],
  );

  const onlineIgnoreCount = useMemo(
    () =>
      ignoreList.filter((name) =>
        playerList.some((p) => p.name.toLowerCase() === name.toLowerCase()),
      ).length,
    [ignoreList, playerList],
  );

  function buildActions(name: string, _player?: OnlinePlayer): RowActions {
    const lname = name.toLowerCase();
    const isFriend = friendList.some((n) => n.toLowerCase() === lname);
    const isIgnored = ignoreList.some((n) => n.toLowerCase() === lname);

    return {
      isFriend,
      isIgnored,
      onAddFriend: () => {
        client.socialController.addFriend(name);
        setFriendList([...client.socialController.friendList]);
      },
      onRemoveFriend: () => {
        client.socialController.removeFriend(name);
        setFriendList([...client.socialController.friendList]);
      },
      onIgnore: () => {
        client.socialController.addIgnore(name);
        setIgnoreList([...client.socialController.ignoreList]);
      },
      onUnignore: () => {
        client.socialController.removeIgnore(name);
        setIgnoreList([...client.socialController.ignoreList]);
      },
      onWhisper: () => openWhisper(name),
    };
  }

  const tabs = useMemo(
    () => [
      {
        id: 'online',
        label: (
          <TabLabel
            icon={<FaEarthAmericas size={12} />}
            text={formatLocaleString(locale.socialOnline, {
              count: String(playerList.length),
            })}
          />
        ),
      },
      {
        id: 'friends',
        label: (
          <TabLabel
            icon={<FaUserCheck size={12} />}
            text={formatLocaleString(locale.socialFriends, {
              count: String(onlineFriendCount),
            })}
          />
        ),
      },
      {
        id: 'guild',
        label: (
          <TabLabel
            icon={<FaUsers size={12} />}
            text={formatLocaleString(locale.socialGuild, {
              count: String(guildPlayers.length),
            })}
          />
        ),
      },
      {
        id: 'ignore',
        label: (
          <TabLabel
            icon={<FaUserSlash size={12} />}
            text={formatLocaleString(locale.socialIgnored, {
              count: String(onlineIgnoreCount),
            })}
          />
        ),
      },
    ],
    [
      locale,
      playerList.length,
      onlineFriendCount,
      guildPlayers.length,
      onlineIgnoreCount,
    ],
  );

  return (
    <DialogBase id='social' title={locale.socialTitle} size='md'>
      <div class='flex flex-col'>
        <div class='overflow-x-auto'>
          <Tabs
            name='social'
            items={tabs}
            activeId={activeTab}
            onSelect={(id) => setActiveTab(id as SocialTabId)}
            style='border'
          />
        </div>
        <div class='max-h-96 overflow-y-auto'>
          {activeTab === 'online' && (
            <OnlineTab players={playerList} buildActions={buildActions} />
          )}
          {activeTab === 'friends' && (
            <FriendsTab
              friendList={friendList}
              playerList={playerList}
              buildActions={buildActions}
            />
          )}
          {activeTab === 'guild' && (
            <GuildTab players={guildPlayers} buildActions={buildActions} />
          )}
          {activeTab === 'ignore' && (
            <IgnoreTab
              ignoreList={ignoreList}
              playerList={playerList}
              buildActions={buildActions}
            />
          )}
        </div>
      </div>
    </DialogBase>
  );
}
