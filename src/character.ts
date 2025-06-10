import { CharacterMapInfo, Direction, Gender, SitState } from "eolib";
import { getBitmapById, GfxType } from "./gfx";
import { GAME_WIDTH, HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from "./game-state";
import { isoToScreen } from "./utils/iso-to-screen";
import { Vector2 } from "./vector";

export enum CharacterState {
	Standing,
	Walking,
	SitGround,
}

const CHARACTER_WIDTH = 18;
const HALF_CHARACTER_WIDTH = CHARACTER_WIDTH / 2;
const CHARACTER_WALKING_WIDTH = 26;
const HALF_CHARACTER_WALKING_WIDTH = CHARACTER_WALKING_WIDTH / 2;
const CHARACTER_SIT_GROUND_WIDTH = 24;
const HALF_CHARACTER_SIT_GROUND_WIDTH = CHARACTER_SIT_GROUND_WIDTH / 2;
const CHARACTER_HEIGHT = 58;
const CHARACTER_WALKING_HEIGHT = 61;
const CHARACTER_SIT_GROUND_HEIGHT = 43;

const WALK_ANIMATION_FRAMES = 4;

export class CharacterRenderer {
	mapInfo: CharacterMapInfo;
	state: CharacterState = CharacterState.Standing;
	animationFrame = 0;
	walkOffset: Vector2 = { x: 0, y: 0 };

	constructor(mapInfo: CharacterMapInfo) {
		this.mapInfo = mapInfo;
		this.state = mapInfo.sitState === SitState.Floor ? CharacterState.SitGround : CharacterState.Standing;
	}

	setState(state: CharacterState) {
		this.state = state;
		this.animationFrame = 0;
		this.walkOffset = { x: 0, y: 0 };
	}

	tick() {
		if (this.state === CharacterState.Walking) {
			this.animationFrame = (this.animationFrame + 1) % WALK_ANIMATION_FRAMES;
		}
	}

	render(ctx: CanvasRenderingContext2D, playerScreen: Vector2) {
		switch (this.state) {
			case CharacterState.Standing:
				this.renderStanding(ctx, playerScreen);
				break;
			case CharacterState.Walking:
				this.renderWalking(ctx, playerScreen);
				break;
			case CharacterState.SitGround:
				this.renderSittingOnGround(ctx, playerScreen);
				break;
		}
	}

	renderStanding(ctx: CanvasRenderingContext2D, playerScreen: Vector2) {
		const bmp = getBitmapById(GfxType.SkinSprites, 1);
		if (!bmp) {
			return;
		}

		const startX =
			this.mapInfo.gender === Gender.Female ? 0 : CHARACTER_WIDTH * 2;
		const sourceX =
			startX +
			([Direction.Up, Direction.Left].includes(this.mapInfo.direction)
				? CHARACTER_WIDTH
				: 0);
		const sourceY = this.mapInfo.skin * CHARACTER_HEIGHT;

		const screenCoords = isoToScreen(this.mapInfo.coords);

		const screenX =
			screenCoords.x - HALF_CHARACTER_WIDTH - playerScreen.x + HALF_GAME_WIDTH;

		const screenY =
			screenCoords.y - CHARACTER_HEIGHT - playerScreen.y + HALF_GAME_HEIGHT + 4;

		const mirrored = [Direction.Right, Direction.Up].includes(
			this.mapInfo.direction,
		);

		if (mirrored) {
			ctx.save(); // Save the current context state
			ctx.translate(GAME_WIDTH, 0); // Move origin to the right edge
			ctx.scale(-1, 1); // Flip horizontally
		}

		const drawX = mirrored ? GAME_WIDTH - screenX - CHARACTER_WIDTH : screenX;

		ctx.drawImage(
			bmp,
			sourceX,
			sourceY,
			CHARACTER_WIDTH,
			CHARACTER_HEIGHT,
			drawX,
			screenY,
			CHARACTER_WIDTH,
			CHARACTER_HEIGHT,
		);

		if (mirrored) {
			ctx.restore();
		}
	}

	renderSittingOnGround(ctx: CanvasRenderingContext2D, playerScreen: Vector2) {
		const bmp = getBitmapById(GfxType.SkinSprites, 6);
		if (!bmp) {
			return;
		}

		const startX =
			this.mapInfo.gender === Gender.Female
				? 0
				: CHARACTER_SIT_GROUND_WIDTH * 2;
		const sourceX =
			startX +
			([Direction.Up, Direction.Left].includes(this.mapInfo.direction)
				? CHARACTER_SIT_GROUND_WIDTH
				: 0);
		const sourceY = this.mapInfo.skin * CHARACTER_SIT_GROUND_HEIGHT;

		const screenCoords = isoToScreen(this.mapInfo.coords);

		const additionalOffset = { x: 0, y: 0 };
		switch (this.mapInfo.direction) {
			case Direction.Up:
				additionalOffset.x = 2;
				additionalOffset.y = 11;
				break;
			case Direction.Down:
				additionalOffset.x = -4;
				additionalOffset.y = 8;
				break;
			case Direction.Left:
				additionalOffset.x = -2;
				additionalOffset.y = 12;
				break;
			case Direction.Right:
				additionalOffset.x = 4;
				additionalOffset.y = 8;
				break;
		}

		const screenX =
			screenCoords.x -
			HALF_CHARACTER_SIT_GROUND_WIDTH -
			playerScreen.x +
			HALF_GAME_WIDTH +
			additionalOffset.x;

		const screenY =
			screenCoords.y -
			CHARACTER_SIT_GROUND_HEIGHT -
			playerScreen.y +
			HALF_GAME_HEIGHT +
			additionalOffset.y;

		const mirrored = [Direction.Right, Direction.Up].includes(
			this.mapInfo.direction,
		);

		if (mirrored) {
			ctx.save(); // Save the current context state
			ctx.translate(GAME_WIDTH, 0); // Move origin to the right edge
			ctx.scale(-1, 1); // Flip horizontally
		}

		const drawX = mirrored
			? GAME_WIDTH - screenX - CHARACTER_SIT_GROUND_WIDTH
			: screenX;

		ctx.drawImage(
			bmp,
			sourceX,
			sourceY,
			CHARACTER_SIT_GROUND_WIDTH,
			CHARACTER_SIT_GROUND_HEIGHT,
			drawX,
			screenY,
			CHARACTER_SIT_GROUND_WIDTH,
			CHARACTER_SIT_GROUND_HEIGHT,
		);

		if (mirrored) {
			ctx.restore();
		}
	}

	renderWalking(ctx: CanvasRenderingContext2D, playerScreen: Vector2) {
		const bmp = getBitmapById(GfxType.SkinSprites, 2);
		if (!bmp) {
			return;
		}

		const startX =
			this.mapInfo.gender === Gender.Female ? 0 : CHARACTER_WALKING_WIDTH * 8;

		const sourceX =
			startX +
			([Direction.Up, Direction.Left].includes(this.mapInfo.direction)
				? CHARACTER_WALKING_WIDTH * WALK_ANIMATION_FRAMES
				: 0) +
			CHARACTER_WALKING_WIDTH * this.animationFrame;
		const sourceY = this.mapInfo.skin * CHARACTER_WALKING_HEIGHT;

		const screenCoords = isoToScreen(this.mapInfo.coords);

		const additionalOffset = { x: 0, y: 0 };
		if (this.mapInfo.gender === Gender.Female) {
			switch (this.mapInfo.direction) {
				case Direction.Up:
					additionalOffset.x = 0;
					additionalOffset.y = 6;
					break;
				case Direction.Down:
					additionalOffset.x = 0;
					additionalOffset.y = 6;
					break;
				case Direction.Left:
					additionalOffset.x = 0;
					additionalOffset.y = 6;
					break;
				case Direction.Right:
					additionalOffset.x = 0;
					additionalOffset.y = 6;
					break;
			}
		} else {
			switch (this.mapInfo.direction) {
				case Direction.Up:
					additionalOffset.x = 0;
					additionalOffset.y = 6;
					break;
				case Direction.Down:
					additionalOffset.x = -1;
					additionalOffset.y = 6;
					break;
				case Direction.Left:
					additionalOffset.x = 0;
					additionalOffset.y = 6;
					break;
				case Direction.Right:
					additionalOffset.x = 1;
					additionalOffset.y = 6;
					break;
			}
		}

		const screenX =
			screenCoords.x -
			HALF_CHARACTER_WALKING_WIDTH -
			playerScreen.x +
			HALF_GAME_WIDTH +
			this.walkOffset.x +
			additionalOffset.x;

		const screenY =
			screenCoords.y -
			CHARACTER_WALKING_HEIGHT -
			playerScreen.y +
			HALF_GAME_HEIGHT +
			this.walkOffset.y +
			additionalOffset.y;

		const mirrored = [Direction.Right, Direction.Up].includes(
			this.mapInfo.direction,
		);

		if (mirrored) {
			ctx.save(); // Save the current context state
			ctx.translate(GAME_WIDTH, 0); // Move origin to the right edge
			ctx.scale(-1, 1); // Flip horizontally
		}

		const drawX = mirrored
			? GAME_WIDTH - screenX - CHARACTER_WALKING_WIDTH
			: screenX;

		ctx.drawImage(
			bmp,
			sourceX,
			sourceY,
			CHARACTER_WALKING_WIDTH,
			CHARACTER_WALKING_HEIGHT,
			drawX,
			screenY,
			CHARACTER_WALKING_WIDTH,
			CHARACTER_WALKING_HEIGHT,
		);

		if (mirrored) {
			ctx.restore();
		}
	}
}
