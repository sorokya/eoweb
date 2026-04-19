import { AdminLevel } from 'eolib';
import { flushSync } from 'preact/compat';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { LuPlus, LuSearch } from 'react-icons/lu';
import { playSfxById, SfxId } from '@/sfx';
import { useClient, useLocale } from '@/ui/context';
import {
  type ChatChannel,
  ChatChannels,
  channelColor,
  channelLabel,
} from '@/ui/enums';
import { useViewport, useWindowManager } from '@/ui/in-game';
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
  const { locale } = useLocale();
  const { vw } = useViewport();
  const shown = messages
    .slice(-PREVIEW_MAX_MESSAGES)
    .filter((m) => msgOpacity(m.timestampUtc, now) > 0);

  const handleFocus = useCallback(() => {
    playSfxById(SfxId.TextBoxFocus);
    onFocus();
  }, [onFocus]);

  const ghostInput = (
    <button
      type='button'
      class='btn btn-ghost btn-xs mx-1 w-full justify-start border border-base-200/20 bg-base-200/30 text-left font-normal normal-case'
      onClick={handleFocus}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span class='text-base-content/50 text-xs'>
        {isMobile ? locale.chatTapToChat : locale.chatPressEnterToChat}
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
          <span class={`font-semibold ${channelColor(msg.channel)}`}>
            [{channelLabel(msg.channel)}]
          </span>
          {msg.name && (
            <span>
              {' '}
              <span class='font-semibold'>{msg.name}:</span>
            </span>
          )}
          <span> {msg.message}</span>
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
  const { locale } = useLocale();

  const handleClick = useCallback(() => {
    playSfxById(SfxId.ButtonClick);
    toggleDialog('chat-log');
  }, [toggleDialog]);

  return (
    <button
      type='button'
      class='btn btn-ghost btn-xs btn-circle opacity-60 hover:opacity-100'
      aria-label={locale.chatLogAriaLabel}
      onClick={handleClick}
    >
      <LuSearch size={13} />
    </button>
  );
}

function AddTabButton() {
  const client = useClient();
  const { dialog, splitChannelToNewTab } = useChatManager();
  const { locale } = useLocale();
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
        title={locale.chatOpenChannelInNewTab}
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
  const { dialog, messages, openChatSignal } = useChatManager();
  const isMobile = useIsMobile();
  const { vw } = useViewport();

  const [focused, setFocused] = useState(false);
  const [now, setNow] = useState(Date.now);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const focusedRef = useRef(false);

  const onFocus = useCallback(() => {
    // flushSync forces a synchronous render so the ChatInput is in the DOM
    // before we call focus() — required for iOS which only allows programmatic
    // focus inside a synchronous user-gesture call stack.
    focusedRef.current = true;
    flushSync(() => setFocused(true));
    inputRef.current?.focus();
  }, []);

  const onDismiss = useCallback(() => {
    focusedRef.current = false;
    setFocused(false);
  }, []);

  // External signal (e.g. whisper from social dialog) opens the chat.
  // We must NOT call onFocus() here — flushSync inside useEffect breaks the
  // blur-handler effect. Instead just set state; a separate effect focuses input.
  const prevSignalRef = useRef(openChatSignal);
  useEffect(() => {
    if (openChatSignal !== prevSignalRef.current) {
      prevSignalRef.current = openChatSignal;
      focusedRef.current = true;
      setFocused(true);
    }
  }, [openChatSignal]);

  // Focus the input whenever we enter the focused state (covers the signal path
  // above where flushSync is not available).
  useEffect(() => {
    if (focused) {
      inputRef.current?.focus();
    }
  }, [focused]);

  // Pressing Enter while preview is showing opens the chat.
  // Guard with focusedRef so even if two handlers fire (e.g. Preact effect
  // timing edge cases), the sound and open only happen once.
  useEffect(() => {
    if (focused) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.repeat && !focusedRef.current) {
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

  // Unfocus when user clicks/taps outside the chat dialog.
  // Capture phase ensures we see the event even when child elements call
  // stopPropagation (e.g. mobile nav dropdown, other dialogs).
  useEffect(() => {
    if (!focused) return;
    const handler = (e: PointerEvent) => {
      if (!focusedRef.current) return;
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        focusedRef.current = false;
        setFocused(false);
        client.mouseController.setIgnoreNextClick();
      }
    };
    document.addEventListener('pointerdown', handler, { capture: true });
    return () =>
      document.removeEventListener('pointerdown', handler, { capture: true });
  }, [focused, client]);

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
        <ChatInput
          ref={inputRef}
          tab={activeTab}
          onActivity={onFocus}
          onDismiss={onDismiss}
          position='top'
        />
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
          messages={tabMessages}
          heightClass='flex-1 min-h-0 overflow-y-auto'
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
      <div
        class='flex flex-col overflow-visible rounded-lg border border-base-content/10 bg-base-300/80 shadow-sm backdrop-blur-sm'
        style={{
          width: dialogWidth,
          minWidth: 160,
          flexShrink: 0,
          touchAction: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
      >
        <div class='flex items-center gap-1 rounded-t-lg bg-base-content/5 px-2 py-1.5'>
          <div class='flex min-w-0 flex-1 items-center gap-1'>
            {titleContent}
          </div>
        </div>
        <div class='flex flex-col overflow-hidden rounded-b-lg'>
          <ChatMessageList messages={tabMessages} heightClass='h-[22vh]' />
          <ChatInput
            ref={inputRef}
            tab={activeTab}
            onActivity={onFocus}
            onDismiss={onDismiss}
            position='bottom'
          />
        </div>
      </div>
    </div>
  );
}
