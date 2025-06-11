import { Direction } from 'eolib';
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH } from './consts';
import { Input, getLatestDirectionHeld, isInputHeld } from './input';
import { type CharacterRenderer, CharacterState } from './rendering/character';

const WALK_TICKS = 4;
const FACE_TICKS = 1;
const SIT_TICKS = 4;
const WALK_WIDTH_FACTOR = HALF_TILE_WIDTH / 4;
const WALK_HEIGHT_FACTOR = HALF_TILE_HEIGHT / 4;

function inputToDirection(input: Input): Direction {
  switch (input) {
    case Input.Up:
      return Direction.Up;
    case Input.Down:
      return Direction.Down;
    case Input.Left:
      return Direction.Left;
    default:
      return Direction.Right;
  }
}

export class MovementController {
  character: CharacterRenderer;
  mapWidth = 0;
  mapHeight = 0;
  walkTicks = WALK_TICKS;
  faceTicks = FACE_TICKS;
  sitTicks = SIT_TICKS;

  constructor(character: CharacterRenderer) {
    this.character = character;
  }

  setMapDimensions(width: number, height: number) {
    this.mapWidth = width;
    this.mapHeight = height;
  }

  tick() {
    this.faceTicks = Math.max(this.faceTicks - 1, 0);

    const latestInput = getLatestDirectionHeld();
    const directionHeld =
      latestInput !== null ? inputToDirection(latestInput) : null;

    if (
      this.character.state === CharacterState.Standing &&
      this.faceTicks === 0
    ) {
      if (
        directionHeld !== null &&
        this.character.mapInfo.direction !== directionHeld
      ) {
        this.character.mapInfo.direction = directionHeld;
        this.faceTicks = FACE_TICKS;
        return;
      }
      if (
        directionHeld !== null &&
        this.character.mapInfo.direction === directionHeld
      ) {
        this.character.setState(CharacterState.Walking);
        this.walkTicks = WALK_TICKS;
        this.faceTicks = FACE_TICKS;
        this.sitTicks = SIT_TICKS;
        return;
      }
    }

    if (this.character.state === CharacterState.Walking) {
      const walkFrame = Math.abs(this.walkTicks - WALK_TICKS) + 1;

      const offset = {
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
      }[this.character.mapInfo.direction];

      this.character.walkOffset = offset;
      this.walkTicks = Math.max(this.walkTicks - 1, 0);

      if (this.walkTicks === 0) {
        const pos = this.character.mapInfo.coords;
        switch (this.character.mapInfo.direction) {
          case Direction.Up:
            pos.y -= 1;
            break;
          case Direction.Down:
            pos.y += 1;
            break;
          case Direction.Left:
            pos.x -= 1;
            break;
          case Direction.Right:
            pos.x += 1;
            break;
        }

        // Clamp within bounds
        pos.x = Math.min(this.mapWidth, Math.max(0, pos.x));
        pos.y = Math.min(this.mapHeight, Math.max(0, pos.y));

        this.character.walkOffset = { x: 0, y: 0 };
        this.walkTicks = WALK_TICKS;
        this.sitTicks = SIT_TICKS;

        if (
          directionHeld !== null &&
          this.character.mapInfo.direction !== directionHeld
        ) {
          this.character.mapInfo.direction = directionHeld;
        }

        // Decide whether to walk again or stand
        const heldNow = isInputHeld(latestInput ?? -1);
        if (!heldNow) {
          this.character.setState(CharacterState.Standing);
        }
      }

      return;
    }

    this.sitTicks = Math.max(this.sitTicks - 1, 0);
    if (this.sitTicks === 0 && isInputHeld(Input.SitStand)) {
      if (this.character.state === CharacterState.Standing) {
        this.character.setState(CharacterState.SitGround);
      } else {
        this.character.setState(CharacterState.Standing);
      }
      this.sitTicks = SIT_TICKS;
    }
  }
}
