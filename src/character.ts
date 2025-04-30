import { CharacterMapInfo, Direction, Gender } from "eolib";
import { getBitmapById, GfxType } from "./gfx";
import { isoToScreen } from "./utils/iso-to-screen";
import {
	HALF_GAME_HEIGHT,
	HALF_GAME_WIDTH,
	HALF_TILE_HEIGHT,
	HALF_TILE_WIDTH,
	TILE_HEIGHT,
} from "./consts";

enum CharacterState {
	Standing,
}

const CHARACTER_WIDTH = 18;
const HALF_CHARACTER_WIDTH = CHARACTER_WIDTH / 2;
const CHARACTER_HEIGHT = 58;

export class MainCharacterRenderer {
	mapInfo: CharacterMapInfo;
	state: CharacterState = CharacterState.Standing;

	constructor(mapInfo: CharacterMapInfo) {
		this.mapInfo = mapInfo;
	}

	update() {}

	render(ctx: CanvasRenderingContext2D) {
		switch (this.state) {
			case CharacterState.Standing:
				return this.renderStanding(ctx);
		}
	}

	renderStanding(ctx: CanvasRenderingContext2D) {
		const bmp = getBitmapById(GfxType.SkinSprites, 1);
		if (!bmp) {
			return;
		}

		const sourceX =
			this.mapInfo.gender === Gender.Female
				? 0
				: CHARACTER_WIDTH * 2 + this.mapInfo.direction in
						[Direction.Up, Direction.Left]
					? CHARACTER_WIDTH
					: 0;

		const sourceY = this.mapInfo.skin * CHARACTER_HEIGHT;

		ctx.drawImage(
			bmp,
			sourceX,
			sourceY,
			CHARACTER_WIDTH,
			CHARACTER_HEIGHT,
			HALF_GAME_WIDTH -
				HALF_TILE_WIDTH -
				HALF_CHARACTER_WIDTH +
				HALF_TILE_WIDTH,
			HALF_GAME_HEIGHT - HALF_TILE_HEIGHT - CHARACTER_HEIGHT + HALF_TILE_HEIGHT,
			CHARACTER_WIDTH,
			CHARACTER_HEIGHT,
		);
	}
}
