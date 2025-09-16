import type { NpcMapInfo } from 'eolib';
import { getNpcRectangle } from '../collision';
import type { HealthBar } from './health-bar';

export function renderNpcHealthBar(
  hpBar: HealthBar,
  npc: NpcMapInfo,
  ctx: CanvasRenderingContext2D,
) {
  if (!hpBar) {
    return;
  }

  const rect = getNpcRectangle(npc.index);
  if (!rect) {
    return;
  }

  hpBar.render(
    {
      x: rect.position.x + rect.width / 2,
      y: rect.position.y - 20,
    },
    ctx,
  );
}
