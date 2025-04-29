import { Emf } from "eolib";
import { getBitmapById, GfxType } from "./gfx";
import { Vector2 } from "./vector";
import { screenToIso } from "./utils/screen-to-iso";
import { isoToScreen } from "./utils/iso-to-screen";

const TILE_WIDTH = 64.0;
const TILE_HEIGHT = 32.0;
const HALF_TILE_WIDTH = TILE_WIDTH / 2;
const HALF_TILE_HEIGHT = TILE_HEIGHT / 2;

enum Layer {
	Ground,
	Objects,
	Overlay,
	DownWall,
	RightWall,
	Roof,
	Top,
	Shadow,
	Overlay2,
}

const LAYER_GFX_MAP = [
	GfxType.MapTiles,
	GfxType.MapObjects,
	GfxType.MapOverlay,
	GfxType.MapWalls,
	GfxType.MapWalls,
	GfxType.MapWallTop,
	GfxType.MapTiles,
	GfxType.Shadows,
	GfxType.MapOverlay,
];

export class MapRenderer {
	emf: Emf;
	screenWidth: number;
	screenHeight: number;
	halfScreenWidth: number;
	halfScreenHeight: number;

	constructor(emf: Emf, screenWidth: number, screenHeight: number) {
		this.emf = emf;
		this.screenWidth = screenWidth;
		this.screenHeight = screenHeight;
		this.halfScreenWidth = screenWidth / 2;
		this.halfScreenHeight = screenHeight / 4;
	}

	getWidth() {
		return this.emf.width;
	}

	getHeight() {
		return this.emf.height;
	}

	update() {}

	render(ctx: CanvasRenderingContext2D, player: Vector2) {
		const playerScreen = isoToScreen(player, TILE_WIDTH, TILE_HEIGHT);
		const rangeX = 30;
		const rangeY = 30;

		for (const layer of [Layer.Ground, Layer.Shadow]) {
			for (let y = player.y - rangeY; y <= player.y + rangeY; ++y) {
				if (y < 0 || y > this.emf.height) continue;
				for (let x = player.x - rangeX; x <= player.x + rangeX; ++x) {
					if (x < 0 || x > this.emf.width) continue;

					const graphicId = this.getGraphicId(layer, x, y);
					if (!graphicId) {
						continue;
					}

					const bmp = getBitmapById(LAYER_GFX_MAP[layer], graphicId);
					if (!bmp) {
						continue;
					}

					const offset = this.getOffset(layer, bmp.width, bmp.height);
					const tileScreen = isoToScreen({ x, y }, TILE_WIDTH, TILE_HEIGHT);

					const screenX =
						tileScreen.x - playerScreen.x + this.halfScreenWidth + offset.x;
					const screenY =
						tileScreen.y - playerScreen.y + this.halfScreenHeight + offset.y;

					if (layer === Layer.Shadow) {
						ctx.globalAlpha = 0.2;
					} else {
						ctx.globalAlpha = 1;
					}

					if (layer === Layer.Ground && bmp.width > TILE_WIDTH) {
						ctx.drawImage(
							bmp,
							0,
							0,
							TILE_WIDTH,
							TILE_HEIGHT,
							screenX,
							screenY,
							TILE_WIDTH,
							TILE_HEIGHT,
						);
					} else {
						ctx.drawImage(bmp, screenX, screenY);
					}
				}
			}
		}

		ctx.globalAlpha = 1;

		for (let y = player.y - rangeY; y <= player.y + rangeY; ++y) {
			if (y < 0 || y > this.emf.height) continue;
			for (let x = player.x - rangeX; x <= player.x + rangeX; ++x) {
				if (x < 0 || x > this.emf.width) continue;

				for (const layer of [
					Layer.RightWall,
					Layer.Top,
					Layer.Objects,
					Layer.Overlay,
					Layer.DownWall,
					Layer.Roof,
					Layer.Overlay2,
				]) {
					const graphicId = this.getGraphicId(layer, x, y);
					if (!graphicId) {
						continue;
					}

					const bmp = getBitmapById(LAYER_GFX_MAP[layer], graphicId);
					if (!bmp) {
						continue;
					}

					const offset = this.getOffset(layer, bmp.width, bmp.height);
					const tileScreen = isoToScreen({ x, y }, TILE_WIDTH, TILE_HEIGHT);

					const screenX =
						tileScreen.x - playerScreen.x + this.halfScreenWidth + offset.x;
					const screenY =
						tileScreen.y - playerScreen.y + this.halfScreenHeight + offset.y;

					ctx.drawImage(bmp, screenX, screenY);
				}
			}
		}
	}

	getGraphicId(layer: number, x: number, y: number): number | null {
		const tile = this.emf.graphicLayers[layer].graphicRows
			.find((r) => r.y === y)
			?.tiles.find((t) => t.x === x);

		if (!tile) {
			if (layer === Layer.Ground && this.emf.fillTile) {
				return this.emf.fillTile;
			} else {
				return null;
			}
		}

		return tile.graphic;
	}

	getOffset(
		layer: number,
		width: number,
		height: number,
	): { x: number; y: number } {
		if (layer === Layer.Shadow) {
			return { x: -24, y: -12 };
		}

		if (layer in [Layer.Objects, Layer.Overlay, Layer.Overlay2]) {
			return { x: -2 - width / 2 + HALF_TILE_WIDTH, y: -2 - (height - 32) };
		}

		if (layer === Layer.DownWall) {
			return { x: -32 + HALF_TILE_WIDTH, y: -1 - (height - 32) };
		}

		if (layer === Layer.RightWall) {
			return { x: HALF_TILE_WIDTH, y: -1 - (height - 32) };
		}

		if (layer === Layer.Roof) {
			return { x: 0, y: -64 };
		}

		if (layer === Layer.Top) {
			return { x: 0, y: -32 };
		}

		return { x: 0, y: 0 };
	}
}
