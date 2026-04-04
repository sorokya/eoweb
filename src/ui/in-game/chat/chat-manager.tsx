import { createContext } from 'preact';
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'preact/hooks';
import { getChatMessages, type StoredChatMessage, saveChatMessage } from '@/db';
import { useClient } from '@/ui/context';
import {
  type ChatChannel,
  ChatChannels,
  channelLabel,
  isPMChannel,
  pmChannelName,
} from '@/ui/enums';
import { type ChatDialogId, useWindowManager } from '@/ui/in-game';

const STORAGE_KEY = 'eoweb:chat:dialogs:v2';
const MAX_MESSAGES = 200;

export type ChatMessage = StoredChatMessage;

/** A named tab that aggregates one or more channels. */
export type ChatTabConfig = {
  id: string;
  name: string;
  /** Channels whose messages appear in this tab. */
  channels: ChatChannel[];
};

export type ChatDialogConfig = {
  id: ChatDialogId;
  tabs: ChatTabConfig[];
  activeTabId: string;
};

const DEFAULT_DIALOGS: ChatDialogConfig[] = [
  {
    id: 'chat-main',
    tabs: [
      {
        id: 'general',
        name: 'General',
        channels: [
          ChatChannels.Local,
          ChatChannels.Global,
          ChatChannels.Party,
          ChatChannels.Guild,
          ChatChannels.Admin,
        ],
      },
      {
        id: 'system',
        name: 'System',
        channels: [ChatChannels.System],
      },
    ],
    activeTabId: 'general',
  },
];

function isValidDialogConfig(d: unknown): d is ChatDialogConfig {
  if (!d || typeof d !== 'object') return false;
  const obj = d as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    obj.id.startsWith('chat-') &&
    Array.isArray(obj.tabs) &&
    (obj.tabs as unknown[]).every(
      (t) =>
        t &&
        typeof t === 'object' &&
        typeof (t as Record<string, unknown>).id === 'string' &&
        typeof (t as Record<string, unknown>).name === 'string' &&
        Array.isArray((t as Record<string, unknown>).channels),
    )
  );
}

function loadDialogConfigs(): ChatDialogConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown[];
      if (Array.isArray(parsed) && parsed.every(isValidDialogConfig)) {
        // Only keep chat-main; strip PM channels from saved tabs; reset active tab
        return parsed
          .filter((d) => d.id === 'chat-main')
          .map((d) => ({
            ...d,
            activeTabId: 'general',
            tabs: d.tabs
              .map((t) => ({
                ...t,
                channels: t.channels.filter(
                  (ch: ChatChannel) => !isPMChannel(ch),
                ),
              }))
              .filter(
                (t) =>
                  t.channels.length > 0 ||
                  t.id === 'general' ||
                  t.id === 'system',
              ),
          }));
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_DIALOGS;
}

function saveDialogConfigs(configs: ChatDialogConfig[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  } catch {
    /* ignore */
  }
}

/**
 * Return channels to chat-main after a tab is closed:
 *  - System channel → System tab (created if missing)
 *  - Non-PM, non-System channels → General tab (created if missing)
 *  - PM channels are dropped (ephemeral)
 */
function repatriateChannels(
  dialogs: ChatDialogConfig[],
  channels: ChatChannel[],
): ChatDialogConfig[] {
  const generalOrphans = channels.filter(
    (ch) => ch !== ChatChannels.System && !isPMChannel(ch),
  );
  const systemOrphans = channels.includes(ChatChannels.System);

  if (!generalOrphans.length && !systemOrphans) return dialogs;

  return dialogs.map((d) => {
    if (d.id !== 'chat-main') return d;

    let tabs = d.tabs;

    if (generalOrphans.length > 0) {
      const generalIdx = tabs.findIndex((t) => t.id === 'general');
      if (generalIdx >= 0) {
        const existing = tabs[generalIdx];
        const toAdd = generalOrphans.filter(
          (ch) => !existing.channels.includes(ch),
        );
        if (toAdd.length > 0) {
          tabs = tabs.map((t) =>
            t.id === 'general'
              ? { ...t, channels: [...t.channels, ...toAdd] }
              : t,
          );
        }
      } else {
        tabs = [
          { id: 'general', name: 'General', channels: generalOrphans },
          ...tabs,
        ];
      }
    }

    if (systemOrphans) {
      const systemIdx = tabs.findIndex((t) => t.id === 'system');
      if (systemIdx < 0) {
        tabs = [
          ...tabs,
          { id: 'system', name: 'System', channels: [ChatChannels.System] },
        ];
      }
    }

    return { ...d, tabs };
  });
}

