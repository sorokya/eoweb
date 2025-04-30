import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH } from "../consts";
import { Vector2 } from "../vector";

export function isoToScreen(iv: Vector2): Vector2 {
	const sx = (iv.x - iv.y) * HALF_TILE_WIDTH;
	const sy = (iv.x + iv.y) * HALF_TILE_HEIGHT;
	return { x: sx, y: sy };
}
