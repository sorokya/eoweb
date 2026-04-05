import { ProgressBar } from '@/ui/components';
import { usePlayerStats } from '@/ui/in-game';
import { getExpForLevel } from '@/utils';
import { HUD_Z } from './consts';

const stopPropagation = (e: { stopPropagation(): void }) => e.stopPropagation();

function hpBarClass(pct: number): string {
  if (pct >= 50) return 'bg-gradient-to-r from-green-700 to-green-500';
  if (pct >= 25) return 'bg-gradient-to-r from-yellow-600 to-yellow-400';
  return 'bg-gradient-to-r from-red-700 to-red-500';
}

export function PlayerHud() {
  const stats = usePlayerStats();

  const expForCurrentLevel = getExpForLevel(stats.level);
  const expForNextLevel = getExpForLevel(stats.level + 1);
  const tnlTotal = expForNextLevel - expForCurrentLevel;
  const tnlProgress = Math.max(0, stats.experience - expForCurrentLevel);

  const hpPct =
    stats.maxHp > 0 ? Math.round((stats.hp / stats.maxHp) * 100) : 0;

  return (
    <div
      role='presentation'
      class={[
        'absolute top-0 left-0 right-0 flex flex-row items-center gap-1.5 px-2 py-1',
        'border-b border-base-content/10 rounded-none shadow-md bg-base-300/95 backdrop-blur-sm',
        // Desktop: vertical box at top-left
        'md:top-2.5 md:left-2.5 md:right-auto md:w-48 md:flex-col md:gap-1.5 md:p-2.5',
        'md:rounded-lg md:border md:border-base-content/10 md:shadow-xl',
      ].join(' ')}
      style={{
        zIndex: HUD_Z,
      }}
      onClick={stopPropagation}
      onKeyDown={stopPropagation}
      onContextMenu={stopPropagation}
    >
      <div class='flex-shrink-0 flex items-center gap-1'>
        <span class='text-sm font-bold leading-tight truncate text-white'>
          {stats.name}
        </span>
        <span class='text-[10px] md:text-xs opacity-50 leading-tight text-white'>
          Lv {stats.level}
        </span>
      </div>
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
