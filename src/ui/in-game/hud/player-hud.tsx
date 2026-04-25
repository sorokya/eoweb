import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { BiSolidStar } from 'react-icons/bi';
import { FaCoins, FaHeart, FaSignal } from 'react-icons/fa';
import { GiWeightLiftingUp } from 'react-icons/gi';
import { GrMagic } from 'react-icons/gr';
import type { HudWidget, HudWidgetId } from '@/controllers';
import { playSfxById, SfxId } from '@/sfx';
import { ProgressBar } from '@/ui/components';
import {
  HUD_ICON_BG,
  HUD_TEXT,
  HUD_TEXT_MUTED,
  HUD_Z,
  UI_PANEL_BG,
  UI_PANEL_BORDER,
} from '@/ui/consts';
import { useClient, useLocale } from '@/ui/context';
import {
  useBackdropBlur,
  usePlayerStats,
  useWindowManager,
} from '@/ui/in-game';
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

function pingColor(ms: number): 'success' | 'warning' | 'error' {
  if (ms <= 100) return 'success';
  if (ms <= 250) return 'warning';
  return 'error';
}

type WidgetProps = {
  stats: ReturnType<typeof usePlayerStats>;
};

function CharacterWidget({ stats }: WidgetProps) {
  const { locale } = useLocale();
  return (
    <div class='flex shrink-0 items-center gap-1'>
      <span class={`truncate font-bold text-sm leading-tight ${HUD_TEXT}`}>
        {capitalize(stats.name)}
      </span>
      <span class={`text-[10px] leading-tight ${HUD_TEXT_MUTED}`}>
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
        <span class={`text-error ${HUD_ICON_BG}`}>
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
        <span class={`text-info ${HUD_ICON_BG}`}>
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
        <span class={`text-warning ${HUD_ICON_BG}`}>
          <BiSolidStar size={12} />
        </span>
      }
      label={locale.hudTNL}
      color='warning'
    />
  );
}

function WeightWidget({ stats }: WidgetProps) {
  const percent = useMemo(() => {
    return stats.maxWeight > 0
      ? Math.round((stats.weight / stats.maxWeight) * 100)
      : 0;
  }, [stats.weight, stats.maxWeight]);

  return (
    <span
      class={`flex items-center gap-0.5 text-[10px] leading-tight ${HUD_TEXT}`}
    >
      <span class={`text-sky-300 ${HUD_ICON_BG}`}>
        <GiWeightLiftingUp size={12} />
      </span>
      <span class='hidden md:inline'>
        {stats.weight} / {stats.maxWeight}
      </span>
      <span class='inline md:hidden'>{percent}%</span>
    </span>
  );
}

function GoldWidget({ stats }: WidgetProps) {
  const { locale } = useLocale();
  return (
    <div
      class={`flex items-center gap-0.5 text-[10px] leading-tight ${HUD_TEXT}`}
    >
      <span class={`text-yellow-400 ${HUD_ICON_BG}`}>
        <FaCoins size={12} />
      </span>
      {formatBigNumber(stats.gold)}
      <span class='hidden md:inline'>{locale.wordGold}</span>
    </div>
  );
}

function PingWidget() {
  const client = useClient();
  const { locale } = useLocale();
  const { toggleDialog } = useWindowManager();
  const [ping, setPing] = useState<number | null>(() => {
    const h = client.pingController.pingHistory;
    return h.length > 0 ? h[h.length - 1] : null;
  });

  useEffect(() => {
    return client.pingController.subscribe(() => {
      const h = client.pingController.pingHistory;
      setPing(h.length > 0 ? h[h.length - 1] : null);
    });
  }, [client.pingController]);

  const handleClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      playSfxById(SfxId.ButtonClick);
      toggleDialog('ping');
    },
    [toggleDialog],
  );

  const color = ping !== null ? pingColor(ping) : null;
  const colorClass =
    color === 'success'
      ? 'text-success'
      : color === 'warning'
        ? 'text-warning'
        : color === 'error'
          ? 'text-error'
          : HUD_TEXT;

  return (
    <button
      type='button'
      class={`flex cursor-pointer items-center gap-0.5 bg-transparent text-[10px] leading-tight ${HUD_TEXT}`}
      onClick={handleClick}
    >
      <span class={`${colorClass} ${HUD_ICON_BG}`}>
        <FaSignal size={12} />
      </span>
      <span class={colorClass}>
        {ping !== null ? ping : '---'}
        {locale.pingMs}
      </span>
    </button>
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
    case 'ping':
      return <PingWidget />;
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
  const blur = useBackdropBlur();

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
      class={`absolute top-0 right-0 left-0 flex h-8 flex-row items-center rounded-none ${UI_PANEL_BORDER} border-b ${UI_PANEL_BG} px-2 shadow-md ${blur}`}
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
