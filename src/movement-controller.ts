import { Direction, SitState } from 'eolib';
import { Input, getLatestDirectionHeld, isInputHeld } from './input';
import { ATTACK_TICKS, FACE_TICKS, SIT_TICKS, WALK_TICKS } from './consts';
import { getNextCoords } from './utils/get-next-coords';
import { bigCoordsToCoords } from './utils/big-coords-to-coords';
import { GameState, type Client } from './client';
import { CharacterAttackAnimation, CharacterWalkAnimation } from './character';

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
  private client: Client;
  walkTicks = WALK_TICKS;
  faceTicks = FACE_TICKS;
  sitTicks = SIT_TICKS;
  attackTicks = ATTACK_TICKS;

  freeze = false;

  constructor(client: Client) {
    this.client = client;
  }

  tick() {
    this.faceTicks = Math.max(this.faceTicks - 1, 0);
    this.walkTicks = Math.max(this.walkTicks - 1, 0);
    this.sitTicks = Math.max(this.sitTicks - 1, 0);
    this.attackTicks = Math.max(this.attackTicks - 1, 0);

    if (this.freeze || this.client.state !== GameState.InGame) {
      return;
    }

    const character = this.client.getPlayerCharacter();
    if (!character) {
      return;
    }

    const latestInput = getLatestDirectionHeld();
    const directionHeld =
      latestInput !== null ? inputToDirection(latestInput) : null;

    const animation = this.client.characterAnimations.get(character.playerId);
    const walking = animation instanceof CharacterWalkAnimation;
    const attacking = animation instanceof CharacterAttackAnimation;

    if (attacking) {
      return;
    }

    if (
      !this.attackTicks &&
      isInputHeld(Input.Attack) &&
      character.sitState === SitState.Stand
    ) {
      if (walking) {
        return;
      }
      this.client.characterAnimations.set(
        character.playerId,
        new CharacterAttackAnimation(character.direction),
      );
      this.client.attack(character.direction, getTimestamp());
      this.attackTicks = ATTACK_TICKS;
      return;
    }

    if (character.sitState === SitState.Stand && directionHeld !== null) {
      if (
        !walking &&
        !this.faceTicks &&
        character.direction !== directionHeld
      ) {
        character.direction = directionHeld;
        this.client.face(directionHeld);
        this.faceTicks = FACE_TICKS;
        return;
      }

      if (!this.walkTicks) {
        const from = bigCoordsToCoords(character.coords);
        const to = getNextCoords(
          from,
          directionHeld,
          this.client.map.width,
          this.client.map.height,
        );

        const door = this.client.getDoor(to);
        if (door && !door.open) {
          this.client.openDoor(to);
          this.walkTicks = WALK_TICKS;
          return;
        }

        if (!this.client.canWalk(to)) {
          return;
        }

        this.client.characterAnimations.set(
          character.playerId,
          new CharacterWalkAnimation(from, to, directionHeld),
        );
        character.direction = directionHeld;
        character.coords.x = to.x;
        character.coords.y = to.y;
        this.client.walk(directionHeld, to, getTimestamp());
        this.walkTicks = WALK_TICKS;
        this.faceTicks = FACE_TICKS;
        this.sitTicks = SIT_TICKS;
        return;
      }
    }

    if (!this.sitTicks && isInputHeld(Input.SitStand)) {
      if (character.sitState === SitState.Stand) {
        this.client.sit();
      } else {
        this.client.stand();
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