type ChatManagerContextValue = {
  dialogs: ChatDialogConfig[];
  messages: Map<string, ChatMessage[]>;
  /** Set of tab IDs that have unread messages (received since last viewed). */
  unreadTabs: Set<string>;
  /** Split a single channel out of a tab into a new tab within the same dialog. */
  splitChannelToNewTab: (
    channel: ChatChannel,
    fromTabId: string,
    dialogId: ChatDialogId,
  ) => void;
  /**
   * Set the channels for a specific tab. Channels removed are returned to the
   * General tab of chat-main. Channels added are removed from wherever they
   * currently live.
   */
  setTabChannels: (
    tabId: string,
    dialogId: ChatDialogId,
    channels: ChatChannel[],
  ) => void;
  /** Remove a tab from a dialog, repatriating its non-PM channels back to General/System. */
  closeTab: (tabId: string, dialogId: ChatDialogId) => void;
  setActiveTab: (dialogId: ChatDialogId, tabId: string) => void;
};

const ChatManagerContext = createContext<ChatManagerContextValue | null>(null);

export function ChatManagerProvider({
  children,
  characterId,
}: {
  children: preact.ComponentChildren;
  characterId: number;
}) {
  const client = useClient();
  const { openDialog } = useWindowManager();
  const [dialogs, setDialogs] = useState<ChatDialogConfig[]>(() =>
    loadDialogConfigs(),
  );
  const [messages, setMessages] = useState<Map<string, ChatMessage[]>>(
    new Map(),
  );
  const [unreadTabs, setUnreadTabs] = useState<Set<string>>(new Set());

  const dialogsRef = useRef(dialogs);
  dialogsRef.current = dialogs;

  // Open chat-main in the WM on mount
  useEffect(() => {
    openDialog('chat-main');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load history from IndexedDB on mount
  useEffect(() => {
    const allChannels: ChatChannel[] = [
      ChatChannels.Local,
      ChatChannels.Global,
      ChatChannels.Party,
      ChatChannels.Guild,
      ChatChannels.Admin,
      ChatChannels.System,
    ];
    Promise.all(
      allChannels.map((ch) => getChatMessages(characterId, ch, MAX_MESSAGES)),
    ).then((results) => {
      setMessages((prev) => {
        const next = new Map(prev);
        for (let i = 0; i < allChannels.length; i++) {
          next.set(allChannels[i], results[i]);
        }
        return next;
      });
    });
  }, [characterId]);

  const addMessage = useCallback((msg: ChatMessage) => {
    saveChatMessage(msg);

    const { channel } = msg;
    const currentDialogs = dialogsRef.current;

    // PM channel → auto-create a dedicated tab in chat-main
    if (isPMChannel(channel)) {
      const alreadyTracked = currentDialogs.some((d) =>
        d.tabs.some((t) => t.channels.includes(channel)),
      );
      if (!alreadyTracked) {
        const name = pmChannelName(channel);
        const newTabId = `pm-${channel.replace('pm:', '')}`;
        setDialogs((prev) =>
          prev.map((d) => {
            if (d.id !== 'chat-main') return d;
            const newTab: ChatTabConfig = {
              id: newTabId,
              name: name.charAt(0).toUpperCase() + name.slice(1),
              channels: [channel],
            };
            return {
              ...d,
              tabs: [...d.tabs, newTab],
              activeTabId: newTabId,
            };
          }),
        );
        // New PM tab starts as "unread" immediately since we auto-switch to it,
        // but setActiveTab will clear it — nothing to do here.
      }
    }

    // Mark any non-active tabs that subscribe to this channel as unread
    setUnreadTabs((prev) => {
      const next = new Set(prev);
      for (const dialog of currentDialogs) {
        for (const tab of dialog.tabs) {
          if (tab.channels.includes(channel) && tab.id !== dialog.activeTabId) {
            next.add(tab.id);
          }
        }
      }
      return next;
    });

    setMessages((prev) => {
      const next = new Map(prev);
      const existing = next.get(channel) ?? [];
      next.set(channel, [...existing.slice(-(MAX_MESSAGES - 1)), msg]);
      return next;
    });
  }, []);

  // Subscribe to client chat events
  useEffect(() => {
    const handleChat = (data: {
      channel: ChatChannel;
      message: string;
      icon?: number | null;
      name?: string;
    }) => {
      addMessage({
        id: `${Date.now()}-${Math.random()}`,
        characterId,
        channel: data.channel,
        name: data.name,
        message: data.message,
        icon: data.icon,
        timestampUtc: Date.now(),
      });
    };
    const handleServerChat = (data: {
      message: string;
      icon?: number | null;
    }) => {
      addMessage({
        id: `${Date.now()}-${Math.random()}`,
        characterId,
        channel: ChatChannels.System,
        message: data.message,
        icon: data.icon,
        timestampUtc: Date.now(),
      });
    };
    client.on('chat', handleChat);
    client.on('serverChat', handleServerChat);
    return () => {
      client.off('chat', handleChat);
      client.off('serverChat', handleServerChat);
    };
  }, [client, characterId, addMessage]);

  // Persist dialog configs when they change
  useEffect(() => {
    saveDialogConfigs(dialogs);
  }, [dialogs]);

  const closeTab = useCallback((tabId: string, dialogId: ChatDialogId) => {
    setDialogs((prev) => {
      const dialog = prev.find((d) => d.id === dialogId);
      const tab = dialog?.tabs.find((t) => t.id === tabId);
      if (!tab) return prev;

      const withoutTab = prev.map((d) => {
        if (d.id !== dialogId) return d;
        const newTabs = d.tabs.filter((t) => t.id !== tabId);
        return {
          ...d,
          tabs: newTabs,
          activeTabId:
            d.activeTabId === tabId ? (newTabs[0]?.id ?? '') : d.activeTabId,
        };
      });

      return repatriateChannels(withoutTab, tab.channels);
    });
  }, []);

  const setActiveTab = useCallback((dialogId: ChatDialogId, tabId: string) => {
    setDialogs((prev) =>
      prev.map((d) => (d.id === dialogId ? { ...d, activeTabId: tabId } : d)),
    );
    setUnreadTabs((prev) => {
      if (!prev.has(tabId)) return prev;
      const next = new Set(prev);
      next.delete(tabId);
      return next;
    });
  }, []);

  const splitChannelToNewTab = useCallback(
    (channel: ChatChannel, fromTabId: string, dialogId: ChatDialogId) => {
      setDialogs((prev) => {
        const dialog = prev.find((d) => d.id === dialogId);
        const fromTab = dialog?.tabs.find((t) => t.id === fromTabId);
        if (!fromTab?.channels.includes(channel)) return prev;

        const newTabId = `tab-${channel}-${Math.random().toString(36).slice(2, 6)}`;
        const newTab: ChatTabConfig = {
          id: newTabId,
          name: channelLabel(channel),
          channels: [channel],
        };

        return prev.map((d) => {
          if (d.id !== dialogId) return d;
          return {
            ...d,
            tabs: [
              ...d.tabs
                .map((t) =>
                  t.id === fromTabId
                    ? {
                        ...t,
                        channels: t.channels.filter((c) => c !== channel),
                      }
                    : t,
                )
                .filter((t) => t.channels.length > 0),
              newTab,
            ],
            activeTabId: newTabId,
          };
        });
      });
    },
    [],
  );

  const setTabChannels = useCallback(
    (tabId: string, dialogId: ChatDialogId, newChannels: ChatChannel[]) => {
      setDialogs((prev) => {
        const dialog = prev.find((d) => d.id === dialogId);
        const tab = dialog?.tabs.find((t) => t.id === tabId);
        if (!tab) return prev;

        const removed = tab.channels.filter((ch) => !newChannels.includes(ch));
        const added = newChannels.filter((ch) => !tab.channels.includes(ch));

        let next = prev.map((d) => ({
          ...d,
          tabs: d.tabs.map((t) => {
            if (t.id === tabId && d.id === dialogId) {
              return { ...t, channels: newChannels };
            }
            const stripped = t.channels.filter((ch) => !added.includes(ch));
            if (stripped.length === t.channels.length) return t;
            return { ...t, channels: stripped };
          }),
        }));

        next = repatriateChannels(next, removed);

        next = next
          .map((d) => ({
            ...d,
            tabs: d.tabs.filter((t) => t.channels.length > 0 || t.id === tabId),
          }))
          .filter((d) => d.id === 'chat-main' || d.tabs.length > 0);

        return next;
      });
    },
    [],
  );

  return (
    <ChatManagerContext.Provider
      value={{
        dialogs,
        messages,
        unreadTabs,
        splitChannelToNewTab,
        setTabChannels,
        closeTab,
        setActiveTab,
      }}
    >
      {children}
    </ChatManagerContext.Provider>
  );
}

export function useChatManager(): ChatManagerContextValue {
  const ctx = useContext(ChatManagerContext);
  if (!ctx)
    throw new Error('useChatManager must be used within ChatManagerProvider');
  return ctx;
}
