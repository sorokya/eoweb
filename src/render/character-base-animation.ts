import type { CharacterMapInfo } from 'eolib';
import type { Vector2 } from '../vector';

export abstract class CharacterAnimation {
  ticks: number;
  abstract tick(): void;
  abstract render(
    character: CharacterMapInfo,
    ctx: CanvasRenderingContext2D,
  ): void;
  abstract calculateRenderPosition(
    character: CharacterMapInfo,
    playerScreen: Vector2,
  ): void;
}
