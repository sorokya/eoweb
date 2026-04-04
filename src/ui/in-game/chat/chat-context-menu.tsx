import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  type ChatChannel,
  ChatChannels,
  channelColor,
  channelLabel,
} from '@/ui/enums';
import type { ChatDialogId } from '@/ui/in-game';
import type { ChatTabConfig } from './chat-manager';
import { useChatManager } from './chat-manager';

/** All static channels that can appear in the checklist. */
const ALL_CHANNELS: ChatChannel[] = [
  ChatChannels.Local,
  ChatChannels.Global,
  ChatChannels.Party,
  ChatChannels.Guild,
  ChatChannels.Admin,
  ChatChannels.System,
];

type Props = {
  x: number;
  y: number;
  tab: ChatTabConfig;
  dialogId: ChatDialogId;
  onClose: () => void;
};

export function ChatContextMenu({ x, y, tab, dialogId, onClose }: Props) {
  const { setTabChannels } = useChatManager();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [onClose]);

  const toggleChannel = useCallback(
    (ch: ChatChannel) => {
      const current = tab.channels;
      const next = current.includes(ch)
        ? current.filter((c) => c !== ch)
        : [...current, ch];
      // Must keep at least one channel in a tab
      if (next.length === 0) return;
      setTabChannels(tab.id, dialogId, next);
    },
    [tab, dialogId, setTabChannels],
  );

  return (
    <div
      ref={ref}
      class='fixed bg-base-300 border border-base-200 rounded shadow-lg z-50 overflow-hidden text-xs'
      style={{ left: x, top: y, minWidth: 160 }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div class='px-3 py-1 opacity-50 font-semibold border-b border-base-200 select-none'>
        Channels
      </div>
      {ALL_CHANNELS.map((ch) => {
        const checked = tab.channels.includes(ch);
        return (
          <button
            key={ch}
            type='button'
            class='flex items-center gap-2 w-full text-left px-3 py-1.5 hover:bg-base-100'
            onClick={() => toggleChannel(ch)}
          >
            <span
              class={`text-base leading-none ${checked ? 'opacity-100' : 'opacity-20'}`}
            >
              {checked ? '☑' : '☐'}
            </span>
            <span class={channelColor(ch)}>{channelLabel(ch)}</span>
          </button>
        );
      })}
    </div>
  );
}

type ContextMenuState = {
  x: number;
  y: number;
  tab: ChatTabConfig;
} | null;

export function useContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState>(null);

  const openMenu = useCallback((x: number, y: number, tab: ChatTabConfig) => {
    setMenu({ x, y, tab });
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);

  return { menu, openMenu, closeMenu };
}
