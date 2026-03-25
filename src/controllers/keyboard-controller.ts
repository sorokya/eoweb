import { Direction, Emote, ItemSubtype, MapTileSpec, SitState } from 'eolib';
import type { Client } from '../client';
import {
  ATTACK_TICKS,
  FACE_TICKS,
  HOTBAR_COOLDOWN_TICKS,
  SIT_TICKS,
  WALK_TICKS as WALK_ANIMATION_TICKS,
} from '../consts';
import { EOResourceID } from '../edf';
import {
  clearUnheldInput,
  getLastHeldDirection,
  Input,
  isInputHeld,
  isOrWasInputHeld,
  wasInputHeldLastTick,
} from '../input';
import { CharacterAttackAnimation } from '../render/character-attack';
import { CharacterRangedAttackAnimation } from '../render/character-attack-ranged';
import { CharacterWalkAnimation } from '../render/character-walk';
import { playSfxById, SfxId } from '../sfx';
import { GameState } from '../types';
import { bigCoordsToCoords } from '../utils/big-coords-to-coords';
import { getNextCoords } from '../utils/get-next-coords';
import { getTimestamp } from './movement-controller';

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

export class KeyboardController {
  private client: Client;
  private walkTicks = WALK_TICKS;
  private faceTicks = FACE_TICKS;
  private sitTicks = SIT_TICKS;
  private attackTicks = ATTACK_TICKS;
  private hotbarTicks = HOTBAR_COOLDOWN_TICKS;
  private minimapTicks = WALK_TICKS;
  private refreshTicks = WALK_TICKS;
  private frozen = false;

  constructor(client: Client) {
    this.client = client;
  }

  freeze() {
    this.frozen = true;
  }

  unfreeze() {
    this.frozen = false;
  }

