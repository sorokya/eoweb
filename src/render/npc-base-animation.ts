import type { NpcMapInfo } from 'eolib';
import type { NPCMetadata } from '../utils/get-npc-metadata';
import type { Vector2 } from '../vector';

export abstract class NpcAnimation {
  ticks: number;
  animationFrame = 0;
  abstract tick(): void;
  abstract render(
    graphicId: number,
    npc: NpcMapInfo,
    meta: NPCMetadata,
    playerScreen: Vector2,
    ctx: CanvasRenderingContext2D,
  ): void;
}
