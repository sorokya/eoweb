import type { Rectangle } from '../collision';

export function renderSpellChant(
  rect: Rectangle,
  chant: string,
  ctx: CanvasRenderingContext2D,
) {
  ctx.font = '12px w95fa';
  ctx.fillStyle = '#fff';

  const metrics = ctx.measureText(chant);
  const textWidth = metrics.width;

  ctx.fillText(
    chant,
    rect.position.x + (rect.width >> 1) - (textWidth >> 1),
    rect.position.y - 10,
  );
}
