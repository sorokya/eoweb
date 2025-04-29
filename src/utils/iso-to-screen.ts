import { Vector2 } from "../vector";

export function isoToScreen(
	iv: Vector2,
	tileWidth: number,
	tileHeight: number,
): Vector2 {
	const sx = (iv.x - iv.y) * (tileWidth / 2);
	const sy = (iv.x + iv.y) * (tileHeight / 2);
	return { x: sx, y: sy };
}
