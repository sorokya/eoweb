import {
  type CharacterMapInfo,
  Direction,
  Gender,
  SitState,
} from 'eolib';
import { GAME_WIDTH, HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from '../game-state';
import { GfxType, getBitmapById } from '../gfx';
import { isoToScreen } from '../utils/iso-to-screen';
import type { Vector2 } from '../vector';
import { WALK_HEIGHT_FACTOR, WALK_TICKS, WALK_WIDTH_FACTOR } from '../consts';
import { getPrevCoords } from '../utils/get-prev-coords';
import { bigCoordsToCoords } from '../utils/big-coords-to-coords';
import type { Client } from '../client';

export enum CharacterState {
  Standing = 0,
  Walking = 1,
  SitGround = 2,
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
  isPlayer = false;
  playerId: number;
  private client: Client;
  state: CharacterState = CharacterState.Standing;
  animationFrame = 0;
  walkOffset: Vector2 = { x: 0, y: 0 };
  walkTicks = WALK_TICKS;

  constructor(client: Client, playerId: number) {
    this.client = client;
    this.playerId = playerId;
    const info = this.mapInfo;
    this.state =
      info && info.sitState === SitState.Floor
        ? CharacterState.SitGround
        : CharacterState.Standing;
    this.preloadSprites();
  }

  get mapInfo(): CharacterMapInfo | undefined {
    return this.client.nearby.characters.find((c) => c.playerId === this.playerId);
  }

  preloadSprites() {
    getBitmapById(GfxType.SkinSprites, 1); // standing
    getBitmapById(GfxType.SkinSprites, 2); // walking
    getBitmapById(GfxType.SkinSprites, 6); // sitting on ground
  }

  setState(state: CharacterState) {
    this.state = state;
    this.animationFrame = 0;
    this.walkOffset = { x: 0, y: 0 };
    this.walkTicks = WALK_TICKS;
  }

  tick() {
    const info = this.mapInfo;
    if (!info) return;

    if (this.state === CharacterState.Walking) {
      const walkFrame = Math.abs(this.walkTicks - WALK_TICKS) + 1;
      this.animationFrame = (this.animationFrame + 1) % WALK_ANIMATION_FRAMES;
      const dir = info.direction;
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
      }[dir];

      this.walkTicks = Math.max(this.walkTicks - 1, 0);
      if (this.walkTicks === 0) {
        this.walkOffset = { x: 0, y: 0 };
        this.walkTicks = WALK_TICKS;
        this.setState(CharacterState.Standing);
      }
    }

    if (this.state === CharacterState.Standing && info.sitState === SitState.Floor) {
      this.setState(CharacterState.SitGround);
    }

    if (this.state === CharacterState.SitGround && info.sitState === SitState.Stand) {
      this.setState(CharacterState.Standing);
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    playerScreen: Vector2,
    mapWidth: number,
    mapHeight: number,
  ) {
    const info = this.mapInfo;
    if (!info) return;

    switch (this.state) {
      case CharacterState.Standing:
        this.renderStanding(info, ctx, playerScreen);
        break;
      case CharacterState.Walking:
        this.renderWalking(info, ctx, playerScreen, mapWidth, mapHeight);
        break;
      case CharacterState.SitGround:
        this.renderSittingOnGround(info, ctx, playerScreen);
        break;
    }
  }

  renderStanding(
    info: CharacterMapInfo,
    ctx: CanvasRenderingContext2D,
    playerScreen: Vector2,
  ) {
    const bmp = getBitmapById(GfxType.SkinSprites, 1);
    if (!bmp) {
      return;
    }

    const startX =
      info.gender === Gender.Female ? 0 : CHARACTER_WIDTH * 2;
    const sourceX =
      startX +
      ([Direction.Up, Direction.Left].includes(info.direction)
        ? CHARACTER_WIDTH
        : 0);
    const sourceY = info.skin * CHARACTER_HEIGHT;

    const screenCoords = isoToScreen(info.coords);

    const screenX =
      screenCoords.x - HALF_CHARACTER_WIDTH - playerScreen.x + HALF_GAME_WIDTH;

    const screenY =
      screenCoords.y - CHARACTER_HEIGHT - playerScreen.y + HALF_GAME_HEIGHT + 4;

    const mirrored = [Direction.Right, Direction.Up].includes(
      info.direction,
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

  renderSittingOnGround(
    info: CharacterMapInfo,
    ctx: CanvasRenderingContext2D,
    playerScreen: Vector2,
  ) {
    const bmp = getBitmapById(GfxType.SkinSprites, 6);
    if (!bmp) {
      return;
    }

    const startX =
      info.gender === Gender.Female
        ? 0
        : CHARACTER_SIT_GROUND_WIDTH * 2;
    const sourceX =
      startX +
      ([Direction.Up, Direction.Left].includes(info.direction)
        ? CHARACTER_SIT_GROUND_WIDTH
        : 0);
    const sourceY = info.skin * CHARACTER_SIT_GROUND_HEIGHT;

    const screenCoords = isoToScreen(info.coords);

    const additionalOffset = { x: 0, y: 0 };
    switch (info.direction) {
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
      info.direction,
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

  renderWalking(
    info: CharacterMapInfo,
    ctx: CanvasRenderingContext2D,
    playerScreen: Vector2,
    mapWidth: number,
    mapHeight: number,
  ) {
    const bmp = getBitmapById(GfxType.SkinSprites, 2);
    if (!bmp) {
      return;
    }

    const startX =
      info.gender === Gender.Female ? 0 : CHARACTER_WALKING_WIDTH * 8;

    if (this.state === CharacterState.Walking) {
      console.log(`Character: ${info.name} frame: ${this.animationFrame}`);
    }

    const sourceX =
      startX +
      ([Direction.Up, Direction.Left].includes(info.direction)
        ? CHARACTER_WALKING_WIDTH * WALK_ANIMATION_FRAMES
        : 0) +
      CHARACTER_WALKING_WIDTH * this.animationFrame;
    const sourceY = info.skin * CHARACTER_WALKING_HEIGHT;
    const prevCoords = getPrevCoords(
      bigCoordsToCoords(info.coords),
      info.direction,
      mapWidth,
      mapHeight,
    );
    const screenCoords = isoToScreen(prevCoords);

    const additionalOffset = { x: 0, y: 0 };
    if (info.gender === Gender.Female) {
      switch (info.direction) {
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
      switch (info.direction) {
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
      info.direction,
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
