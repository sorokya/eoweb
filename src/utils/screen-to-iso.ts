import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH } from "../consts";
import { Vector2 } from "../vector";

export function screenToIso(sv: Vector2): Vector2 {
	const ix = (sv.x / HALF_TILE_WIDTH + sv.y / HALF_TILE_HEIGHT) / 2;
	const iy = (sv.y / HALF_TILE_HEIGHT - sv.x / HALF_TILE_WIDTH) / 2;
	return { x: Math.floor(ix), y: Math.floor(iy) };
}