  tick() {
    this.faceTicks = Math.max(this.faceTicks - 1, 0);
    this.walkTicks = Math.max(this.walkTicks - 1, 0);
    this.sitTicks = Math.max(this.sitTicks - 1, 0);
    this.attackTicks = Math.max(this.attackTicks - 1, -1);
    this.hotbarTicks = Math.max(this.hotbarTicks - 1, 0);
    this.minimapTicks = Math.max(this.minimapTicks - 1, 0);
    this.refreshTicks = Math.max(this.refreshTicks - 1, 0);

    if (
      this.frozen ||
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
      this.client.spellController.useHotbarSlot(0);
      this.hotbarTicks = HOTBAR_COOLDOWN_TICKS;
    } else if (isOrWasInputHeld(Input.Hotbar2) && this.hotbarTicks === 0) {
      this.client.spellController.useHotbarSlot(1);
      this.hotbarTicks = HOTBAR_COOLDOWN_TICKS;
    } else if (isOrWasInputHeld(Input.Hotbar3) && this.hotbarTicks === 0) {
      this.client.spellController.useHotbarSlot(2);
      this.hotbarTicks = HOTBAR_COOLDOWN_TICKS;
    } else if (isOrWasInputHeld(Input.Hotbar4) && this.hotbarTicks === 0) {
      this.client.spellController.useHotbarSlot(3);
      this.hotbarTicks = HOTBAR_COOLDOWN_TICKS;
    } else if (isOrWasInputHeld(Input.Hotbar5) && this.hotbarTicks === 0) {
      this.client.spellController.useHotbarSlot(4);
      this.hotbarTicks = HOTBAR_COOLDOWN_TICKS;
    }

    if (isOrWasInputHeld(Input.Tab) && this.minimapTicks === 0) {
      playSfxById(SfxId.ButtonClick);
      this.client.toggleMinimap();
      this.minimapTicks = WALK_TICKS;
    }

    if (isOrWasInputHeld(Input.Refresh) && this.refreshTicks === 0) {
      this.client.refresh();
      this.refreshTicks = WALK_TICKS;
    }

    const animation = this.client.animationController.characterAnimations.get(
      character.playerId,
    );
    const lastHeldDirection = getLastHeldDirection();
    const attackHeld = wasInputHeldLastTick(Input.Attack);
    const sitStandHeld = wasInputHeldLastTick(Input.SitStand);
    clearUnheldInput();

    if (
      lastHeldDirection !== null &&
      this.client.movementController.autoWalkPath.length
    ) {
      this.client.movementController.autoWalkPath = [];
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
        this.client.movementController.face(lastDirectionHeld);
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

      this.client.animationController.characterAnimations.set(
        character.playerId,
        metadata.ranged
          ? new CharacterRangedAttackAnimation()
          : new CharacterAttackAnimation(),
      );

      this.client.movementController.attack(
        character.direction,
        getTimestamp(),
      );
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
        this.client.movementController.face(lastDirectionHeld);
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
          this.client.map!.width,
          this.client.map!.height,
        );

        const door = this.client.mapController.getDoor(to);
        if (door && !door.open) {
          this.client.mapController.openDoor(to);
          this.walkTicks = WALK_TICKS;
          return;
        }

        if (this.client.mapController.chestAt(to)) {
          this.client.chestController.openChest(to);
          this.walkTicks = WALK_TICKS;
          return;
        }

        if (this.client.mapController.lockerAt(to)) {
          this.client.mapController.openLocker(to);
          this.walkTicks = WALK_TICKS;
          return;
        }

        const boardSpec = this.client.mapController.boardAt(to);
        if (boardSpec !== undefined) {
          this.client.boardController.openBoard(boardSpec - MapTileSpec.Board1);
          this.walkTicks = WALK_TICKS;
          return;
        }

        if (
          this.client.mapController.isFacingChairAt(to) &&
          !this.client.mapController.occupied(to)
        ) {
          this.client.mapController.sitChair(to);
          this.walkTicks = WALK_TICKS;
          return;
        }

        if (!this.client.mapController.canWalk(to)) {
          this.walkTicks = WALK_TICKS;
          return;
        }

        this.client.animationController.characterAnimations.set(
          character.playerId,
          new CharacterWalkAnimation(from, to, lastDirectionHeld),
        );
        character.direction = lastDirectionHeld;
        character.coords.x = to.x;
        character.coords.y = to.y;
        this.client.movementController.walk(
          lastDirectionHeld,
          to,
          getTimestamp(),
        );
        this.walkTicks = WALK_TICKS;
        this.faceTicks = FACE_TICKS;
        this.sitTicks = SIT_TICKS;
        return;
      }
    }

    if (!this.sitTicks && sitStandHeld) {
      if (character.sitState === SitState.Stand) {
        this.client.movementController.sit();
      } else {
        this.client.movementController.stand();
      }
      this.sitTicks = SIT_TICKS;
    }

    const emote = this.client.animationController.characterEmotes.get(
      this.client.playerId,
    );
    if (emote) {
      return;
    }

    if (isInputHeld(Input.EmotePlayful)) {
      this.client.socialController.emote(Emote.Playful);
      return;
    }

    if (isInputHeld(Input.EmoteEmbarassed)) {
      this.client.socialController.emote(Emote.Embarrassed);
      return;
    }

    if (isInputHeld(Input.EmoteHappy)) {
      this.client.socialController.emote(Emote.Happy);
      return;
    }

    if (isInputHeld(Input.EmoteDepressed)) {
      this.client.socialController.emote(Emote.Depressed);
      return;
    }

    if (isInputHeld(Input.EmoteSad)) {
      this.client.socialController.emote(Emote.Sad);
      return;
    }

    if (isInputHeld(Input.EmoteAngry)) {
      this.client.socialController.emote(Emote.Angry);
      return;
    }

    if (isInputHeld(Input.EmoteConfused)) {
      this.client.socialController.emote(Emote.Confused);
      return;
    }

    if (isInputHeld(Input.EmoteSurprised)) {
      this.client.socialController.emote(Emote.Surprised);
      return;
    }

    if (isInputHeld(Input.EmoteHearts)) {
      this.client.socialController.emote(Emote.Hearts);
      return;
    }

    if (isInputHeld(Input.EmoteMoon)) {
      this.client.socialController.emote(Emote.Moon);
      return;
    }

    if (isInputHeld(Input.EmoteSuicidal)) {
      this.client.socialController.emote(Emote.Suicidal);
      return;
    }
  }
}
