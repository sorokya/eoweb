import { useCallback, useEffect, useState } from 'preact/hooks';
import { FaArrowDown, FaArrowUp } from 'react-icons/fa';
import type { HudPosition, HudWidget, HudWidgetId } from '@/controllers';
import { Select } from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';

const POSITION_OPTIONS: HudPosition[] = ['left', 'center', 'right'];

export function HudTab() {
  const { locale } = useLocale();
  const client = useClient();
  const cfg = client.configController;

  const [widgets, setWidgets] = useState<HudWidget[]>(() =>
    cfg.getHudWidgets(client.characterId),
  );

  // Reload when characterId changes
  useEffect(() => {
    setWidgets(cfg.getHudWidgets(client.characterId));
  }, [cfg, client.characterId]);

  const save = useCallback(
    (next: HudWidget[]) => {
      setWidgets(next);
      cfg.setHudWidgets(client.characterId, next);
    },
    [cfg, client.characterId],
  );

  const toggleVisible = useCallback(
    (id: HudWidgetId) => {
      save(
        widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)),
      );
    },
    [widgets, save],
  );

  const setPosition = useCallback(
    (id: HudWidgetId, position: HudPosition) => {
      save(widgets.map((w) => (w.id === id ? { ...w, position } : w)));
    },
    [widgets, save],
  );

  const moveOrder = useCallback(
    (id: HudWidgetId, direction: -1 | 1) => {
      const idx = widgets.findIndex((w) => w.id === id);
      if (idx < 0) return;
      const widget = widgets[idx];
      // Get peers in same position, sorted by order
      const peers = widgets
        .filter((w) => w.position === widget.position)
        .sort((a, b) => a.order - b.order);
      const peerIdx = peers.findIndex((w) => w.id === id);
      const targetPeer = peers[peerIdx + direction];
      if (!targetPeer) return;
      // Swap orders between this widget and the target
      save(
        widgets.map((w) => {
          if (w.id === id) return { ...w, order: targetPeer.order };
          if (w.id === targetPeer.id) return { ...w, order: widget.order };
          return w;
        }),
      );
    },
    [widgets, save],
  );

  const widgetLabel = (id: HudWidgetId): string => {
    const map: Record<HudWidgetId, string> = {
      character: locale.settingsHudWidgetCharacter,
      hp: locale.settingsHudWidgetHp,
      tp: locale.settingsHudWidgetTp,
      tnl: locale.settingsHudWidgetTnl,
      weight: locale.settingsHudWidgetWeight,
      gold: locale.settingsHudWidgetGold,
    };
    return map[id];
  };

  const positionOptions = POSITION_OPTIONS.map((p) => ({
    value: p,
    label:
      p === 'left'
        ? locale.settingsHudLeft
        : p === 'center'
          ? locale.settingsHudCenter
          : locale.settingsHudRight,
  }));

  const sortedWidgets = [...widgets].sort((a, b) => {
    const posOrder = { left: 0, center: 1, right: 2 };
    const posDiff = posOrder[a.position] - posOrder[b.position];
    return posDiff !== 0 ? posDiff : a.order - b.order;
  });

  return (
    <div class='flex flex-col gap-2 p-2'>
      <p class='text-xs opacity-50'>{locale.settingsHudPerCharNote}</p>
      <div class='divider my-0' />
      {/* Header */}
      <div class='grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 font-semibold text-xs opacity-60'>
        <span>{locale.settingsHudWidget}</span>
        <span class='text-center'>{locale.settingsHudVisible}</span>
        <span>{locale.settingsHudPosition}</span>
        <span>{locale.settingsHudOrder}</span>
      </div>
      {sortedWidgets.map((w) => {
        const peers = sortedWidgets.filter((p) => p.position === w.position);
        const peerIdx = peers.findIndex((p) => p.id === w.id);
        const canMoveUp = peerIdx > 0;
        const canMoveDown = peerIdx < peers.length - 1;

        return (
          <div
            key={w.id}
            class='grid grid-cols-[1fr_auto_auto_auto] items-center gap-2'
          >
            <span class='text-sm'>{widgetLabel(w.id)}</span>
            <div class='flex justify-center'>
              <input
                type='checkbox'
                class='checkbox checkbox-xs'
                checked={w.visible}
                onChange={() => toggleVisible(w.id)}
              />
            </div>
            <Select
              value={w.position}
              options={positionOptions}
              onChange={(v) => setPosition(w.id, v as HudPosition)}
              variant='xs'
            />
            <div class='flex gap-0.5'>
              <button
                type='button'
                class='btn btn-xs btn-ghost p-0.5'
                disabled={!canMoveUp}
                onClick={() => moveOrder(w.id, -1)}
                aria-label='Move up'
              >
                <FaArrowUp size={10} />
              </button>
              <button
                type='button'
                class='btn btn-xs btn-ghost p-0.5'
                disabled={!canMoveDown}
                onClick={() => moveOrder(w.id, 1)}
                aria-label='Move down'
              >
                <FaArrowDown size={10} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
