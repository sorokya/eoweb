import { useEffect, useState } from 'preact/hooks';
import { useClient } from '@/ui/context';
import { calculateTnl, getExpForLevel } from '@/utils';

const HUD_Z = 10;
const stopPropagation = (e: { stopPropagation(): void }) => e.stopPropagation();

type Stats = {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  tp: number;
  maxTp: number;
  experience: number;
};

function fmt(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

function hpBarClass(pct: number): string {
  if (pct >= 50) return 'bg-gradient-to-r from-green-700 to-green-500';
  if (pct >= 25) return 'bg-gradient-to-r from-yellow-600 to-yellow-400';
  return 'bg-gradient-to-r from-red-700 to-red-500';
}

function ProgressBar({
  value,
  max,
  label,
  barClass,
}: {
  value: number;
  max: number;
  label: string;
  barClass: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div class='flex items-center gap-1 w-full min-w-0'>
      <span class='flex-shrink-0 text-[8px] md:text-[9px] font-bold w-5 text-right opacity-80 uppercase tracking-wide'>
        {label}
      </span>
      <div
        class='relative flex-1 h-3 md:h-4 rounded overflow-hidden'
        style={{
          background: 'rgba(0,0,0,0.45)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          class={`absolute inset-y-0 left-0 rounded transition-[width] duration-500 ease-out ${barClass}`}
          style={{ width: `${pct}%` }}
        />
        <span class='absolute inset-0 flex items-center justify-center text-[7px] md:text-[8px] font-semibold leading-none drop-shadow text-white'>
          {fmt(value)}/{fmt(max)}
        </span>
      </div>
    </div>
  );
}

export function PlayerHud() {
  const client = useClient();

  const [stats, setStats] = useState<Stats>({
    name: client.name,
    level: client.level,
    hp: client.hp,
    maxHp: client.maxHp,
    tp: client.tp,
    maxTp: client.maxTp,
    experience: client.experience,
  });

  useEffect(() => {
    const handler = () => {
      setStats({
        name: client.name,
        level: client.level,
        hp: client.hp,
        maxHp: client.maxHp,
        tp: client.tp,
        maxTp: client.maxTp,
        experience: client.experience,
      });
    };
    client.on('statsUpdate', handler);
    return () => client.off('statsUpdate', handler);
  }, [client]);

  const expForCurrentLevel = getExpForLevel(stats.level);
  const expForNextLevel = getExpForLevel(stats.level + 1);
  const tnlTotal = expForNextLevel - expForCurrentLevel;
  const tnlProgress = Math.max(0, stats.experience - expForCurrentLevel);
  const _tnl = calculateTnl(stats.experience);

  const hpPct =
    stats.maxHp > 0 ? Math.round((stats.hp / stats.maxHp) * 100) : 0;

  return (
    <div
      role='presentation'
      class={[
        // Mobile: full-width strip across the top
        'absolute top-0 left-0 right-0 flex flex-row items-center gap-1.5 px-2 py-1',
        'border-b border-white/10 rounded-none shadow-md',
        // Desktop: vertical box at top-left
        'md:top-2.5 md:left-2.5 md:right-auto md:w-48 md:flex-col md:gap-1.5 md:p-2.5',
        'md:rounded-lg md:border md:border-white/10 md:shadow-xl',
      ].join(' ')}
      style={{
        zIndex: HUD_Z,
        background:
          'linear-gradient(160deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.92) 100%)',
      }}
      onClick={stopPropagation}
      onKeyDown={stopPropagation}
      onContextMenu={stopPropagation}
    >
      {/* Name + level */}
      <div class='flex-shrink-0 flex items-center gap-1'>
        <span class='text-sm font-bold leading-tight truncate text-white'>
          {stats.name}
        </span>
        <span class='text-[10px] md:text-xs opacity-50 leading-tight text-white'>
          Lv {stats.level}
        </span>
      </div>
      {/* Bars */}
      <div class='flex-1 md:flex-none md:w-full flex flex-row md:flex-col gap-1 min-w-0'>
        <ProgressBar
          value={stats.hp}
          max={stats.maxHp}
          label='HP'
          barClass={hpBarClass(hpPct)}
        />
        <ProgressBar
          value={stats.tp}
          max={stats.maxTp}
          label='TP'
          barClass='bg-gradient-to-r from-blue-700 to-blue-500'
        />
        <ProgressBar
          value={tnlProgress}
          max={tnlTotal}
          label='TNL'
          barClass='bg-gradient-to-r from-amber-700 to-amber-500'
        />
      </div>
    </div>
  );
}
