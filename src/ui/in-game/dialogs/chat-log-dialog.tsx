import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  LuArrowDownUp,
  LuChevronLeft,
  LuChevronRight,
  LuDownload,
  LuTrash2,
} from 'react-icons/lu';
import {
  deleteAllChatMessages,
  deleteChatMessage,
  getAllFilteredChatMessages,
  getPagedChatMessages,
  type PagedChatResult,
  type StoredChatMessage,
} from '@/db';
import { formatLocaleString } from '@/locale';
import { Button, Confirm, Select } from '@/ui/components';
import { UI_ITEM_BG, UI_PANEL_BORDER } from '@/ui/consts';
import { useClient, useLocale } from '@/ui/context';
import {
  type ChatChannel,
  ChatChannels,
  channelColor,
  channelLabel,
} from '@/ui/enums';
import { DialogBase } from './dialog-base';

const PAGE_SIZE = 200;

const ALL_CHANNELS_VALUE = '__all__';

type ChannelOption = { value: string; label: string };

function buildChannelOptions(locale: {
  chatLogAllChannels: string;
  chatLogLocal: string;
  chatLogGlobal: string;
  chatLogParty: string;
  chatLogGuild: string;
  chatLogAdmin: string;
  chatLogSystem: string;
}): ChannelOption[] {
  return [
    { value: ALL_CHANNELS_VALUE, label: locale.chatLogAllChannels },
    { value: ChatChannels.Local, label: locale.chatLogLocal },
    { value: ChatChannels.Global, label: locale.chatLogGlobal },
    { value: ChatChannels.Party, label: locale.chatLogParty },
    { value: ChatChannels.Guild, label: locale.chatLogGuild },
    { value: ChatChannels.Admin, label: locale.chatLogAdmin },
    { value: ChatChannels.System, label: locale.chatLogSystem },
  ];
}

