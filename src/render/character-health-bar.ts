import { CharacterMapInfo } from "eolib";
import { HealthBar } from "./health-bar";
import { getCharacterRectangle } from "../collision";

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