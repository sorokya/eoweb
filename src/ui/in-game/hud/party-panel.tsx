import type { PartyMember } from 'eolib';
import { useCallback, useEffect, useState } from 'preact/hooks';
import {
  FaChevronDown,
  FaChevronUp,
  FaCrown,
  FaMinus,
  FaPlus,
  FaTimes,
} from 'react-icons/fa';
import {
  HUD_BAR_RING,
  HUD_TEXT,
  UI_PANEL_BG,
  UI_PANEL_BORDER,
} from '@/ui/consts';
import { useClient, useLocale } from '@/ui/context';
import { useBackdropBlur } from '@/ui/in-game';
import { capitalize, isMobile } from '@/utils';

const COLS_KEY = 'eoweb:party-panel-cols';
const DEFAULT_COLS = 2;
const MIN_COLS = 1;
const MAX_COLS = 4;

function readCols(): number {
  try {
    const v = localStorage.getItem(COLS_KEY);
    if (v !== null) {
      const n = Number.parseInt(v, 10);
      if (n >= MIN_COLS && n <= MAX_COLS) return n;
    }
  } catch {
    // ignore
  }
  return DEFAULT_COLS;
}

function writeCols(n: number): void {
  try {
    localStorage.setItem(COLS_KEY, String(n));
  } catch {
    // ignore
  }
}

function hpColor(pct: number): string {
  if (pct >= 50) return 'progress-success';
  if (pct >= 25) return 'progress-warning';
  return 'progress-error';
}

type MemberFrameProps = {
  member: PartyMember;
  isLocalPlayer: boolean;
  isLocalLeader: boolean;
  onRemove: (playerId: number) => void;
};

function MemberFrame({
  member,
  isLocalPlayer,
  isLocalLeader,
  onRemove,
}: MemberFrameProps) {
  const { locale } = useLocale();
  const showX = isLocalLeader || isLocalPlayer;
  const title =
    isLocalLeader && !isLocalPlayer
      ? locale.partyPanelKick
      : locale.partyPanelLeave;
  const hp = Math.max(0, Math.min(100, member.hpPercentage ?? 0));

  return (
    <div
      class={`flex flex-col gap-0.5 rounded p-0.5 ${UI_PANEL_BORDER} border bg-base-content/5`}
      style={{ minWidth: 0 }}
    >
      {/* Row: crown + name + X */}
      <div class='flex items-center gap-0.5'>
        {member.leader ? (
          <span class='shrink-0 text-warning' title={locale.partyPanelLeader}>
            <FaCrown size={8} />
          </span>
        ) : (
          <span class='w-2 shrink-0' />
        )}
        <span
          class={`flex-1 truncate font-semibold text-[10px] leading-tight ${HUD_TEXT}`}
          title={capitalize(member.name)}
        >
          {capitalize(member.name)}
        </span>
        {showX && (
          <button
            type='button'
            class='ml-0.5 shrink-0 cursor-pointer rounded bg-transparent p-0 text-error/70 opacity-60 hover:opacity-100'
            title={title}
            onClick={() => onRemove(member.playerId)}
          >
            <FaTimes size={8} />
          </button>
        )}
      </div>

      {/* Level */}
      <span class={`text-[9px] leading-none opacity-60 ${HUD_TEXT}`}>
        {locale.hudLvl} {member.level}
      </span>

      {/* HP bar */}
      <div class={`flex items-center gap-1 ${HUD_BAR_RING}`}>
        <progress
          class={`progress ${hpColor(hp)} h-2 w-full`}
          value={hp}
          max={100}
        />
      </div>
    </div>
  );
}

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

export function PartyPanel() {
  const isMobile = useIsMobile();
  const client = useClient();
  const { locale } = useLocale();
  const blur = useBackdropBlur();

  const [members, setMembers] = useState<PartyMember[]>(() => [
    ...client.partyController.members,
  ]);
  const [cols, setCols] = useState(readCols);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const cb = () => {
      setMembers([
        ...client.partyController.members,
        ...client.partyController.members,
        ...client.partyController.members,
        ...client.partyController.members,
        ...client.partyController.members,
      ]);
    };
    client.partyController.subscribe(cb);
    return () => client.partyController.unsubscribe(cb);
  }, [client]);

  const adjustCols = useCallback((delta: number) => {
    setCols((c) => {
      const next = Math.max(MIN_COLS, Math.min(MAX_COLS, c + delta));
      writeCols(next);
      return next;
    });
  }, []);

  const handleRemove = useCallback(
    (playerId: number) => {
      client.partyController.removeMember(playerId);
    },
    [client],
  );

  if (members.length === 0) return null;

  const isLeader =
    members.find((m) => m.playerId === client.playerId)?.leader ?? false;

  return (
    <div
      class={`flex flex-col gap-1.5 rounded-lg ${UI_PANEL_BG} px-2 py-1.5 ${blur}`}
      style={{ minWidth: 120, maxWidth: 320 }}
    >
      {/* Header — click to collapse/expand */}
      <button
        type='button'
        class='flex w-full cursor-pointer items-center justify-between gap-1 bg-transparent p-0 text-left'
        onClick={() => setCollapsed((c) => !c)}
      >
        <span class='truncate font-semibold text-primary/80 text-xs'>
          {locale.partyPanelTitle}
        </span>

        {!collapsed && (
          <div class='flex items-center gap-1'>
            <button
              type='button'
              class='shrink-0 cursor-pointer rounded bg-transparent p-0 text-base-content/50 hover:text-base-content'
              onClick={(e) => {
                e.stopPropagation();
                adjustCols(-1);
              }}
              disabled={cols <= MIN_COLS}
            >
              <FaMinus size={8} />
            </button>
            <span class={`w-3 text-center text-[9px] leading-none ${HUD_TEXT}`}>
              {cols}
            </span>
            <button
              type='button'
              class='shrink-0 cursor-pointer rounded bg-transparent p-0 text-base-content/50 hover:text-base-content'
              onClick={(e) => {
                e.stopPropagation();
                adjustCols(1);
              }}
              disabled={cols >= MAX_COLS}
            >
              <FaPlus size={8} />
            </button>
          </div>
        )}

        <span class='shrink-0 text-primary/60'>
          {collapsed ? <FaChevronDown size={9} /> : <FaChevronUp size={9} />}
        </span>
      </button>

      {!collapsed && (
        <>
          {/* Member grid */}
          <div
            class='overflow-y-scroll'
            style={{ maxHeight: isMobile ? '40vh' : 300 }}
          >
            <div
              class='grid gap-1'
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              }}
            >
              {members.map((m) => (
                <MemberFrame
                  key={m.playerId}
                  member={m}
                  isLocalPlayer={m.playerId === client.playerId}
                  isLocalLeader={isLeader}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
