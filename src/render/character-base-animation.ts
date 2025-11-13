export abstract class CharacterAnimation {
  ticks: number;
  animationFrame = 0;
  abstract tick(): void;
  renderedFirstFrame = false;
}
