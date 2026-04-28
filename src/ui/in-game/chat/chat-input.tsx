import { forwardRef } from 'preact/compat';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';
import { formatLocaleString } from '@/locale';
import { useClient, useLocale } from '@/ui/context';
import {
  type ChatChannel,
  ChatChannels,
  isPMChannel,
  pmChannelName,
} from '@/ui/enums';
import type { ChatTabConfig } from './chat-manager';

/** Channels that cannot receive user-sent messages. */
const READ_ONLY_CHANNELS: ChatChannel[] = [ChatChannels.System];

function isTabReadOnly(tab: ChatTabConfig): boolean {
  return tab.channels.every((ch) => READ_ONLY_CHANNELS.includes(ch));
}

/** For single-channel tabs, the prefix to prepend automatically. */
function getAutoPrefix(channel: ChatChannel): string {
  if (isPMChannel(channel)) return `!${pmChannelName(channel)} `;
  if (channel === ChatChannels.Global) return '~';
  if (channel === ChatChannels.Party) return "'";
  if (channel === ChatChannels.Guild) return '&';
  if (channel === ChatChannels.Admin) return '+';
  return ''; // Local and System need no prefix
}

type Props = {
  tab: ChatTabConfig;
  onActivity?: () => void;
  /** Called when the user dismisses chat (Esc or Enter on empty input). */
  onDismiss?: () => void;
  /** Whether to auto-focus the input on mount / tab change. Default: true. */
  autoFocus?: boolean;
  position: 'top' | 'bottom';
};

export const ChatInput = forwardRef<HTMLInputElement, Props>(function ChatInput(
  { tab, onActivity, onDismiss, autoFocus = true, position },
  forwardedRef,
) {
  const client = useClient();
  const { locale } = useLocale();
  const [input, setInput] = useState('');
  const internalRef = useRef<HTMLInputElement>(null);

  const readOnly = isTabReadOnly(tab);
  const isSingleChannel = tab.channels.length === 1;
  const sendChannel = isSingleChannel ? tab.channels[0] : null;

  // Must be before any conditional return to satisfy rules of hooks.
  // Re-fires when tab changes so switching to a new tab refocuses the input.
  useEffect(() => {
    if (!readOnly && autoFocus) {
      internalRef.current?.focus();
    }
  }, [readOnly, tab.id, autoFocus]);

  useEffect(() => {
    if (readOnly) return;
    const handleSetChat = (text: string) => {
      setInput(text);
      internalRef.current?.focus();
    };
    client.chatController.subscribeSetChat(handleSetChat);
    return () => {
      client.chatController.unsubscribeSetChat(handleSetChat);
    };
  }, [client, readOnly]);

  const handleSend = useCallback(() => {
    if (readOnly) return;
    const text = input.trim();
    if (!text) return;

    if (sendChannel) {
      // Single-channel tab: auto-apply the correct prefix
      const prefix = getAutoPrefix(sendChannel);
      client.chatController.chat(`${prefix}${text}`);
    } else {
      // Multi-channel tab: send as-is (user types prefix manually)
      client.chatController.chat(text);
    }
    setInput('');
  }, [client, input, readOnly, sendChannel]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape') {
        onDismiss?.();
        return;
      }
      if (e.key === 'Enter') {
        if (!input.trim()) {
          onDismiss?.();
        } else {
          handleSend();
        }
      }
    },
    [handleSend, input, onDismiss],
  );

  const borderStyles = useMemo(() => {
    if (position === 'bottom') {
      return 'rounded-t-none rounded-bl-none rounded-tr-md';
    }
    return 'rounded-b-none rounded-tl-md rounded-tr-none';
  }, [position]);

  if (readOnly) {
    return (
      <div class='flex border-base-content/10 border-t px-2 py-1 text-xs italic opacity-40'>
        {locale.chat.readOnly}
      </div>
    );
  }

  const placeholder =
    sendChannel && isPMChannel(sendChannel)
      ? formatLocaleString(locale.chat.sendTo, {
          name: pmChannelName(sendChannel),
        })
      : locale.chat.saySomething;

  return (
    <div class='flex rounded-b-large border-base-content/10 border-t'>
      <input
        ref={(el) => {
          internalRef.current = el;
          if (typeof forwardedRef === 'function') {
            forwardedRef(el);
          } else if (forwardedRef) {
            forwardedRef.current = el;
          }
        }}
        type='text'
        class={`input input-xs flex-1 ${borderStyles} bg-transparent text-xs focus:outline-none`}
        placeholder={placeholder}
        value={input}
        onInput={(e) => {
          setInput((e.target as HTMLInputElement).value);
          onActivity?.();
        }}
        onFocus={onActivity}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      />
      <button
        type='button'
        class='btn btn-ghost btn-xs rounded-none px-2 text-base'
        onClick={(e) => {
          e.stopPropagation();
          handleSend();
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        ↵
      </button>
    </div>
  );
});
