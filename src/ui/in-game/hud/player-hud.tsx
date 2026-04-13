import { BiSolidStar } from 'react-icons/bi';
import { FaHeart } from 'react-icons/fa';
import { GiCoins, GiWeightLiftingUp } from 'react-icons/gi';
import { GrMagic } from 'react-icons/gr';
import { ProgressBar } from '@/ui/components';
import { useLocale } from '@/ui/context';
import { usePlayerStats } from '@/ui/in-game';
import { capitalize, getExpForLevel } from '@/utils';
import { HUD_Z } from './consts';

const stopPropagation = (e: { stopPropagation(): void }) => e.stopPropagation();

function hpBarClass(pct: number): string {
  if (pct >= 50) return 'bg-gradient-to-r from-green-700 to-green-500';
  if (pct >= 25) return 'bg-gradient-to-r from-yellow-600 to-yellow-400';
  return 'bg-gradient-to-r from-red-700 to-red-500';
}

export function PlayerHud() {
  const { locale } = useLocale();
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
          {capitalize(stats.name)}
        </span>
        <span class='text-[10px] text-white leading-tight opacity-50'>
          {locale.hudLvl} {stats.level}
        </span>
      </div>
      <div class='flex min-w-0 flex-1 flex-row justify-center gap-1'>
        <ProgressBar
          value={stats.hp}
          max={stats.maxHp}
          icon={
            <span class='text-red-400'>
              <FaHeart size={12} />
            </span>
          }
          label={locale.hudHP}
          barClass={hpBarClass(hpPct)}
        />
        <ProgressBar
          value={stats.tp}
          max={stats.maxTp}
          icon={
            <span class='text-blue-400'>
              <GrMagic size={12} />
            </span>
          }
          label={locale.hudTP}
          barClass='bg-gradient-to-r from-blue-700 to-blue-500'
        />
        <ProgressBar
          value={tnlProgress}
          max={tnlTotal}
          icon={
            <span class='text-amber-400'>
              <BiSolidStar size={12} />
            </span>
          }
          label={locale.hudTNL}
          barClass='bg-gradient-to-r from-amber-700 to-amber-500'
        />
        <ProgressBar
          value={stats.weight}
          max={stats.maxWeight}
          icon={
            <span class='text-stone-400'>
              <GiWeightLiftingUp size={12} />
            </span>
          }
          label={locale.hudWeight}
          barClass='bg-gradient-to-r from-stone-600 to-stone-400'
        />
        <span class='flex items-center gap-0.5 text-[10px] text-yellow-400 leading-tight'>
          <GiCoins size={12} />
          {stats.gold.toLocaleString()} {locale.hudGold}
        </span>
      </div>
    </div>
  );
}
