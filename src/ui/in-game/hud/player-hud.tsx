import { useEffect, useState } from 'preact/hooks';
import { BiSolidStar } from 'react-icons/bi';
import { FaHeart } from 'react-icons/fa';
import { GiCoins, GiWeightLiftingUp } from 'react-icons/gi';
import { GrMagic } from 'react-icons/gr';
import type { HudWidget, HudWidgetId } from '@/controllers';
import { ProgressBar } from '@/ui/components';
import { HUD_Z } from '@/ui/consts';
import { useClient, useLocale } from '@/ui/context';
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

type WidgetProps = {
  stats: ReturnType<typeof usePlayerStats>;
};

function CharacterWidget({ stats }: WidgetProps) {
  const { locale } = useLocale();
  return (
    <div class='flex shrink-0 items-center gap-1'>
      <span class='truncate font-bold text-base-content text-sm leading-tight'>
        {capitalize(stats.name)}
      </span>
      <span class='text-[10px] text-base-content/50 leading-tight'>
        {locale.hudLvl} {stats.level}
      </span>
    </div>
  );
}

function HpWidget({ stats }: WidgetProps) {
  const { locale } = useLocale();
  const hpPct =
    stats.maxHp > 0 ? Math.round((stats.hp / stats.maxHp) * 100) : 0;
  return (
    <ProgressBar
      value={stats.hp}
      max={stats.maxHp}
      icon={
        <span class='text-error'>
          <FaHeart size={12} />
        </span>
      }
      label={locale.hudHP}
      color={hpColor(hpPct)}
    />
  );
}

function TpWidget({ stats }: WidgetProps) {
  const { locale } = useLocale();
  const tpPct =
    stats.maxTp > 0 ? Math.round((stats.tp / stats.maxTp) * 100) : 0;
  return (
    <ProgressBar
      value={stats.tp}
      max={stats.maxTp}
      icon={
        <span class='text-info'>
          <GrMagic size={12} />
        </span>
      }
      label={locale.hudTP}
      color={tpColor(tpPct)}
    />
  );
}

function TnlWidget({ stats }: WidgetProps) {
  const { locale } = useLocale();
  const expForCurrentLevel = getExpForLevel(stats.level);
  const expForNextLevel = getExpForLevel(stats.level + 1);
  const tnlTotal = expForNextLevel - expForCurrentLevel;
  const tnlProgress = Math.max(0, stats.experience - expForCurrentLevel);
  return (
    <ProgressBar
      value={tnlProgress}
      max={tnlTotal}
      icon={
        <span class='text-warning'>
          <BiSolidStar size={12} />
        </span>
      }
      label={locale.hudTNL}
      color='warning'
    />
  );
}

function WeightWidget({ stats }: WidgetProps) {
  return (
    <span class='flex items-center gap-0.5 text-[10px] text-base-content leading-tight'>
      <span class='text-accent'>
        <GiWeightLiftingUp size={12} />
      </span>
      {stats.weight} / {stats.maxWeight}
    </span>
  );
}

function GoldWidget({ stats }: WidgetProps) {
  const { locale } = useLocale();
  return (
    <div class='flex items-center gap-0.5 text-[10px] text-base-content leading-tight'>
      <span class='text-secondary'>
        <GiCoins size={12} />
      </span>
      {formatBigNumber(stats.gold)}
      <span class='hidden md:inline'>{locale.hudGold}</span>
    </div>
  );
}

function renderWidget(
  id: HudWidgetId,
  stats: ReturnType<typeof usePlayerStats>,
) {
  switch (id) {
    case 'character':
      return <CharacterWidget stats={stats} />;
    case 'hp':
      return <HpWidget stats={stats} />;
    case 'tp':
      return <TpWidget stats={stats} />;
    case 'tnl':
      return <TnlWidget stats={stats} />;
    case 'weight':
      return <WeightWidget stats={stats} />;
    case 'gold':
      return <GoldWidget stats={stats} />;
  }
}

function widgetsForPosition(
  widgets: HudWidget[],
  position: 'left' | 'center' | 'right',
) {
  return widgets
    .filter((w) => w.visible && w.position === position)
    .sort((a, b) => a.order - b.order);
}

export function PlayerHud() {
  const client = useClient();
  const cfg = client.configController;
  const stats = usePlayerStats();

  const [widgets, setWidgets] = useState<HudWidget[]>(() =>
    cfg.getHudWidgets(client.characterId),
  );

  useEffect(() => {
    setWidgets(cfg.getHudWidgets(client.characterId));
    const unsub = cfg.subscribe('hudWidgets', () => {
      setWidgets(cfg.getHudWidgets(client.characterId));
    });
    return unsub;
  }, [cfg, client.characterId]);

  const left = widgetsForPosition(widgets, 'left');
  const center = widgetsForPosition(widgets, 'center');
  const right = widgetsForPosition(widgets, 'right');

  return (
    <div
      role='presentation'
      class='absolute top-0 right-0 left-0 flex h-8 flex-row items-center rounded-none border-base-content/10 border-b bg-base-200/80 px-2 shadow-md backdrop-blur-xs'
      style={{ zIndex: HUD_Z }}
      onClick={stopPropagation}
      onKeyDown={stopPropagation}
      onContextMenu={stopPropagation}
    >
      {/* Left group */}
      <div class='flex flex-1 items-center justify-start gap-1.5'>
        {left.map((w) => (
          <span key={w.id}>{renderWidget(w.id, stats)}</span>
        ))}
      </div>
      {/* Center group */}
      <div class='flex flex-1 items-center justify-center gap-1.5'>
        {center.map((w) => (
          <span key={w.id}>{renderWidget(w.id, stats)}</span>
        ))}
      </div>
      {/* Right group */}
      <div class='flex flex-1 items-center justify-end gap-1.5'>
        {right.map((w) => (
          <span key={w.id}>{renderWidget(w.id, stats)}</span>
        ))}
      </div>
    </div>
  );
}
