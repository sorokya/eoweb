import { type CharacterMapInfo, Direction, Gender } from 'eolib';
import {
  getCharacterRectangle,
  Rectangle,
  setCharacterRectangle,
} from '../collision';
import {
  CHARACTER_HEIGHT,
  CHARACTER_RANGE_ATTACK_WIDTH,
  HALF_CHARACTER_RANGE_ATTACK_WIDTH,
  RANGED_ATTACK_ANIMATION_FRAMES,
  RANGED_ATTACK_TICKS,
} from '../consts';
import { GAME_WIDTH, HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from '../game-state';
import { GfxType, getBitmapById } from '../gfx';
import { isoToScreen } from '../utils/iso-to-screen';
import type { Vector2 } from '../vector';
import { CharacterAnimation } from './character-base-animation';

const FEMALE_RANGE_ATTACK_OFFSETS = {
  [Direction.Up]: { x: 0, y: 0 },
  [Direction.Down]: { x: -2, y: 2 },
  [Direction.Left]: { x: 0, y: 0 },
  [Direction.Right]: { x: -2, y: 2 },
};

const MALE_RANGE_ATTACK_OFFSETS = {
  [Direction.Up]: { x: 0, y: 0 },
  [Direction.Down]: { x: 0, y: 0 },
  [Direction.Left]: { x: 0, y: 0 },
  [Direction.Right]: { x: 0, y: 0 },
};

export class CharacterRangedAttackAnimation extends CharacterAnimation {
  direction: Direction;

  constructor(direction: Direction) {
    super();
    this.ticks = RANGED_ATTACK_TICKS;
    this.direction = direction;
    this.animationFrame = 1;
  }

  tick() {
    this.ticks = Math.max(this.ticks - 1, 0);
  }

  calculateRenderPosition(
    character: CharacterMapInfo,
    playerScreen: Vector2,
  ): void {
    const screenCoords = isoToScreen(character.coords);

    const additionalOffset = {
      x: [Direction.Up, Direction.Right].includes(this.direction) ? 5 : -6,
      y: 4,
    };

    if (character.gender === Gender.Female) {
      switch (this.direction) {
        case Direction.Up:
        case Direction.Right:
          additionalOffset.x -= 1;
          break;
        default:
          additionalOffset.x += 1;
      }
    }

    const screenX = Math.floor(
      screenCoords.x -
        HALF_CHARACTER_RANGE_ATTACK_WIDTH -
        playerScreen.x +
        HALF_GAME_WIDTH +
        additionalOffset.x,
    );

    const screenY = Math.floor(
      screenCoords.y -
        CHARACTER_HEIGHT -
        playerScreen.y +
        HALF_GAME_HEIGHT +
        additionalOffset.y,
    );

    setCharacterRectangle(
      character.playerId,
      new Rectangle(
        { x: screenX, y: screenY },
        CHARACTER_RANGE_ATTACK_WIDTH,
        CHARACTER_HEIGHT,
      ),
    );
  }

  render(character: CharacterMapInfo, ctx: CanvasRenderingContext2D) {
    const bmp = getBitmapById(GfxType.SkinSprites, 7);
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

    const drawX =
      Math.floor(
        mirrored
          ? GAME_WIDTH - rect.position.x - CHARACTER_RANGE_ATTACK_WIDTH
          : rect.position.x,
      ) +
      (character.gender === Gender.Female
        ? FEMALE_RANGE_ATTACK_OFFSETS[this.direction].x
        : MALE_RANGE_ATTACK_OFFSETS[this.direction].x);

    const drawY =
      rect.position.y +
      (character.gender === Gender.Female
        ? FEMALE_RANGE_ATTACK_OFFSETS[this.direction].y
        : MALE_RANGE_ATTACK_OFFSETS[this.direction].y);

    const startX =
      character.gender === Gender.Female ? 0 : CHARACTER_RANGE_ATTACK_WIDTH * 2;

    const sourceX =
      startX +
      ([Direction.Up, Direction.Left].includes(character.direction)
        ? CHARACTER_RANGE_ATTACK_WIDTH * RANGED_ATTACK_ANIMATION_FRAMES
        : 0);
    const sourceY = character.skin * CHARACTER_HEIGHT;

    ctx.drawImage(
      bmp.image,
      bmp.frame.x + sourceX,
      bmp.frame.y + sourceY,
      CHARACTER_RANGE_ATTACK_WIDTH,
      CHARACTER_HEIGHT,
      drawX,
      drawY,
      CHARACTER_RANGE_ATTACK_WIDTH,
      CHARACTER_HEIGHT,
    );

    if (mirrored) {
      ctx.restore();
    }
  }
}
