import { screenToIso } from "./utils/screen-to-iso";
import { Vector2 } from "./vector";

export class Cursor {
	coords: Vector2 | undefined;

	update(mousePosition: Vector2) {
		this.coords = screenToIso(mousePosition);
	}

	render(ctx: CanvasRenderingContext2D) {
		if (this.coords) {
		}
	}
}
