import { NpcMapInfo } from "eolib";
import { HealthBar } from "./health-bar";
import { getNpcRectangle } from "../collision";

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
      y: rect.position.y,
    },
    ctx,
  );
}