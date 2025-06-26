import type { CharacterMapInfo } from 'eolib';
import { getCharacterRectangle } from '../collision';
import type { HealthBar } from './health-bar';

export function renderCharacterHealthBar(
  hpBar: HealthBar,
  character: CharacterMapInfo,
  ctx: CanvasRenderingContext2D,
) {
  if (!hpBar) {
    return;
  }

  const rect = getCharacterRectangle(character.playerId);
  if (!rect) {
    return;
  }

  hpBar.render(
    {
      x: rect.position.x + rect.width / 2,
      y: rect.position.y - 4,
    },
    ctx,
  );
}
