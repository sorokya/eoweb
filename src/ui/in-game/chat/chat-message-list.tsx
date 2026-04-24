import type { ComponentType } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import {
  LuCrown,
  LuGlobe,
  LuInfo,
  LuMail,
  LuMapPin,
  LuShield,
  LuUsers,
} from 'react-icons/lu';
import { useLocale } from '@/ui/context';
import { type ChatChannel, channelColor, isPMChannel } from '@/ui/enums';
import type { ChatMessage } from './chat-manager';

type Props = {
  messages: ChatMessage[];
  /** Tailwind class controlling the max-height of the scrollable list. */
  heightClass?: string;
};

/** Show a time separator when this many ms have passed between messages. */
const SEPARATOR_THRESHOLD_MS = 5 * 60 * 1000;
/** Group consecutive messages from the same sender within this window. */
const GROUP_THRESHOLD_MS = 2 * 60 * 1000;

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// biome-ignore lint/suspicious/noExplicitAny: react-icons ComponentType
type IconComponent = ComponentType<any>;

const CHANNEL_ICONS: Record<string, IconComponent> = {
  local: LuMapPin,
  global: LuGlobe,
  party: LuUsers,
  guild: LuShield,
  admin: LuCrown,
  system: LuInfo,
};

function getChannelIcon(ch: ChatChannel): IconComponent {
  if (isPMChannel(ch)) return LuMail;
  return CHANNEL_ICONS[ch] ?? LuInfo;
}

function formatHourMin(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}

function formatSeparatorTime(utcMs: number): string {
  const d = new Date(utcMs);
  const now = new Date();
  const timeStr = formatHourMin(d);

  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday) return timeStr;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return `Yesterday ${timeStr}`;

  const dateStr = `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  if (d.getFullYear() === now.getFullYear()) return `${dateStr}, ${timeStr}`;
  return `${dateStr} ${d.getFullYear()}, ${timeStr}`;
}

function formatFullTime(utcMs: number): string {
  const d = new Date(utcMs);
  const yyyy = d.getFullYear();
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${formatHourMin(d)}`;
}

type SeparatorItem = { type: 'separator'; key: string; label: string };
type GroupItem = {
  type: 'group';
  key: string;
  header: ChatMessage;
  continuations: ChatMessage[];
};
type RowItem = SeparatorItem | GroupItem;

function buildRows(messages: ChatMessage[]): RowItem[] {
  const rows: RowItem[] = [];
  let lastTs = Number.NEGATIVE_INFINITY;
  let lastSender = '';
  let lastGroupTs = Number.NEGATIVE_INFINITY;
  let currentGroup: GroupItem | null = null;

  let groupCount = 0;
  for (const msg of messages) {
    if (msg.timestampUtc - lastTs > SEPARATOR_THRESHOLD_MS) {
      rows.push({
        type: 'separator',
        key: `sep-${msg.timestampUtc}`,
        label: formatSeparatorTime(msg.timestampUtc),
      });
      lastSender = '';
      currentGroup = null;
    }

    // Only group named messages; system/unnamed messages stand alone.
    const hasName = Boolean(msg.name);
    const senderKey = hasName ? `${msg.channel}::${msg.name}` : null;
    const isContinuation =
      senderKey !== null &&
      senderKey === lastSender &&
      msg.timestampUtc - lastGroupTs < GROUP_THRESHOLD_MS &&
      currentGroup !== null;

    if (isContinuation && currentGroup) {
      currentGroup.continuations.push(msg);
    } else {
      currentGroup = {
        type: 'group',
        key: `group-${msg.timestampUtc}-${groupCount++}`,
        header: msg,
        continuations: [],
      };
      rows.push(currentGroup);
      lastGroupTs = msg.timestampUtc;
      lastSender = senderKey ?? '';
    }

    lastTs = msg.timestampUtc;
  }

  return rows;
}

export function ChatMessageList({ messages, heightClass = 'max-h-40' }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const { locale } = useLocale();

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    el.scrollTop = el.scrollHeight;

    let rafId: number;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    });

    observer.observe(el, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

  const rows = buildRows(messages);

  const minHeightStyle = heightClass.includes('flex-1')
    ? undefined
    : { minHeight: 60 };

  return (
    <div
      ref={listRef}
      class={`flex flex-col overflow-y-auto px-2 py-1 text-xs ${heightClass}`}
      style={minHeightStyle}
    >
      {rows.map((row) => {
        if (row.type === 'separator') {
          return (
            <div
              key={row.key}
              class='my-1.5 flex items-center gap-2 opacity-40'
            >
              <div class='h-px flex-1 bg-current' />
              <span class='shrink-0 text-[10px]'>{row.label}</span>
              <div class='h-px flex-1 bg-current' />
            </div>
          );
        }

        const { header, continuations } = row;
        const chColor = channelColor(header.channel);
        const Icon = getChannelIcon(header.channel);

        return (
          <div key={row.key} class='mt-2 first:mt-0'>
            {/* Group header */}
            <div
              class='wrap-break-word select-text leading-snug'
              title={formatFullTime(header.timestampUtc)}
            >
              <Icon
                size={10}
                class={`mr-0.5 inline-block align-middle ${chColor}`}
              />
              {header.name ? (
                <span>
                  <span class='font-semibold'>{header.name}:</span>{' '}
                  {header.message}
                </span>
              ) : (
                <span class={isPMChannel(header.channel) ? '' : chColor}>
                  {header.message}
                </span>
              )}
            </div>

            {/* Continuation messages */}
            {continuations.length > 0 && (
              <div class='mt-0.5 border-base-content/10 border-l-2 pl-1.5'>
                {continuations.map((msg) => (
                  <div
                    key={msg.timestampUtc}
                    class='wrap-break-word select-text leading-snug opacity-85'
                    title={formatFullTime(msg.timestampUtc)}
                  >
                    {msg.name ? (
                      <span>{msg.message}</span>
                    ) : (
                      <span class={isPMChannel(msg.channel) ? '' : chColor}>
                        {msg.message}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {messages.length === 0 && (
        <div class='italic opacity-40'>{locale.chatNoMessages}</div>
      )}
    </div>
  );
}
