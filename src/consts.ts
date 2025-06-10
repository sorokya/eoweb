export const GAME_FPS = 30 / 1000;
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export const HALF_TILE_WIDTH = TILE_WIDTH  >> 1;
export const HALF_TILE_HEIGHT = TILE_HEIGHT >> 1;
export let GAME_WIDTH = 800;
export let GAME_HEIGHT = 600;
export let HALF_GAME_WIDTH = GAME_WIDTH  >> 1;
export let HALF_GAME_HEIGHT = GAME_HEIGHT >> 1;
export const ANIMATION_TICKS = 6;
export const MAX_CHALLENGE = 11_092_110;

export function setGameSize(w: number, h: number): void {
    GAME_WIDTH       = w;
    GAME_HEIGHT      = h;
    HALF_GAME_WIDTH  = w >> 1;
    HALF_GAME_HEIGHT = h >> 1;
}