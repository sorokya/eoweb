import { type CharacterMapInfo, type Coords, Direction, Gender } from 'eolib';
import {
  getCharacterRectangle,
  Rectangle,
  setCharacterRectangle,
} from '../collision';
import {
  CHARACTER_WALKING_HEIGHT,
  CHARACTER_WALKING_WIDTH,
  HALF_CHARACTER_WALKING_WIDTH,
  WALK_ANIMATION_FRAMES,
  WALK_HEIGHT_FACTOR,
  WALK_TICKS,
  WALK_WIDTH_FACTOR,
} from '../consts';
import { GAME_WIDTH, HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from '../game-state';
import { GfxType, getBitmapById } from '../gfx';
import { isoToScreen } from '../utils/iso-to-screen';
import type { Vector2 } from '../vector';
import { CharacterAnimation } from './character-base-animation';

export class CharacterWalkAnimation extends CharacterAnimation {
  from: Coords;
  to: Coords;
  direction: Direction;
  walkOffset = { x: 0, y: 0 };

  constructor(from: Coords, to: Coords, direction: Direction) {
    super();
    this.ticks = WALK_TICKS;
    this.from = from;
    this.to = to;
    this.direction = direction;
  }

  tick() {
    if (this.ticks === 0) {
      return;
    }

    const walkFrame = Math.abs(this.ticks - WALK_TICKS) + 1;
    this.animationFrame = (this.animationFrame + 1) % WALK_ANIMATION_FRAMES;
    this.walkOffset = {
      [Direction.Up]: {
        x: WALK_WIDTH_FACTOR * walkFrame,
        y: -WALK_HEIGHT_FACTOR * walkFrame,
      },
      [Direction.Down]: {
        x: -WALK_WIDTH_FACTOR * walkFrame,
        y: WALK_HEIGHT_FACTOR * walkFrame,
      },
      [Direction.Left]: {
        x: -WALK_WIDTH_FACTOR * walkFrame,
        y: -WALK_HEIGHT_FACTOR * walkFrame,
      },
      [Direction.Right]: {
        x: WALK_WIDTH_FACTOR * walkFrame,
        y: WALK_HEIGHT_FACTOR * walkFrame,
      },
    }[this.direction];
    this.ticks = Math.max(this.ticks - 1, 0);
  }

  calculateRenderPosition(
    character: CharacterMapInfo,
    playerScreen: Vector2,
  ): void {
    const screenCoords = isoToScreen(this.from);

    const additionalOffset = { x: 0, y: 0 };
    if (character.gender === Gender.Female) {
      switch (character.direction) {
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
      switch (character.direction) {
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

    const screenX = Math.floor(
      screenCoords.x -
        HALF_CHARACTER_WALKING_WIDTH -
        playerScreen.x +
        HALF_GAME_WIDTH +
        this.walkOffset.x +
        additionalOffset.x,
    );

    const screenY = Math.floor(
      screenCoords.y -
        CHARACTER_WALKING_HEIGHT -
        playerScreen.y +
        HALF_GAME_HEIGHT +
        this.walkOffset.y +
        additionalOffset.y,
    );

    setCharacterRectangle(
      character.playerId,
      new Rectangle(
        { x: screenX, y: screenY },
        CHARACTER_WALKING_WIDTH,
        CHARACTER_WALKING_HEIGHT,
      ),
    );
  }

  render(character: CharacterMapInfo, ctx: CanvasRenderingContext2D) {
    const bmp = getBitmapById(GfxType.SkinSprites, 2);
    if (!bmp) {
      return;
    }

    const rect = getCharacterRectangle(character.playerId);
    if (!rect) {
      return;
    }

    const mirrored = [Direction.Right, Direction.Up].includes(
      character.direction,
    );

    if (mirrored) {
      ctx.save(); // Save the current context state
      ctx.translate(GAME_WIDTH, 0); // Move origin to the right edge
      ctx.scale(-1, 1); // Flip horizontally
    }

    const startX =
      character.gender === Gender.Female ? 0 : CHARACTER_WALKING_WIDTH * 8;

    const sourceX =
      startX +
      ([Direction.Up, Direction.Left].includes(character.direction)
        ? CHARACTER_WALKING_WIDTH * WALK_ANIMATION_FRAMES
        : 0) +
      CHARACTER_WALKING_WIDTH * this.animationFrame;
    const sourceY = character.skin * CHARACTER_WALKING_HEIGHT;

    const drawX = Math.floor(
      mirrored
        ? GAME_WIDTH - CHARACTER_WALKING_WIDTH - rect.position.x
        : rect.position.x,
    );

    ctx.drawImage(
      bmp,
      sourceX,
      sourceY,
      CHARACTER_WALKING_WIDTH,
      CHARACTER_WALKING_HEIGHT,
      drawX,
      rect.position.y,
      CHARACTER_WALKING_WIDTH,
      CHARACTER_WALKING_HEIGHT,
    );

    if (mirrored) {
      ctx.restore();
    }
  }

  isOnLastFrame(): boolean {
    return this.ticks === 0.3;
  }
}
