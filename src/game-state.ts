export let GAME_WIDTH = 800;
export let GAME_HEIGHT = 600;
export let HALF_GAME_WIDTH = GAME_WIDTH >> 1;
export let HALF_GAME_HEIGHT = GAME_HEIGHT >> 1;
export let ZOOM = 1;

export function setGameSize(w: number, h: number): void {
  GAME_WIDTH = w;
  GAME_HEIGHT = h;
  HALF_GAME_WIDTH = w >> 1;
  HALF_GAME_HEIGHT = h >> 1;
}

export function setZoom(z: number): void {
  ZOOM = z;
}

export let PING_START = 0;
export function setPingStart(start: Date): void {
  PING_START = start.getTime();
}