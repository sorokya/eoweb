export abstract class NpcAnimation {
  ticks: number;
  animationFrame = 0;
  abstract tick(): void;
  renderedFirstFrame = false;
}