function formatTimestamp(utc: number): string {
  return new Date(utc).toLocaleTimeString([], {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function exportMessages(
  messages: StoredChatMessage[],
  format: 'text' | 'json' | 'csv',
) {
  let content: string;
  let mime: string;
  let ext: string;

  if (format === 'json') {
    content = JSON.stringify(messages, null, 2);
    mime = 'application/json';
    ext = 'json';
  } else if (format === 'csv') {
    const rows = [
      ['timestamp', 'channel', 'name', 'message'].join(','),
      ...messages.map((m) =>
        [
          new Date(m.timestampUtc).toISOString(),
          m.channel,
          m.name ?? '',
          `"${m.message.replace(/"/g, '""')}"`,
        ].join(','),
      ),
    ];
    content = rows.join('\n');
    mime = 'text/csv';
    ext = 'csv';
  } else {
    content = messages
      .map((m) => {
        const ts = new Date(m.timestampUtc).toLocaleString();
        const ch = `[${channelLabel(m.channel as ChatChannel)}]`;
        const name = m.name ? `${m.name}: ` : '';
        return `${ts} ${ch} ${name}${m.message}`;
      })
      .join('\n');
    mime = 'text/plain';
    ext = 'txt';
  }

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chat-log.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

type ExportDropdownProps = {
  onExport: (format: 'text' | 'json' | 'csv') => void;
};

function ExportDropdown({ onExport }: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { locale } = useLocale();

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  return (
    <div class='relative' ref={ref}>
      <Button
        type='button'
        variant='ghost'
        class='btn btn-ghost btn-xs gap-1'
        onClick={() => setOpen((o) => !o)}
      >
        <LuDownload size={13} />
        {locale.chatLogExport}
      </Button>
      {open && (
        <ul
          class={`menu menu-xs absolute right-0 bottom-full z-50 mb-1 min-w-30 rounded border ${UI_PANEL_BORDER} ${UI_ITEM_BG} p-1 shadow-lg`}
        >
          <li>
            <button
              type='button'
              onClick={() => {
                onExport('text');
                setOpen(false);
              }}
            >
              {locale.chatLogPlainText}
            </button>
          </li>
          <li>
            <button
              type='button'
              onClick={() => {
                onExport('json');
                setOpen(false);
              }}
            >
              {locale.chatLogJson}
            </button>
          </li>
          <li>
            <button
              type='button'
              onClick={() => {
                onExport('csv');
                setOpen(false);
              }}
            >
              {locale.chatLogCsv}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

export function ChatLogDialog() {
  const client = useClient();
  const { locale } = useLocale();
  const characterId = client.characterId;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [channel, setChannel] = useState<string>(ALL_CHANNELS_VALUE);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PagedChatResult>({
    messages: [],
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  // Reset page when channel changes
  const handleChannelChange = useCallback((v: string) => {
    setChannel(v);
    setPage(1);
  }, []);

  const toggleSortDir = useCallback(() => {
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    setPage(1);
  }, []);

  // Load messages
  useEffect(() => {
    setLoading(true);
    const ch: ChatChannel | null =
      channel === ALL_CHANNELS_VALUE ? null : (channel as ChatChannel);
    getPagedChatMessages(
      characterId,
      ch,
      page,
      PAGE_SIZE,
      debouncedSearch,
      sortDir,
    )
      .then(setResult)
      .finally(() => setLoading(false));
  }, [characterId, channel, page, debouncedSearch, sortDir]);

  const handleDelete = useCallback(
    async (id: number | undefined) => {
      if (id == null) return;
      await deleteChatMessage(id);
      // Reload current page
      const ch: ChatChannel | null =
        channel === ALL_CHANNELS_VALUE ? null : (channel as ChatChannel);
      const updated = await getPagedChatMessages(
        characterId,
        ch,
        page,
        PAGE_SIZE,
        debouncedSearch,
        sortDir,
      );
      setResult(updated);
    },
    [characterId, channel, page, debouncedSearch, sortDir],
  );

  const handleClearAll = useCallback(async () => {
    await deleteAllChatMessages(characterId);
    setConfirmClearAll(false);
    setResult({ messages: [], total: 0, totalPages: 1 });
    setPage(1);
  }, [characterId]);

  const handleExport = useCallback(
    async (format: 'text' | 'json' | 'csv') => {
      const ch: ChatChannel | null =
        channel === ALL_CHANNELS_VALUE ? null : (channel as ChatChannel);
      const all = await getAllFilteredChatMessages(
        characterId,
        ch,
        debouncedSearch,
        sortDir,
      );
      exportMessages(all, format);
    },
    [characterId, channel, debouncedSearch, sortDir],
  );

  const channelOptions = buildChannelOptions(locale);

  return (
    <DialogBase id='chat-log' title={locale.chatLogTitle} size='lg'>
      {confirmClearAll && (
        <Confirm
          title={locale.chatLogClearTitle}
          message={locale.chatLogClearMessage}
          onYes={handleClearAll}
          onNo={() => setConfirmClearAll(false)}
        />
      )}

      {/* Filters */}
      <div class='flex flex-wrap gap-1 pt-1'>
        <input
          class='input input-xs flex-1'
          type='text'
          placeholder={locale.chatLogSearchPlaceholder}
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.stopPropagation()}
        />
        <Select
          value={channel}
          onChange={handleChannelChange}
          options={channelOptions}
          variant='xs'
          class='w-32 shrink-0'
        />
        <button
          type='button'
          class='btn btn-ghost btn-xs shrink-0 gap-1'
          title={
            sortDir === 'asc'
              ? locale.chatLogSortOldestFirst
              : locale.chatLogSortNewestFirst
          }
          onClick={toggleSortDir}
        >
          <LuArrowDownUp size={13} />
          {sortDir === 'asc'
            ? locale.chatLogSortOldest
            : locale.chatLogSortNewest}
        </button>
      </div>

      {/* Message list */}
      <div
        class={`mt-1 h-[52vh] overflow-y-auto rounded border ${UI_PANEL_BORDER}`}
      >
        {loading && (
          <p class='py-4 text-center text-xs opacity-60'>
            {locale.chatLogLoading}
          </p>
        )}
        {!loading && result.messages.length === 0 && (
          <p class='py-4 text-center text-xs opacity-60'>
            {locale.chatLogNoMessages}
          </p>
        )}
        {!loading &&
          result.messages.map((msg) => (
            <div
              key={msg.id}
              class={`group flex items-start gap-1 ${UI_PANEL_BORDER} border-b px-1.5 py-0.5 text-xs hover:bg-base-content/5`}
            >
              <div class='flex flex-col'>
                <span class='mt-0.5 shrink-0 tabular-nums opacity-50'>
                  {formatTimestamp(msg.timestampUtc)}
                </span>
                <div>
                  <span
                    class={`mt-0.5 shrink-0 font-semibold ${channelColor(msg.channel as ChatChannel)}`}
                  >
                    [{channelLabel(msg.channel as ChatChannel)}]
                  </span>{' '}
                  <span class='wrap-break-word min-w-0 flex-1 leading-snug'>
                    {msg.name && (
                      <span class='font-semibold'>{msg.name}: </span>
                    )}
                    {msg.message}
                  </span>
                  <button
                    type='button'
                    class='btn btn-ghost btn-xs shrink-0 opacity-60 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:hover:opacity-100! [@media(hover:hover)]:group-hover:opacity-60'
                    aria-label={locale.chatLogDeleteMessage}
                    onClick={() => handleDelete(msg.id)}
                  >
                    <LuTrash2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Pagination */}
      <div class='flex items-center justify-between px-0.5 pt-1'>
        <button
          type='button'
          class='btn btn-ghost btn-xs'
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          <LuChevronLeft size={13} />
        </button>
        <span class='text-xs opacity-60'>
          {result.total === 0
            ? locale.chatLogNoMessagesShort
            : formatLocaleString(locale.chatLogPagination, {
                page: String(page),
                totalPages: String(result.totalPages),
                total: String(result.total),
              })}
        </span>
        <button
          type='button'
          class='btn btn-ghost btn-xs'
          onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))}
          disabled={page >= result.totalPages}
        >
          <LuChevronRight size={13} />
        </button>
      </div>

      {/* Actions */}
      <div
        class={`flex items-center justify-between ${UI_PANEL_BORDER} border-t pt-1`}
      >
        <ExportDropdown onExport={handleExport} />
        <Button
          type='button'
          variant='ghost'
          class='btn btn-ghost btn-xs gap-1 text-error hover:bg-error/10'
          onClick={() => setConfirmClearAll(true)}
        >
          <LuTrash2 size={13} />
          {locale.chatLogClearAll}
        </Button>
      </div>
    </DialogBase>
  );
}
