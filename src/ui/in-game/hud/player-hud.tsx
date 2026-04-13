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
      class='absolute top-0 right-0 left-0 flex flex-row items-center gap-1.5 rounded-none border-base-content/10 border-b bg-base-300/95 px-2 py-1 shadow-md backdrop-blur-sm'
      style={{
        zIndex: HUD_Z,
      }}
      onClick={stopPropagation}
      onKeyDown={stopPropagation}
      onContextMenu={stopPropagation}
    >
      <div class='flex shrink-0 items-center gap-1'>
        <span class='truncate font-bold text-sm text-white leading-tight'>
          {stats.name}
        </span>
        <span class='text-[10px] text-white leading-tight opacity-50'>
          Lv {stats.level}
        </span>
      </div>
      <div class='flex min-w-0 flex-1 flex-row gap-1'>
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
        <ProgressBar
          value={stats.weight}
          max={stats.maxWeight}
          label='Wt'
          barClass='bg-gradient-to-r from-stone-600 to-stone-400'
        />
      </div>
      <div class='flex shrink-0 flex-col items-end gap-0.5'>
        <span class='text-[10px] text-yellow-400 leading-tight'>
          &#9830; {stats.gold.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
