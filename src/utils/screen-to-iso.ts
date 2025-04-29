import { Vector2 } from "../vector";

export function screenToIso(
	sv: Vector2,
	tileWidth: number,
	tileHeight: number,
): Vector2 {
	const ix = (sv.x / (tileWidth / 2) + sv.y / (tileHeight / 2)) / 2;
	const iy = (sv.y / (tileHeight / 2) - sv.x / (tileWidth / 2)) / 2;
	return { x: Math.floor(ix), y: Math.floor(iy) };
}
