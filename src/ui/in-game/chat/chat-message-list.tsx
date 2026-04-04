import { useEffect, useRef } from 'preact/hooks';
import { channelColor, channelLabel, isPMChannel } from '@/ui/enums';
import type { ChatMessage, ChatTabConfig } from './chat-manager';

type Props = {
  tab: ChatTabConfig;
  messages: ChatMessage[];
  /** Tailwind class controlling the max-height of the scrollable list. */
  heightClass?: string;
};

function formatTime(utcMs: number): string {
  const d = new Date(utcMs);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}

export function ChatMessageList({
  tab,
  messages,
  heightClass = 'max-h-40',
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const showChannelLabel = tab.channels.length > 1;

  const minHeightStyle = heightClass.includes('flex-1')
    ? undefined
    : { minHeight: 60 };

  return (
    <div
      ref={listRef}
      class={`flex flex-col gap-0.5 overflow-y-auto px-2 py-1 text-xs ${heightClass}`}
      style={minHeightStyle}
    >
      {messages.map((msg) => {
        const timeStr = formatTime(msg.timestampUtc);
        const chColor = channelColor(msg.channel);
        return (
          <div key={msg.id} class='leading-tight break-words'>
            <span class='opacity-60'>{timeStr} </span>
            {showChannelLabel && (
              <span class={`font-semibold ${chColor}`}>
                [{channelLabel(msg.channel)}]{' '}
              </span>
            )}
            {msg.name ? (
              <span>
                <span class='font-semibold'>{msg.name}:</span> {msg.message}
              </span>
            ) : (
              <span class={isPMChannel(msg.channel) ? '' : chColor}>
                {msg.message}
              </span>
            )}
          </div>
        );
      })}
      {messages.length === 0 && (
        <div class='opacity-40 italic'>No messages yet.</div>
      )}
    </div>
  );
}
