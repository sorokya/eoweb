import { Emf, MapTileSpec } from "eolib";
import { getBitmapById, GfxType } from "./gfx";
import { isoToScreen } from "./utils/iso-to-screen";
import {
	ANIMATION_TICKS,
	HALF_GAME_HEIGHT,
	HALF_GAME_WIDTH,
	HALF_TILE_HEIGHT,
	HALF_TILE_WIDTH,
	TILE_HEIGHT,
	TILE_WIDTH,
} from "./consts";
import { Vector2 } from "./vector";
import { CharacterRenderer } from "./character";
import { screenToIso } from "./utils/screen-to-iso";

enum EntityType {
	Tile,
	Character,
	Cursor,
}

type Entity = {
	x: number;
	y: number;
	type: EntityType;
	typeId: number;
	depth: number;
	layer: number;
};

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
	Character,
	Cursor,
}

const TDG = 0.00000001; // gap between depth of each tile on a layer
const RDG = 0.001; // gap between depth of each row of tiles

const layerDepth = [
	-3.0 + TDG * 1, // Ground
	0.0 + TDG * 3, // Objects
	0.0 + TDG * 5, // Overlay
	0.0 + TDG * 6, // Down Wall
	-RDG + TDG * 7, // Right Wall
	0.0 + TDG * 8, // Roof
	0.0 + TDG * 1, // Top
	-1.0 + TDG * 1, // Shadow
	1.0 + TDG * 1, // Overlay 2
	0.0 + TDG * 4, // Characters
	0.0 + TDG * 2, // Cursor
];

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
	animationFrame = 0;
	animationTicks = ANIMATION_TICKS;
	playerId: number;
	characters: CharacterRenderer[] = [];
	mousePosition: Vector2 | undefined;
	mouseCoords: Vector2 | undefined;

	constructor(emf: Emf, playerId: number) {
		this.emf = emf;
		this.playerId = playerId;
	}

	setMousePosition(position: Vector2) {
		this.mousePosition = position;

		const player = this.getPlayerCoords();
		const playerScreen = isoToScreen(player);
		const mouseWorldX = position.x - HALF_GAME_WIDTH + playerScreen.x;
		const mouseWorldY =
			position.y - HALF_GAME_HEIGHT + playerScreen.y + HALF_TILE_HEIGHT;
		this.mouseCoords = screenToIso({ x: mouseWorldX, y: mouseWorldY });

		if (this.mouseCoords.x < 0 || this.mouseCoords.y < 0) {
			this.mouseCoords = undefined;
		}
	}

	addCharacter(character: CharacterRenderer) {
		this.characters.push(character);
	}

	getWidth() {
		return this.emf.width;
	}

	getHeight() {
		return this.emf.height;
	}

	tick() {
		this.animationTicks -= 1;
		if (this.animationTicks <= 0) {
			this.animationFrame += 1;
			if (this.animationFrame > 3) {
				this.animationFrame = 0;
			}

			this.animationTicks = ANIMATION_TICKS;
		}

		for (const character of this.characters) {
			character.tick();
		}
	}

	calculateDepth(layer: number, x: number, y: number): number {
		return layerDepth[layer] + y * RDG + x * layerDepth.length * TDG;
	}

	getPlayerCoords() {
		const playerCharacter = this.characters.find(
			(c) => c.mapInfo.playerId === this.playerId,
		);
		return playerCharacter ? playerCharacter.mapInfo.coords : { x: 0, y: 0 };
	}

	render(ctx: CanvasRenderingContext2D) {
		const player = this.getPlayerCoords();
		const playerScreen = isoToScreen(player);
		const diag   = ctx.canvas.width + ctx.canvas.height;
		const rangeX = Math.ceil(diag / HALF_TILE_WIDTH)  + 2;
		const rangeY = Math.ceil(diag / HALF_TILE_HEIGHT) + 2;
		const entities: Entity[] = [];

		for (let y = player.y - rangeY; y <= player.y + rangeY; ++y) {
			if (y < 0 || y > this.emf.height) continue;
			for (let x = player.x - rangeX; x <= player.x + rangeX; ++x) {
				if (x < 0 || x > this.emf.width) continue;

				for (const layer of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
					const graphicId = this.getGraphicId(layer, x, y);
					if (graphicId) {
						entities.push({
							x,
							y,
							layer,
							type: EntityType.Tile,
							typeId: graphicId,
							depth: this.calculateDepth(layer, x, y),
						});
					}
				}

				for (const character of this.characters.filter(
					(c) => c.mapInfo.coords.x === x && c.mapInfo.coords.y === y,
				)) {
					if (character.mapInfo.playerId === this.playerId) {
						playerScreen.x += character.walkOffset.x;
						playerScreen.y += character.walkOffset.y;
					}

					entities.push({
						x,
						y,
						layer: Layer.Character,
						type: EntityType.Character,
						typeId: character.mapInfo.playerId,
						depth: this.calculateDepth(Layer.Character, x, y),
					});
				}
			}
		}

		if (this.mouseCoords) {
			const spec = this.emf.tileSpecRows
				.find((r) => r.y === this.mouseCoords?.y)
				?.tiles.find((t) => t.x === this.mouseCoords?.x);
			if (
				!spec ||
				![MapTileSpec.Wall, MapTileSpec.Edge].includes(spec.tileSpec)
			) {
				const characterAt = this.characters.some(
					(c) =>
						c.mapInfo.coords.x === this.mouseCoords?.x &&
						c.mapInfo.coords.y === this.mouseCoords?.y,
				);
				const typeId = !!spec || characterAt ? 1 : 0;
				entities.push({
					x: this.mouseCoords.x,
					y: this.mouseCoords.y,
					layer: Layer.Cursor,
					type: EntityType.Cursor,
					typeId,
					depth: this.calculateDepth(
						Layer.Cursor,
						this.mouseCoords.x,
						this.mouseCoords.y,
					),
				});
			}
		}

		entities.sort((a, b) => a.depth - b.depth);

		for (const entity of entities) {
			switch (entity.type) {
				case EntityType.Tile:
					this.renderTile(entity, playerScreen, ctx);
					break;
				case EntityType.Character:
					this.renderCharacter(entity, playerScreen, ctx);
					break;
				case EntityType.Cursor:
					this.renderCursor(entity, playerScreen, ctx);
					break;
			}
		}

		const mainCharacterRenderer = this.characters.find(
			(c) => c.mapInfo.playerId === this.playerId,
		);
		if (mainCharacterRenderer) {
			ctx.globalAlpha = 0.4;
			mainCharacterRenderer.render(ctx, playerScreen);
			ctx.globalAlpha = 1;
		}
	}

	renderTile(
		entity: Entity,
		playerScreen: Vector2,
		ctx: CanvasRenderingContext2D,
	) {
		const bmp = getBitmapById(LAYER_GFX_MAP[entity.layer], entity.typeId);
		if (!bmp) {
			return;
		}

		const offset = this.getOffset(entity.layer, bmp.width, bmp.height);
		const tileScreen = isoToScreen({ x: entity.x, y: entity.y });

		const screenX =
			tileScreen.x -
			HALF_TILE_WIDTH -
			playerScreen.x +
			HALF_GAME_WIDTH +
			offset.x;
		const screenY =
			tileScreen.y -
			HALF_TILE_HEIGHT -
			playerScreen.y +
			HALF_GAME_HEIGHT +
			offset.y;

		if (entity.layer === Layer.Shadow) {
			ctx.globalAlpha = 0.2;
		} else {
			ctx.globalAlpha = 1;
		}

		if (entity.layer === Layer.Ground && bmp.width > TILE_WIDTH) {
			ctx.drawImage(
				bmp,
				this.animationFrame * TILE_WIDTH,
				0,
				TILE_WIDTH,
				TILE_HEIGHT,
				screenX,
				screenY,
				TILE_WIDTH,
				TILE_HEIGHT,
			);
		} else if (
			bmp.width > 120 &&
			[Layer.DownWall, Layer.RightWall].includes(entity.layer)
		) {
			const frameWidth = bmp.width / 4;
			ctx.drawImage(
				bmp,
				this.animationFrame * frameWidth,
				0,
				frameWidth,
				bmp.height,
				screenX,
				screenY,
				frameWidth,
				bmp.height,
			);
		} else {
			ctx.drawImage(bmp, screenX, screenY);
		}
	}

	renderCharacter(
		entity: Entity,
		playerScreen: Vector2,
		ctx: CanvasRenderingContext2D,
	) {
		const renderer = this.characters.find(
			(c) => c.mapInfo.playerId === entity.typeId,
		);
		if (renderer) {
			renderer.render(ctx, playerScreen);
		}
	}

	renderCursor(
		entity: Entity,
		playerScreen: Vector2,
		ctx: CanvasRenderingContext2D,
	) {
		const bmp = getBitmapById(GfxType.PostLoginUI, 24);
		if (bmp && this.mouseCoords) {
			const tileScreen = isoToScreen({
				x: this.mouseCoords.x,
				y: this.mouseCoords.y,
			});

			const sourceX = entity.typeId * TILE_WIDTH;

			const screenX =
				tileScreen.x - HALF_TILE_WIDTH - playerScreen.x + HALF_GAME_WIDTH;

			const screenY =
				tileScreen.y - HALF_TILE_HEIGHT - playerScreen.y + HALF_GAME_HEIGHT;

			ctx.drawImage(
				bmp,
				sourceX,
				0,
				TILE_WIDTH,
				TILE_HEIGHT,
				screenX,
				screenY,
				TILE_WIDTH,
				TILE_HEIGHT,
			);
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

		if ([Layer.Objects, Layer.Overlay, Layer.Overlay2].includes(layer)) {
			return {
				x: -2 - width / 2 + HALF_TILE_WIDTH,
				y: -2 - height + TILE_HEIGHT,
			};
		}

		if (layer === Layer.DownWall) {
			return { x: -32 + HALF_TILE_WIDTH, y: -1 - (height - TILE_HEIGHT) };
		}

		if (layer === Layer.RightWall) {
			return { x: HALF_TILE_WIDTH, y: -1 - (height - TILE_HEIGHT) };
		}

		if (layer === Layer.Roof) {
			return { x: 0, y: -TILE_WIDTH };
		}

		if (layer === Layer.Top) {
			return { x: 0, y: -TILE_HEIGHT };
		}

		return { x: 0, y: 0 };
	}
}
