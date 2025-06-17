import { type Coords, Direction } from 'eolib';
import { Input, getLatestDirectionHeld, isInputHeld } from './input';
import { type CharacterRenderer, CharacterState } from './rendering/character';
import { FACE_TICKS, SIT_TICKS, WALK_TICKS } from './consts';
import mitt, { type Emitter } from 'mitt';
import { getNextCoords } from './utils/get-next-coords';
import { coordsToBigCoords } from './utils/coords-to-big-coords';
import { bigCoordsToCoords } from './utils/big-coords-to-coords';

type MovementEvents = {
  face: Direction;
  walk: { direction: Direction; coords: Coords; timestamp: number };
  sit: undefined;
  stand: undefined;
};

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
  private emitter: Emitter<MovementEvents>;
  character: CharacterRenderer;
  mapWidth = 0;
  mapHeight = 0;
  walkTicks = WALK_TICKS;
  faceTicks = FACE_TICKS;
  sitTicks = SIT_TICKS;
  freeze = false;

  constructor(character: CharacterRenderer) {
    this.character = character;
    this.emitter = mitt<MovementEvents>();
  }

  on<Event extends keyof MovementEvents>(
    event: Event,
    handler: (data: MovementEvents[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }

  setMapDimensions(width: number, height: number) {
    this.mapWidth = width;
    this.mapHeight = height;
  }

  tick() {
    this.faceTicks = Math.max(this.faceTicks - 1, 0);
    this.walkTicks = Math.max(this.walkTicks - 1, 0);

    if (this.freeze) {
      return;
    }

    const latestInput = getLatestDirectionHeld();
    const directionHeld =
      latestInput !== null ? inputToDirection(latestInput) : null;

    if (this.character.state === CharacterState.Standing) {
      if (
        directionHeld !== null &&
        this.faceTicks === 0 &&
        this.character.mapInfo.direction !== directionHeld
      ) {
        this.character.mapInfo.direction = directionHeld;
        this.faceTicks = FACE_TICKS;
        this.emitter.emit('face', directionHeld);
        return;
      }

      if (
        directionHeld !== null &&
        this.character.mapInfo.direction === directionHeld &&
        this.walkTicks === 0
      ) {
        const next = getNextCoords(
          bigCoordsToCoords(this.character.mapInfo.coords),
          directionHeld,
          this.mapWidth,
          this.mapHeight,
        );

        // Optimistically update the player's position locally
        this.character.mapInfo.coords = coordsToBigCoords(next);
        this.character.mapInfo.direction = directionHeld;

        this.character.setState(CharacterState.Walking);
        this.walkTicks = WALK_TICKS;
        this.faceTicks = FACE_TICKS;
        this.sitTicks = SIT_TICKS;

        this.emitter.emit('walk', {
          direction: directionHeld,
          timestamp: getTimestamp(),
          coords: next,
        });
        return;
      }
    }

    this.sitTicks = Math.max(this.sitTicks - 1, 0);
    if (this.sitTicks === 0 && isInputHeld(Input.SitStand)) {
      if (this.character.state === CharacterState.Standing) {
        this.emitter.emit('sit');
      } else {
        this.emitter.emit('stand');
      }
      this.sitTicks = SIT_TICKS;
    }
  }
}

function getTimestamp(): number {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  const millisecond = now.getMilliseconds();
  const ms = Math.floor(millisecond);

  return hour * 360000 + minute * 6000 + second * 100 + Math.floor(ms / 10);
}