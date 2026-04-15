import { AdminLevel } from 'eolib';
import { flushSync } from 'preact/compat';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { LuPlus, LuSearch } from 'react-icons/lu';
import { playSfxById, SfxId } from '@/sfx';
import { useClient } from '@/ui/context';
import {
  type ChatChannel,
  ChatChannels,
  channelColor,
  channelLabel,
} from '@/ui/enums';
import { DialogBase, useViewport, useWindowManager } from '@/ui/in-game';
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
  const client = useClient();
  const { vw } = useViewport();
  const shown = messages
    .slice(-PREVIEW_MAX_MESSAGES)
    .filter((m) => msgOpacity(m.timestampUtc, now) > 0);

  const handleFocus = useCallback(() => {
    playSfxById(SfxId.TextBoxFocus);
    client.mouseController.setIgnoreNextClick();
    onFocus();
  }, [onFocus, client]);

  const ghostInput = (
    <button
      type='button'
      class='btn btn-ghost btn-xs mx-1 w-full justify-start border border-base-200/20 bg-base-200/30 text-left font-normal normal-case'
      onClick={handleFocus}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span class='text-base-content/50 text-xs'>
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

function ChatLogButton() {
  const { toggleDialog } = useWindowManager();

  const handleClick = useCallback(() => {
    playSfxById(SfxId.ButtonClick);
    toggleDialog('chat-log');
  }, [toggleDialog]);

  return (
    <button
      type='button'
      class='btn btn-ghost btn-xs btn-circle opacity-60 hover:opacity-100'
      aria-label='Chat log'
      onClick={handleClick}
    >
      <LuSearch size={13} />
    </button>
  );
}

function AddTabButton() {
  const client = useClient();
  const { dialog, splitChannelToNewTab } = useChatManager();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isAdmin = client.admin !== AdminLevel.Player;

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
      splitChannelToNewTab(ch, generalTab.id);
      setOpen(false);
    },
    [generalTab, splitChannelToNewTab],
  );

  return (
    <div class='relative shrink-0' ref={ref}>
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

export function ChatDialog() {
  const client = useClient();
  const { dialog, messages } = useChatManager();
  const isMobile = useIsMobile();
  const { vw } = useViewport();

  const [focused, setFocused] = useState(false);
  const [now, setNow] = useState(Date.now);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const onFocus = useCallback(() => {
    // flushSync forces a synchronous render so the ChatInput is in the DOM
    // before we call focus() — required for iOS which only allows programmatic
    // focus inside a synchronous user-gesture call stack.
    flushSync(() => setFocused(true));
    inputRef.current?.focus();
  }, []);

  // Pressing Enter while preview is showing opens the chat
  useEffect(() => {
    if (focused) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.repeat) {
        playSfxById(SfxId.TextBoxFocus);
        onFocus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [focused, onFocus]);

  // Tick `now` when showing preview so message opacity animations run
  useEffect(() => {
    if (focused) return;
    const timerId = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timerId);
  }, [focused]);

  // Unfocus when user clicks/taps outside the chat dialog
  useEffect(() => {
    if (!focused) return;
    const handler = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setFocused(false);
        client.mouseController.setIgnoreNextClick();
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [focused]);

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
  if (!focused) {
    return <ChatPreview messages={tabMessages} now={now} onFocus={onFocus} />;
  }

  // On mobile the main chat uses a full-width-ish panel layout instead of DialogBase
  if (isMobile) {
    return (
      <div
        ref={containerRef}
        role='presentation'
        class='flex flex-col overflow-hidden rounded-lg border border-base-content/10 bg-base-300/90 backdrop-blur-sm'
        style={{
          width: Math.min(340, vw - 16),
          maxHeight: '45vh',
        }}
      >
        <div class='flex items-center gap-1 border-base-content/10 border-b bg-base-content/5 px-2 py-0.5'>
          <ChatTabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onFocusInput={focusInput}
          />
          <AddTabButton />
          <ChatLogButton />
        </div>
        <ChatMessageList
          tab={activeTab}
          messages={tabMessages}
          heightClass='flex-1 min-h-0 overflow-y-auto'
        />
        <ChatInput
          ref={inputRef}
          tab={activeTab}
          onActivity={onFocus}
          onDismiss={() => setFocused(false)}
        />
      </div>
    );
  }

  const titleContent = (
    <div class='flex min-w-0 flex-1 items-center gap-1'>
      <ChatTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onFocusInput={focusInput}
      />
      <AddTabButton />
      <ChatLogButton />
    </div>
  );

  const dialogWidth = Math.min(340, vw - 64);

  return (
    <div ref={containerRef} role='presentation'>
      <DialogBase
        id='chat'
        title='Chat'
        titleContent={titleContent}
        defaultWidth={dialogWidth}
        hideControls={true}
        noDrag={true}
        noPadding={true}
      >
        <div class='flex flex-col overflow-hidden rounded-b-lg'>
          <ChatMessageList
            tab={activeTab}
            messages={tabMessages}
            heightClass='h-[22vh]'
          />
          <ChatInput
            ref={inputRef}
            tab={activeTab}
            onActivity={onFocus}
            onDismiss={() => setFocused(false)}
          />
        </div>
      </DialogBase>
    </div>
  );
}
