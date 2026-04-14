import { AdminLevel } from 'eolib';
import type { RefObject } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { LuPlus } from 'react-icons/lu';
import { useClient } from '@/ui/context';
import {
  type ChatChannel,
  ChatChannels,
  channelColor,
  channelLabel,
} from '@/ui/enums';
import type { ChatDialogId } from '@/ui/in-game';
import { DialogBase, useViewport } from '@/ui/in-game';
import { isMobile } from '@/utils';
import { ChatInput } from './chat-input';
import type { ChatMessage } from './chat-manager';
import { useChatManager } from './chat-manager';
import { ChatMessageList } from './chat-message-list';
import { ChatTabBar } from './chat-tab-bar';

function useIsMobile() {
  const [mobile, setMobile] = useState(() => isMobile());
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}

const MAIN_DIALOG_ID = 'chat-main';

/** Channels available to split from the main General tab into a new tab. */
const DETACH_CHANNELS: ChatChannel[] = [
  ChatChannels.Local,
  ChatChannels.Global,
  ChatChannels.Party,
  ChatChannels.Guild,
  ChatChannels.Admin,
];

// Per-message fade timing for chat preview
const PREVIEW_FADE_START_MS = 3_000;
const PREVIEW_FADE_END_MS = 8_000;
const PREVIEW_MAX_MESSAGES = 6;

function msgOpacity(timestampUtc: number, now: number): number {
  const age = now - timestampUtc;
  if (age < PREVIEW_FADE_START_MS) return 1;
  if (age > PREVIEW_FADE_END_MS) return 0;
  return (
    1 -
    (age - PREVIEW_FADE_START_MS) /
      (PREVIEW_FADE_END_MS - PREVIEW_FADE_START_MS)
  );
}

// ---------------------------------------------------------------------------

type PreviewProps = {
  messages: ChatMessage[];
  now: number;
  onFocus: () => void;
};

