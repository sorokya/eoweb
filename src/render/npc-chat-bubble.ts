import type { NpcMapInfo } from 'eolib';
import type { ChatBubble } from '../chat-bubble';
import { getNpcRectangle } from '../collision';

export function renderNpcChatBubble(
  bubble: ChatBubble,
  npc: NpcMapInfo,
  ctx: CanvasRenderingContext2D,
) {
  if (!bubble) {
    return;
  }

  const rect = getNpcRectangle(npc.index);
  if (!rect) {
    return;
  }

  bubble.render(
    {
      x: rect.position.x + rect.width / 2,
      y: rect.position.y - 4,
    },
    ctx,
  );
}
