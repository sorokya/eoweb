import { createContext } from 'preact';
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'preact/hooks';
import { getChatMessages, type StoredChatMessage, saveChatMessage } from '@/db';
import { playSfxById, SfxId } from '@/sfx';
import { useClient } from '@/ui/context';
import {
  type ChatChannel,
  ChatChannels,
  channelLabel,
  isPMChannel,
  pmChannelName,
} from '@/ui/enums';
import { type DialogId, useWindowManager } from '@/ui/in-game';
import { capitalize } from '@/utils';

const STORAGE_KEY = 'eoweb:chat:dialogs:v3';
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
  id: DialogId;
  tabs: ChatTabConfig[];
  activeTabId: string;
};

const DEFAULT_DIALOG: ChatDialogConfig = {
  id: 'chat',
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
};

function loadDialogConfig(): ChatDialogConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed) {
        // Only keep chat; strip PM channels from saved tabs; reset active tab
        const d = parsed as ChatDialogConfig;
        return {
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
        };
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_DIALOG;
}

function saveDialogConfig(config: ChatDialogConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* ignore */
  }
}

/**
 * Return channels to chat after a tab is closed:
 *  - System channel → System tab (created if missing)
 *  - Non-PM, non-System channels → General tab (created if missing)
 *  - PM channels are dropped (ephemeral)
 */
function repatriateChannels(
  dialog: ChatDialogConfig,
  channels: ChatChannel[],
): ChatDialogConfig {
  const generalOrphans = channels.filter(
    (ch) => ch !== ChatChannels.System && !isPMChannel(ch),
  );
  const systemOrphans = channels.includes(ChatChannels.System);

  if (!generalOrphans.length && !systemOrphans) return dialog;

  let tabs = dialog.tabs;
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

  return {
    ...dialog,
    tabs,
  };
}

type ChatManagerContextValue = {
  dialog: ChatDialogConfig;
  messages: Map<string, ChatMessage[]>;
  /** Set of tab IDs that have unread messages (received since last viewed). */
  unreadTabs: Set<string>;
  /** Split a single channel out of a tab into a new tab within the same dialog. */
  splitChannelToNewTab: (channel: ChatChannel, fromTabId: string) => void;
  /** Remove a tab from a dialog, repatriating its non-PM channels back to General/System. */
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
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
  const [dialog, setDialog] = useState<ChatDialogConfig>(() =>
    loadDialogConfig(),
  );
  const [messages, setMessages] = useState<Map<string, ChatMessage[]>>(
    new Map(),
  );
  const [unreadTabs, setUnreadTabs] = useState<Set<string>>(new Set());

  const dialogRef = useRef(dialog);
  dialogRef.current = dialog;

  // Open chat in the WM on mount
  useEffect(() => {
    openDialog('chat');
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
    const currentDialog = dialogRef.current;

    // PM channel → auto-create a dedicated tab in chat
    if (isPMChannel(channel)) {
      const alreadyTracked = currentDialog.tabs.some((t) =>
        t.channels.includes(channel),
      );
      if (!alreadyTracked) {
        const name = pmChannelName(channel);
        const newTabId = `pm-${channel.replace('pm:', '')}`;
        setDialog((prev) => ({
          ...prev,
          tabs: [
            ...prev.tabs,
            {
              id: newTabId,
              name: capitalize(name),
              channels: [channel],
            },
          ],
          activeTabId: newTabId,
        }));
        // New PM tab starts as "unread" immediately since we auto-switch to it,
        // but setActiveTab will clear it — nothing to do here.
      }
    }

    // Mark any non-active tabs that subscribe to this channel as unread
    setUnreadTabs((prev) => {
      const next = new Set(prev);
      for (const tab of currentDialog.tabs) {
        if (tab.channels.includes(channel) && tab.id !== dialog.activeTabId) {
          next.add(tab.id);
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
    saveDialogConfig(dialog);
  }, [dialog]);

  const closeTab = useCallback((tabId: string) => {
    setDialog((prev) => {
      const tab = prev.tabs.find((t) => t.id === tabId);
      if (!tab) return prev;

      const newTabs = prev.tabs.filter((t) => t.id !== tabId);
      const withoutTab = {
        ...prev,
        tabs: newTabs,
        activeTabId:
          prev.activeTabId === tabId
            ? (newTabs[0]?.id ?? '')
            : prev.activeTabId,
      };

      return repatriateChannels(withoutTab, tab.channels);
    });
  }, []);

  const setActiveTab = useCallback((tabId: string) => {
    setDialog((prev) => ({ ...prev, activeTabId: tabId }));
    setUnreadTabs((prev) => {
      if (!prev.has(tabId)) return prev;
      const next = new Set(prev);
      next.delete(tabId);
      return next;
    });
    playSfxById(SfxId.ButtonClick);
  }, []);

  const splitChannelToNewTab = useCallback(
    (channel: ChatChannel, fromTabId: string) => {
      setDialog((prev) => {
        const fromTab = prev.tabs.find((t) => t.id === fromTabId);
        if (!fromTab?.channels.includes(channel)) return prev;

        const newTabId = `tab-${channel}-${Math.random().toString(36).slice(2, 6)}`;
        const newTab: ChatTabConfig = {
          id: newTabId,
          name: channelLabel(channel),
          channels: [channel],
        };

        return {
          ...prev,
          tabs: [
            ...prev.tabs
              .map((t) =>
                t.id === fromTabId
                  ? {
                      ...t,
                      channels: t.channels.filter((ch) => ch !== channel),
                    }
                  : t,
              )
              .filter((t) => t.channels.length > 0),
            newTab,
          ],
          activeTabId: newTabId,
        };
      });
    },
    [],
  );

  return (
    <ChatManagerContext.Provider
      value={{
        dialog,
        messages,
        unreadTabs,
        splitChannelToNewTab,
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
