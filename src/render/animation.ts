export abstract class Animation {
  ticks!: number;
  animationFrame = 0;
  abstract tick(): void;
  renderedFirstFrame = false;
}
