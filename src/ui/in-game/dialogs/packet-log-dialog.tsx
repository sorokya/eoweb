import { PacketAction, PacketFamily } from 'eolib';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  FaEye,
  FaEyeSlash,
  FaSortAmountDown,
  FaSortAmountUp,
  FaTrash,
} from 'react-icons/fa';
import {
  isSensitivePacket,
  type PacketLogEntry,
  parsePacketToJson,
} from '@/packet-log';
import { Button } from '@/ui/components';
import { UI_PANEL_BORDER, UI_STICKY_BG } from '@/ui/consts';
import { useClient, useLocale } from '@/ui/context';
import { DialogBase } from './dialog-base';

// --- Hex display helpers ---

function byteColor(byte: number): string {
  if (byte === 0xff) return 'text-error';
  if (byte === 0xfe) return 'text-warning';
  return '';
}

function HexByte({ value }: { value: number }) {
  const hex = value.toString(16).toUpperCase().padStart(2, '0');
  const color = byteColor(value);
  return <span class={color || undefined}>{hex}</span>;
}

function HexDump({
  bytes,
  maxHeight,
}: {
  bytes: Uint8Array;
  maxHeight?: string;
}) {
  const rows: number[][] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    rows.push(Array.from(bytes.slice(i, i + 16)));
  }

  return (
    <div
      class='overflow-y-auto font-mono text-xs'
      style={{ maxHeight: maxHeight ?? 'none' }}
    >
      <table class='w-full border-collapse'>
        <tbody>
          {rows.map((row, rowIdx) => {
            const offset = rowIdx * 16;
            const ascii = row
              .map((b) =>
                b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.',
              )
              .join('');
            return (
              <tr key={rowIdx} class='align-top leading-5'>
                <td class='select-none whitespace-nowrap pr-3 text-base-content/40'>
                  {offset.toString(16).toUpperCase().padStart(4, '0')}
                </td>
                <td class='whitespace-nowrap pr-3'>
                  <span class='flex flex-wrap gap-x-1'>
                    {row.map((b, i) => (
                      <HexByte key={i} value={b} />
                    ))}
                  </span>
                </td>
                <td class='select-none whitespace-pre text-base-content/50'>
                  {ascii}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function InlineHex({
  bytes,
  limit = 16,
}: {
  bytes: Uint8Array;
  limit?: number;
}) {
  const shown = bytes.slice(0, limit);
  const truncated = bytes.length > limit;
  return (
    <span class='flex flex-wrap gap-x-1 font-mono text-xs'>
      {Array.from(shown).map((b, i) => (
        <HexByte key={i} value={b} />
      ))}
      {truncated && <span class='text-base-content/40'>…</span>}
    </span>
  );
}

// --- Detail panel ---

function DetailPanel({
  entry,
  showSensitive,
  onClose,
}: {
  entry: PacketLogEntry;
  showSensitive: boolean;
  onClose: () => void;
}) {
  const { locale } = useLocale();
  const [tab, setTab] = useState<'hex' | 'json'>('hex');
  const sensitive = isSensitivePacket(entry);
  const masked = sensitive && !showSensitive;

  const jsonText = !masked ? parsePacketToJson(entry) : null;

  const time = entry.timestamp.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const ms = String(entry.timestamp.getMilliseconds()).padStart(3, '0');

  return (
    <div
      class={`flex flex-col gap-2 rounded-lg border ${UI_PANEL_BORDER} p-3 text-sm`}
    >
      <div class='flex items-center justify-between'>
        <span class='font-semibold'>{locale.packetLog.detailTitle}</span>
        <Button variant={['xs', 'ghost']} onClick={onClose}>
          {locale.packetLog.detailClose}
        </Button>
      </div>

      <div class='font-mono text-base-content/60 text-xs'>
        {time}.{ms}
        {' — '}
        <span class={entry.source === 'client' ? 'text-info' : 'text-success'}>
          {entry.source === 'client'
            ? locale.packetLog.client
            : locale.packetLog.server}
        </span>
        {' — '}
        {PacketFamily[entry.family]} / {PacketAction[entry.action]}
      </div>

      {/* Tab selector */}
      <div class='tabs tabs-boxed tabs-xs'>
        <button
          type='button'
          class={`tab${tab === 'hex' ? 'tab-active' : ''}`}
          onClick={() => setTab('hex')}
        >
          {locale.packetLog.detailHex}
        </button>
        <button
          type='button'
          class={`tab${tab === 'json' ? 'tab-active' : ''}`}
          onClick={() => setTab('json')}
        >
          {locale.packetLog.detailJson}
        </button>
      </div>

      {tab === 'hex' &&
        (masked ? (
          <p class='text-base-content/50 text-xs italic'>
            {locale.packetLog.sensitive}
          </p>
        ) : (
          <HexDump bytes={entry.rawBytes} maxHeight='220px' />
        ))}

      {tab === 'json' &&
        (masked ? (
          <p class='text-base-content/50 text-xs italic'>
            {locale.packetLog.sensitive}
          </p>
        ) : jsonText ? (
          <pre class='max-h-56 overflow-auto whitespace-pre-wrap break-all rounded bg-base-300 p-2 text-xs'>
            {jsonText}
          </pre>
        ) : (
          <p class='text-base-content/50 text-xs italic'>
            {locale.packetLog.unknownPacket}
          </p>
        ))}
    </div>
  );
}

// --- Main dialog ---

export function PacketLogDialog() {
  const client = useClient();
  const { locale } = useLocale();

  const [entries, setEntries] = useState<readonly PacketLogEntry[]>(() =>
    client.packetLogStore.getEntries(),
  );
  const [sortDesc, setSortDesc] = useState(true);
  const [showSensitive, setShowSensitive] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      setEntries(client.packetLogStore.getEntries().slice());
    };
    client.packetLogStore.subscribe(update);
    return () => client.packetLogStore.unsubscribe(update);
  }, [client]);

  const sorted = sortDesc ? [...entries].reverse() : [...entries];
  const selected =
    selectedId !== null
      ? (entries.find((e) => e.id === selectedId) ?? null)
      : null;

  const time = (ts: Date) =>
    ts.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }) +
    '.' +
    String(ts.getMilliseconds()).padStart(3, '0');

  return (
    <DialogBase id='packet-log' title={locale.packetLog.title} size='xl'>
      {/* Toolbar */}
      <div
        class={`flex items-center gap-2 border-b ${UI_PANEL_BORDER} px-3 py-1.5 ${UI_STICKY_BG}`}
      >
        <Button
          variant={['xs', 'ghost']}
          onClick={() => setSortDesc((d) => !d)}
        >
          {sortDesc ? (
            <FaSortAmountDown size={12} />
          ) : (
            <FaSortAmountUp size={12} />
          )}
          {sortDesc ? 'Newest first' : 'Oldest first'}
        </Button>

        <Button
          variant={['xs', 'ghost']}
          onClick={() => setShowSensitive((s) => !s)}
        >
          {showSensitive ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
          {showSensitive
            ? locale.packetLog.hideSensitive
            : locale.packetLog.showSensitive}
        </Button>

        <div class='flex-1' />

        <span class='text-base-content/40 text-xs'>{entries.length}/100</span>

        <Button
          variant={['xs', 'ghost', 'error']}
          onClick={() => {
            client.packetLogStore.clear();
            setSelectedId(null);
          }}
        >
          <FaTrash size={11} />
          {locale.packetLog.clear}
        </Button>
      </div>

      <div class='flex flex-col gap-2 overflow-y-auto p-2' ref={tableRef}>
        {/* Detail panel */}
        {selected && (
          <DetailPanel
            entry={selected}
            showSensitive={showSensitive}
            onClose={() => setSelectedId(null)}
          />
        )}

        {/* Table */}
        {sorted.length === 0 ? (
          <p class='p-4 text-center text-base-content/50 text-xs'>
            {locale.packetLog.empty}
          </p>
        ) : (
          <div class='overflow-x-auto'>
            <table class='table-xs table w-full'>
              <thead class={`${UI_STICKY_BG} sticky top-0 z-10`}>
                <tr>
                  <th class='w-16'>{locale.packetLog.source}</th>
                  <th>{locale.packetLog.family}</th>
                  <th>{locale.packetLog.action}</th>
                  <th class='w-24'>{locale.packetLog.time}</th>
                  <th>{locale.packetLog.data}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((entry) => {
                  const sensitive = isSensitivePacket(entry);
                  const masked = sensitive && !showSensitive;
                  const isSelected = entry.id === selectedId;

                  return (
                    <tr
                      key={entry.id}
                      class={`cursor-pointer hover:bg-base-200 ${isSelected ? 'bg-base-200' : ''}`}
                      onClick={() =>
                        setSelectedId(isSelected ? null : entry.id)
                      }
                    >
                      <td>
                        <span
                          class={`badge badge-xs ${entry.source === 'client' ? 'badge-info' : 'badge-success'}`}
                        >
                          {entry.source === 'client'
                            ? locale.packetLog.client
                            : locale.packetLog.server}
                        </span>
                      </td>
                      <td class='font-mono text-xs'>
                        {PacketFamily[entry.family] ?? entry.family}
                      </td>
                      <td class='font-mono text-xs'>
                        {PacketAction[entry.action] ?? entry.action}
                      </td>
                      <td class='whitespace-nowrap font-mono text-xs'>
                        {time(entry.timestamp)}
                      </td>
                      <td>
                        {masked ? (
                          <span class='text-base-content/40 text-xs italic'>
                            {locale.packetLog.sensitive}
                          </span>
                        ) : (
                          <InlineHex bytes={entry.rawBytes} limit={16} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DialogBase>
  );
}
