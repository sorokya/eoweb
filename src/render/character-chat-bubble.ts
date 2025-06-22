import type { CharacterMapInfo } from 'eolib';
import { getCharacterRectangle } from '../collision';
import type { ChatBubble } from '../chat-bubble';

export function renderCharacterChatBubble(
  bubble: ChatBubble,
  character: CharacterMapInfo,
  ctx: CanvasRenderingContext2D,
) {
  if (!bubble) {
    return;
  }

  const rect = getCharacterRectangle(character.playerId);
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
