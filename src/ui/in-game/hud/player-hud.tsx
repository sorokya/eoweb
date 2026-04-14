import { BiSolidStar } from 'react-icons/bi';
import { FaHeart } from 'react-icons/fa';
import { GiCoins, GiWeightLiftingUp } from 'react-icons/gi';
import { GrMagic } from 'react-icons/gr';
import { ProgressBar } from '@/ui/components';
import { HUD_Z } from '@/ui/consts';
import { useLocale } from '@/ui/context';
import { usePlayerStats } from '@/ui/in-game';
import { capitalize, formatBigNumber, getExpForLevel } from '@/utils';

const stopPropagation = (e: { stopPropagation(): void }) => e.stopPropagation();

function hpColor(pct: number): 'success' | 'warning' | 'error' {
  if (pct >= 50) return 'success';
  if (pct >= 25) return 'warning';
  return 'error';
}

function tpColor(pct: number): 'info' | 'warning' | 'error' {
  if (pct >= 50) return 'info';
  if (pct >= 25) return 'warning';
  return 'error';
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
  const tpPct =
    stats.maxTp > 0 ? Math.round((stats.tp / stats.maxTp) * 100) : 0;

  return (
    <div
      role='presentation'
      class='absolute top-0 right-0 left-0 flex h-8 flex-row items-center gap-1.5 rounded-none border-base-content/10 border-b bg-base-200/80 px-2 shadow-md backdrop-blur-xs'
      style={{
        zIndex: HUD_Z,
      }}
      onClick={stopPropagation}
      onKeyDown={stopPropagation}
      onContextMenu={stopPropagation}
    >
      <div class='flex shrink-0 items-center gap-1'>
        <span class='truncate font-bold text-base-content text-sm leading-tight'>
          {capitalize(stats.name)}
        </span>
        <span class='text-[10px] text-base-content/50 leading-tight'>
          {locale.hudLvl} {stats.level}
        </span>
      </div>
      <div class='flex min-w-0 flex-1 flex-row justify-center gap-1'>
        <ProgressBar
          value={stats.hp}
          max={stats.maxHp}
          icon={
            <span class='text-red-300'>
              <FaHeart size={12} />
            </span>
          }
          label={locale.hudHP}
          color={hpColor(hpPct)}
        />
        <ProgressBar
          value={stats.tp}
          max={stats.maxTp}
          icon={
            <span class='text-blue-300'>
              <GrMagic size={12} />
            </span>
          }
          label={locale.hudTP}
          color={tpColor(tpPct)}
        />
        <ProgressBar
          value={tnlProgress}
          max={tnlTotal}
          icon={
            <span class='text-yellow-300'>
              <BiSolidStar size={12} />
            </span>
          }
          label={locale.hudTNL}
          color='warning'
        />
        <span class='flex items-center gap-0.5 text-[10px] text-accent leading-tight'>
          <GiWeightLiftingUp size={12} />
          {stats.weight} / {stats.maxWeight}
        </span>
        <div class='flex items-center gap-0.5 text-[10px] text-warning leading-tight'>
          <GiCoins size={12} />
          {formatBigNumber(stats.gold)}
          <span class='hidden md:inline'>{locale.hudGold}</span>
        </div>
      </div>
    </div>
  );
}
