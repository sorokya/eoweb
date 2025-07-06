import { Direction, Emote, ItemSubtype, SitState } from 'eolib';
import { type Client, GameState } from './client';
import { ATTACK_TICKS, FACE_TICKS, SIT_TICKS, WALK_TICKS } from './consts';
import { EOResourceID } from './edf';
import { getLatestDirectionHeld, Input, isInputHeld } from './input';
import { CharacterAttackAnimation } from './render/character-attack';
import { CharacterRangedAttackAnimation } from './render/character-attack-ranged';
import { CharacterWalkAnimation } from './render/character-walk';
import { playSfxById, SfxId } from './sfx';
import { bigCoordsToCoords } from './utils/big-coords-to-coords';
import { getNextCoords } from './utils/get-next-coords';

export function inputToDirection(input: Input): Direction {
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
  lastDirectionHeld: Direction | null = null;
  directionExpireTicks = 2;

  freeze = false;

  constructor(client: Client) {
    this.client = client;
  }

  tick() {
    this.faceTicks = Math.max(this.faceTicks - 1, 0);
    this.walkTicks = Math.max(this.walkTicks - 1, 0);
    this.sitTicks = Math.max(this.sitTicks - 1, 0);
    this.attackTicks = Math.max(this.attackTicks - 1, -1);
    this.directionExpireTicks = Math.max(this.directionExpireTicks - 1, 0);

    if (
      this.freeze ||
      this.client.state !== GameState.InGame ||
      this.client.typing
    ) {
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
    const attacking =
      animation instanceof CharacterAttackAnimation ||
      animation instanceof CharacterRangedAttackAnimation;

    if (attacking && animation.ticks > 2) {
      return;
    }

    if (!this.directionExpireTicks && this.lastDirectionHeld !== null) {
      this.lastDirectionHeld = null;
    }

    if (
      this.attackTicks <= 0 &&
      isInputHeld(Input.Attack) &&
      character.sitState === SitState.Stand
    ) {
      if (!walking) {
        const metadata = this.client.getWeaponMetadata(
          character.equipment.weapon,
        );

        if (
          metadata.ranged &&
          metadata.sfx[0] !== SfxId.Gun &&
          metadata.sfx[0] !== SfxId.Harp1 &&
          metadata.sfx[0] !== SfxId.Guitar1
        ) {
          const shield = this.client.equipment.shield;
          const record = this.client.getEifRecordById(shield);
          if (!record || record.subtype !== ItemSubtype.Arrows) {
            playSfxById(SfxId.NoArrows);
            this.client.setStatusLabel(
              EOResourceID.STATUS_LABEL_TYPE_WARNING,
              this.client.getResourceString(
                EOResourceID.STATUS_LABEL_YOU_HAVE_NO_ARROWS,
              ),
            );
            this.attackTicks = ATTACK_TICKS;
            return;
          }
        }

        this.client.characterAnimations.set(
          character.playerId,
          metadata.ranged
            ? new CharacterRangedAttackAnimation(character.direction)
            : new CharacterAttackAnimation(character.direction),
        );
        if (this.lastDirectionHeld !== null) {
          character.direction = this.lastDirectionHeld;
        }
        this.client.attack(character.direction, getTimestamp());
        this.attackTicks = ATTACK_TICKS;
        return;
      }
    }

    if (attacking && animation.ticks > 1) {
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

      if (this.client.warpQueued) {
        return;
      }

      if (
        !this.walkTicks ||
        (walking &&
          directionHeld !== character.direction &&
          (animation as CharacterWalkAnimation).isOnLastFrame())
      ) {
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

        if (this.client.chestAt(to)) {
          this.client.openChest(to);
          this.walkTicks = WALK_TICKS;
          return;
        }

        if (this.client.isFacingChairAt(to) && !this.client.occupied(to)) {
          this.client.sitChair(to);
          this.walkTicks = WALK_TICKS;
          return;
        }

        if (!this.client.canWalk(to)) {
          this.walkTicks = WALK_TICKS;
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

    const emote = this.client.characterEmotes.get(this.client.playerId);
    if (emote) {
      return;
    }

    if (isInputHeld(Input.EmotePlayful)) {
      this.client.emote(Emote.Playful);
      return;
    }

    if (isInputHeld(Input.EmoteEmbarassed)) {
      this.client.emote(Emote.Embarrassed);
      return;
    }

    if (isInputHeld(Input.EmoteHappy)) {
      this.client.emote(Emote.Happy);
      return;
    }

    if (isInputHeld(Input.EmoteDepressed)) {
      this.client.emote(Emote.Depressed);
      return;
    }

    if (isInputHeld(Input.EmoteSad)) {
      this.client.emote(Emote.Sad);
      return;
    }

    if (isInputHeld(Input.EmoteAngry)) {
      this.client.emote(Emote.Angry);
      return;
    }

    if (isInputHeld(Input.EmoteConfused)) {
      this.client.emote(Emote.Confused);
      return;
    }

    if (isInputHeld(Input.EmoteSurprised)) {
      this.client.emote(Emote.Surprised);
      return;
    }

    if (isInputHeld(Input.EmoteHearts)) {
      this.client.emote(Emote.Hearts);
      return;
    }

    if (isInputHeld(Input.EmoteMoon)) {
      this.client.emote(Emote.Moon);
      return;
    }

    if (isInputHeld(Input.EmoteSuicidal)) {
      this.client.emote(Emote.Suicidal);
      return;
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