function ChatPreview({ messages, now, onFocus }: PreviewProps) {
  const isMobile = useIsMobile();
  const { vw } = useViewport();
  const shown = messages
    .slice(-PREVIEW_MAX_MESSAGES)
    .filter((m) => msgOpacity(m.timestampUtc, now) > 0);

  const ghostInput = (
    <button
      type='button'
      class='mx-1 w-full cursor-text rounded-lg border border-base-content/10 bg-base-content/10 px-3 py-1.5 text-left'
      onClick={onFocus}
    >
      <span class='text-white/25 text-xs'>
        {isMobile ? 'Tap to chat…' : 'Press enter to chat…'}
      </span>
    </button>
  );

  const messageList = shown.length > 0 && (
    <div class='flex flex-col gap-0.5 px-1 py-0.5'>
      {shown.map((msg) => (
        <div
          key={msg.id}
          class='wrap-break-word text-xs leading-tight'
          style={{ opacity: msgOpacity(msg.timestampUtc, now) }}
        >
          <span
            class={`font-semibold ${channelColor(msg.channel)} drop-shadow-[0_1px_2px_rgba(0,0,0,1)]`}
          >
            [{channelLabel(msg.channel)}]
          </span>
          {msg.name && (
            <span class='drop-shadow-[0_1px_2px_rgba(0,0,0,1)]'>
              {' '}
              <span class='font-semibold'>{msg.name}:</span>
            </span>
          )}
          <span class='drop-shadow-[0_1px_2px_rgba(0,0,0,1)]'>
            {' '}
            {msg.message}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div
      role='presentation'
      class='flex flex-col gap-0.5'
      style={{ width: Math.min(340, vw - 64) }}
      onPointerDown={onFocus}
    >
      {isMobile ? (
        <>
          {ghostInput}
          {messageList}
        </>
      ) : (
        <>
          {messageList}
          {ghostInput}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function AddTabButton({ dialogId }: { dialogId: ChatDialogId }) {
  const client = useClient();
  const { dialogs, splitChannelToNewTab } = useChatManager();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isAdmin = client.admin !== AdminLevel.Player;

  const dialog = dialogs.find((d) => d.id === dialogId);
  const generalTab = dialog?.tabs.find((t) => t.id === 'general');
  const availableChannels = DETACH_CHANNELS.filter((ch) => {
    if (ch === ChatChannels.Admin && !isAdmin) return false;
    return generalTab?.channels.includes(ch) ?? false;
  });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  const handleAdd = useCallback(
    (ch: ChatChannel) => {
      if (!generalTab) return;
      splitChannelToNewTab(ch, generalTab.id, dialogId);
      setOpen(false);
    },
    [generalTab, dialogId, splitChannelToNewTab],
  );

  if (availableChannels.length === 0) return null;

  return (
    <div class='relative flex-shrink-0' ref={ref}>
      <button
        type='button'
        class='btn btn-ghost btn-xs btn-circle opacity-60 hover:opacity-100'
        title='Open channel in new tab'
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <LuPlus size={13} />
      </button>
      {open && (
        <ul
          class='menu menu-xs absolute top-full right-0 z-50 mt-1 rounded border border-base-content/10 bg-base-300 p-1 shadow-lg'
          style={{ minWidth: 130 }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {availableChannels.map((ch) => (
            <li key={ch}>
              <button type='button' onClick={() => handleAdd(ch)}>
                <span class={`font-semibold ${channelColor(ch)}`}>
                  {channelLabel(ch)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

type Props = {
  id: ChatDialogId;
};

export function ChatDialog({ id }: Props) {
  const { dialogs, messages } = useChatManager();
  const dialog = dialogs.find((d) => d.id === id);
  const isMobile = useIsMobile();
  const { vw } = useViewport();

  const isMain = id === MAIN_DIALOG_ID;
  const [focused, setFocused] = useState(!isMain);
  const [now, setNow] = useState(Date.now);
  const containerRef = useRef<HTMLDivElement>(null);

  const onFocus = useCallback(() => {
    if (isMain) setFocused(true);
  }, [isMain]);

  // On desktop: pressing Enter while preview is showing opens the chat
  useEffect(() => {
    if (!isMain || focused || isMobile) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.repeat) onFocus();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isMain, focused, isMobile, onFocus]);

  // Tick `now` when showing preview so message opacity animations run
  useEffect(() => {
    if (!isMain || focused) return;
    const timerId = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timerId);
  }, [isMain, focused]);

  // Unfocus when user clicks/taps outside the chat dialog
  useEffect(() => {
    if (!isMain || !focused) return;
    const handler = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setFocused(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [isMain, focused]);

  const tabs = dialog?.tabs ?? [];
  const activeTabId = dialog?.activeTabId ?? '';
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const tabMessages = activeTab
    ? activeTab.channels
        .flatMap((ch) => messages.get(ch) ?? [])
        .sort((a, b) => a.timestampUtc - b.timestampUtc)
    : [];

  if (!dialog || !activeTab) return null;

  // Unfocused: chromeless preview
  if (isMain && !focused) {
    return <ChatPreview messages={tabMessages} now={now} onFocus={onFocus} />;
  }

  const dialogWidth = Math.min(340, vw - 64);

  const titleContent = (
    <div class='flex min-w-0 flex-1 items-center gap-1'>
      {tabs.length > 1 ? (
        <ChatTabBar
          dialogId={id}
          tabs={tabs}
          activeTabId={activeTabId}
          isMain={isMain}
        />
      ) : (
        <span class='px-1 font-semibold text-xs'>{activeTab.name}</span>
      )}
      {isMain && <AddTabButton dialogId={id} />}
    </div>
  );

  // On mobile the main chat uses a full-width-ish panel layout instead of DialogBase
  if (isMain && isMobile) {
    return (
      <div
        ref={containerRef}
        role='presentation'
        class='flex flex-col rounded-t border border-base-content/10 bg-base-300/90 backdrop-blur-sm'
        style={{
          width: Math.min(340, vw - 16),
          maxHeight: '45vh',
        }}
      >
        <ChatInput tab={activeTab} onActivity={onFocus} />
        {tabs.length > 1 && (
          <div class='flex items-center gap-1 border-base-content/10 border-b bg-base-content/5 px-2 py-0.5'>
            <ChatTabBar
              dialogId={id}
              tabs={tabs}
              activeTabId={activeTabId}
              isMain={isMain}
            />
            <AddTabButton dialogId={id} />
          </div>
        )}
        <ChatMessageList
          tab={activeTab}
          messages={tabMessages}
          heightClass='flex-1 min-h-0 overflow-y-auto'
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} role='presentation'>
      <DialogBase
        id={id}
        title='Chat'
        titleContent={titleContent}
        defaultWidth={dialogWidth}
        hideControls={isMain}
        noDrag={isMain}
      >
        <div class='-mx-3 -mb-3 flex flex-col'>
          <ChatMessageList
            tab={activeTab}
            messages={tabMessages}
            heightClass='h-[22vh]'
          />
          <ChatInput
            tab={activeTab}
            onActivity={isMain ? onFocus : undefined}
            onDismiss={isMain ? () => setFocused(false) : undefined}
          />
        </div>
      </DialogBase>
    </div>
  );
}
