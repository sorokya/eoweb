import { type CharacterMapInfo, Direction, Gender } from 'eolib';
import {
  getCharacterRectangle,
  Rectangle,
  setCharacterRectangle,
} from '../collision';
import {
  ATTACK_ANIMATION_FRAMES,
  ATTACK_TICKS,
  CHARACTER_ATTACK_WIDTH,
  CHARACTER_HEIGHT,
  HALF_CHARACTER_ATTACK_WIDTH,
} from '../consts';
import { GAME_WIDTH, HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from '../game-state';
import { GfxType, getBitmapById, getFrameById } from '../gfx';
import { isoToScreen } from '../utils/iso-to-screen';
import type { Vector2 } from '../vector';
import { CharacterAnimation } from './character-base-animation';

export class CharacterAttackAnimation extends CharacterAnimation {
  direction: Direction;

  constructor(direction: Direction) {
    super();
    this.ticks = ATTACK_TICKS;
    this.direction = direction;
  }

  tick() {
    switch (this.ticks) {
      case 5:
        this.animationFrame = 0;
        break;
      default:
        this.animationFrame = 1;
        break;
    }

    this.ticks = Math.max(this.ticks - 1, 0);
  }

  calculateRenderPosition(
    character: CharacterMapInfo,
    playerScreen: Vector2,
  ): void {
    const screenCoords = isoToScreen(character.coords);

    // TODO: This isn't correct, but it's close enough for now
    const additionalOffset = {
      x: [Direction.Up, Direction.Right].includes(this.direction) ? 2 : -2,
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
        HALF_CHARACTER_ATTACK_WIDTH -
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
        CHARACTER_ATTACK_WIDTH,
        CHARACTER_HEIGHT,
      ),
    );
  }

  render(character: CharacterMapInfo, ctx: CanvasRenderingContext2D) {
    const bmp = getBitmapById(GfxType.SkinSprites, 3);
    if (!bmp) {
      return;
    }

    const frame = getFrameById(GfxType.SkinSprites, 3);

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

    const drawX = Math.floor(
      mirrored
        ? GAME_WIDTH - rect.position.x - CHARACTER_ATTACK_WIDTH
        : rect.position.x,
    );

    const startX =
      character.gender === Gender.Female ? 0 : CHARACTER_ATTACK_WIDTH * 4;

    const sourceX =
      startX +
      ([Direction.Up, Direction.Left].includes(character.direction)
        ? CHARACTER_ATTACK_WIDTH * ATTACK_ANIMATION_FRAMES
        : 0) +
      CHARACTER_ATTACK_WIDTH * this.animationFrame;
    const sourceY = character.skin * CHARACTER_HEIGHT;

    ctx.drawImage(
      bmp,
      sourceX + frame.x,
      sourceY + frame.y,
      CHARACTER_ATTACK_WIDTH,
      CHARACTER_HEIGHT,
      drawX,
      rect.position.y,
      CHARACTER_ATTACK_WIDTH,
      CHARACTER_HEIGHT,
    );

    if (mirrored) {
      ctx.restore();
    }
  }
}
