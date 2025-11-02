import { Direction, Emote, ItemSubtype, SitState } from 'eolib';
import { type Client, GameState } from './client';
import {
  ATTACK_TICKS,
  FACE_TICKS,
  HOTBAR_COOLDOWN_TICKS,
  SIT_TICKS,
  WALK_TICKS as WALK_ANIMATION_TICKS,
} from './consts';
import { EOResourceID } from './edf';
import {
  clearUnheldInput,
  getLastHeldDirection,
  Input,
  isInputHeld,
  isOrWasInputHeld,
  wasInputHeldLastTick,
} from './input';
import { CharacterAttackAnimation } from './render/character-attack';
import { CharacterRangedAttackAnimation } from './render/character-attack-ranged';
import { CharacterWalkAnimation } from './render/character-walk';
import { playSfxById, SfxId } from './sfx';
import { bigCoordsToCoords } from './utils/big-coords-to-coords';
import { getNextCoords } from './utils/get-next-coords';

function inputToDirection(input: Input): Direction | null {
  switch (input) {
    case Input.Up:
      return Direction.Up;
    case Input.Down:
      return Direction.Down;
    case Input.Left:
      return Direction.Left;
    case Input.Right:
      return Direction.Right;
    default:
      return null;
  }
}

const WALK_TICKS = WALK_ANIMATION_TICKS - 1;

export class MovementController {
  private client: Client;
  walkTicks = WALK_TICKS;
  faceTicks = FACE_TICKS;
  sitTicks = SIT_TICKS;
  attackTicks = ATTACK_TICKS;
  hotbarTicks = HOTBAR_COOLDOWN_TICKS;
  minimapTicks = WALK_TICKS;
  freeze = false;

  constructor(client: Client) {
    this.client = client;
  }

  tick() {
    this.faceTicks = Math.max(this.faceTicks - 1, 0);
    this.walkTicks = Math.max(this.walkTicks - 1, 0);
    this.sitTicks = Math.max(this.sitTicks - 1, 0);
    this.attackTicks = Math.max(this.attackTicks - 1, -1);
    this.hotbarTicks = Math.max(this.hotbarTicks - 1, 0);
    this.minimapTicks = Math.max(this.minimapTicks - 1, 0);

    if (
      this.freeze ||
      this.client.state !== GameState.InGame ||
      this.client.typing
    ) {
      clearUnheldInput();
      return;
    }

    const character = this.client.getPlayerCharacter();
    if (!character) {
      return;
    }

    if (isOrWasInputHeld(Input.Hotbar1) && this.hotbarTicks === 0) {
      this.client.useHotbarSlot(0);
      this.hotbarTicks = HOTBAR_COOLDOWN_TICKS;
    } else if (isOrWasInputHeld(Input.Hotbar2) && this.hotbarTicks === 0) {
      this.client.useHotbarSlot(1);
      this.hotbarTicks = HOTBAR_COOLDOWN_TICKS;
    } else if (isOrWasInputHeld(Input.Hotbar3) && this.hotbarTicks === 0) {
      this.client.useHotbarSlot(2);
      this.hotbarTicks = HOTBAR_COOLDOWN_TICKS;
    } else if (isOrWasInputHeld(Input.Hotbar4) && this.hotbarTicks === 0) {
      this.client.useHotbarSlot(3);
      this.hotbarTicks = HOTBAR_COOLDOWN_TICKS;
    } else if (isOrWasInputHeld(Input.Hotbar5) && this.hotbarTicks === 0) {
      this.client.useHotbarSlot(4);
      this.hotbarTicks = HOTBAR_COOLDOWN_TICKS;
    }

    if (isOrWasInputHeld(Input.Tab) && this.minimapTicks === 0) {
      playSfxById(SfxId.ButtonClick);
      this.client.toggleMinimap();
      this.minimapTicks = WALK_TICKS;
    }

    const animation = this.client.characterAnimations.get(character.playerId);
    const lastHeldDirection = getLastHeldDirection();
    const attackHeld = wasInputHeldLastTick(Input.Attack);
    const sitStandHeld = wasInputHeldLastTick(Input.SitStand);
    clearUnheldInput();

    if (lastHeldDirection !== null && this.client.autoWalkPath.length) {
      this.client.autoWalkPath = [];
    }

    if (animation?.ticks) {
      return;
    }

    const lastDirectionHeld =
      lastHeldDirection !== null ? inputToDirection(lastHeldDirection) : null;

    if (character.sitState === SitState.Stand && lastDirectionHeld !== null) {
      if (
        !this.faceTicks &&
        character.direction !== lastDirectionHeld &&
        !animation
      ) {
        character.direction = lastDirectionHeld;
        this.client.face(lastDirectionHeld);
        this.faceTicks = FACE_TICKS;
        this.walkTicks = WALK_TICKS - 1;
        this.attackTicks = ATTACK_TICKS - 3;
        return;
      }
    }

    if (
      this.attackTicks <= 0 &&
      attackHeld &&
      character.sitState === SitState.Stand
    ) {
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
          this.faceTicks = FACE_TICKS;
          this.walkTicks = WALK_TICKS;
          return;
        }
      }

      this.client.characterAnimations.set(
        character.playerId,
        metadata.ranged
          ? new CharacterRangedAttackAnimation()
          : new CharacterAttackAnimation(),
      );

      this.client.attack(character.direction, getTimestamp());
      this.attackTicks = ATTACK_TICKS;
      this.faceTicks = FACE_TICKS;
      this.walkTicks = WALK_TICKS - 1;
      return;
    }

    if (character.sitState === SitState.Stand && lastDirectionHeld !== null) {
      if (
        !this.faceTicks &&
        character.direction !== lastDirectionHeld &&
        !animation &&
        !isInputHeld(Input.Attack)
      ) {
        character.direction = lastDirectionHeld;
        this.client.face(lastDirectionHeld);
        this.faceTicks = FACE_TICKS;
        this.walkTicks = WALK_TICKS - 1;
        return;
      }

      if (this.client.warpQueued) {
        return;
      }

      if (
        !this.walkTicks &&
        (character.direction === lastDirectionHeld ||
          animation instanceof CharacterWalkAnimation)
      ) {
        const from = bigCoordsToCoords(character.coords);
        const to = getNextCoords(
          from,
          lastDirectionHeld,
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

        if (this.client.lockerAt(to)) {
          this.client.openLocker(to);
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
          new CharacterWalkAnimation(from, to, lastDirectionHeld),
        );
        character.direction = lastDirectionHeld;
        character.coords.x = to.x;
        character.coords.y = to.y;
        this.client.walk(lastDirectionHeld, to, getTimestamp());
        this.walkTicks = WALK_TICKS;
        this.faceTicks = FACE_TICKS;
        this.sitTicks = SIT_TICKS;
        return;
      }
    }

    if (!this.sitTicks && sitStandHeld) {
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

export function getTimestamp(): number {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  const millisecond = now.getMilliseconds();
  const ms = Math.floor(millisecond);

  return hour * 360000 + minute * 6000 + second * 100 + Math.floor(ms / 10);
}
