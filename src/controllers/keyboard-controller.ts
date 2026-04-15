import { Direction, Emote, ItemSubtype, MapTileSpec, SitState } from 'eolib';
import type { Client } from '@/client';
import {
  ATTACK_TICKS,
  FACE_TICKS,
  HOTBAR_COOLDOWN_TICKS,
  SIT_TICKS,
  WALK_TICKS as WALK_ANIMATION_TICKS,
} from '@/consts';
import { EOResourceID } from '@/edf';
import { GameState } from '@/game-state';
import {
  CharacterAttackAnimation,
  CharacterRangedAttackAnimation,
  CharacterWalkAnimation,
} from '@/render';
import { playSfxById, SfxId } from '@/sfx';
import { bigCoordsToCoords, getNextCoords } from '@/utils';
import { getTimestamp } from './movement-controller';

enum Input {
  Up = 0,
  Down = 1,
  Left = 2,
  Right = 3,
  SitStand = 4,
  Attack = 5,
  EmoteHappy = 6,
  EmoteDepressed = 7,
  EmoteSad = 8,
  EmoteAngry = 9,
  EmoteConfused = 10,
  EmoteSurprised = 11,
  EmoteHearts = 12,
  EmoteMoon = 13,
  EmoteSuicidal = 14,
  EmoteEmbarassed = 15,
  EmotePlayful = 16,
  Hotbar1 = 17,
  Hotbar2 = 18,
  Hotbar3 = 19,
  Hotbar4 = 20,
  Hotbar5 = 21,
  Tab = 22,
  Refresh = 23,
  Hotbar6 = 24,
  ViewCharacter = 25,
  ViewInventory = 26,
  ViewSpells = 27,
  Unknown = -1,
}

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
//const DRAG_THRESHOLD = 30;

export class KeyboardController {
  private client: Client;
  private walkTicks = WALK_TICKS;
  private faceTicks = FACE_TICKS;
  private sitTicks = SIT_TICKS;
  private attackTicks = ATTACK_TICKS;
  private hotbarTicks = HOTBAR_COOLDOWN_TICKS;
  private minimapTicks = WALK_TICKS;
  private refreshTicks = WALK_TICKS;
  private dialogOpenTicks = WALK_TICKS;
  private frozen = false;

  private held: boolean[] = [];
  private lastInputHeld: Input[] = [];

  constructor(client: Client) {
    this.client = client;
    this.setupListeners();
  }

  private setupListeners() {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && ['=', '+', '-', '_'].includes(e.key)) {
        e.preventDefault();
        if (e.key === '=' || e.key === '+') {
          this.client.viewportController.zoomIn();
        } else {
          this.client.viewportController.zoomOut();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyP') {
        e.preventDefault();
        this.client.emit('toggleCommandPalette', undefined);
        return;
      }

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.updateInputHeld(Input.Up, true);
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.updateInputHeld(Input.Left, true);
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.updateInputHeld(Input.Down, true);
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.updateInputHeld(Input.Right, true);
          break;
        case 'KeyX':
          this.updateInputHeld(Input.SitStand, true);
          break;
        case 'Space':
        case 'ControlLeft':
        case 'ControlRight':
          this.updateInputHeld(Input.Attack, true);
          break;
        case 'NumpadDecimal':
          this.updateInputHeld(Input.EmoteEmbarassed, true);
          break;
        case 'Numpad0':
          this.updateInputHeld(Input.EmotePlayful, true);
          break;
        case 'Numpad1':
          this.updateInputHeld(Input.EmoteHappy, true);
          break;
        case 'Numpad2':
          this.updateInputHeld(Input.EmoteDepressed, true);
          break;
        case 'Numpad3':
          this.updateInputHeld(Input.EmoteSad, true);
          break;
        case 'Numpad4':
          this.updateInputHeld(Input.EmoteAngry, true);
          break;
        case 'Numpad5':
          this.updateInputHeld(Input.EmoteConfused, true);
          break;
        case 'Numpad6':
          this.updateInputHeld(Input.EmoteSurprised, true);
          break;
        case 'Numpad7':
          this.updateInputHeld(Input.EmoteHearts, true);
          break;
        case 'Numpad8':
          this.updateInputHeld(Input.EmoteMoon, true);
          break;
        case 'Numpad9':
          this.updateInputHeld(Input.EmoteSuicidal, true);
          break;
        case 'Digit1':
          this.updateInputHeld(Input.Hotbar1, true);
          break;
        case 'Digit2':
          this.updateInputHeld(Input.Hotbar2, true);
          break;
        case 'Digit3':
          this.updateInputHeld(Input.Hotbar3, true);
          break;
        case 'Digit4':
          this.updateInputHeld(Input.Hotbar4, true);
          break;
        case 'Digit5':
          this.updateInputHeld(Input.Hotbar5, true);
          break;
        case 'Digit6':
          this.updateInputHeld(Input.Hotbar6, true);
          break;
        case 'Tab':
          this.updateInputHeld(Input.Tab, true);
          // TODO: Fix tab capturing later
          //if (!this.client.typing) e.preventDefault();
          break;
        case 'KeyR':
          this.updateInputHeld(Input.Refresh, true);
          break;
        case 'KeyC':
          this.updateInputHeld(Input.ViewCharacter, true);
          break;
        case 'KeyE':
          this.updateInputHeld(Input.ViewInventory, true);
          break;
        case 'KeyP':
          this.updateInputHeld(Input.ViewSpells, true);
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.updateInputHeld(Input.Up, false);
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.updateInputHeld(Input.Left, false);
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.updateInputHeld(Input.Down, false);
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.updateInputHeld(Input.Right, false);
          break;
        case 'KeyX':
          this.updateInputHeld(Input.SitStand, false);
          break;
        case 'Space':
        case 'ControlLeft':
        case 'ControlRight':
          this.updateInputHeld(Input.Attack, false);
          break;
        case 'NumpadDecimal':
          this.updateInputHeld(Input.EmoteEmbarassed, false);
          break;
        case 'Numpad0':
          this.updateInputHeld(Input.EmotePlayful, false);
          break;
        case 'Numpad1':
          this.updateInputHeld(Input.EmoteHappy, false);
          break;
        case 'Numpad2':
          this.updateInputHeld(Input.EmoteDepressed, false);
          break;
        case 'Numpad3':
          this.updateInputHeld(Input.EmoteSad, false);
          break;
        case 'Numpad4':
          this.updateInputHeld(Input.EmoteAngry, false);
          break;
        case 'Numpad5':
          this.updateInputHeld(Input.EmoteConfused, false);
          break;
        case 'Numpad6':
          this.updateInputHeld(Input.EmoteSurprised, false);
          break;
        case 'Numpad7':
          this.updateInputHeld(Input.EmoteHearts, false);
          break;
        case 'Numpad8':
          this.updateInputHeld(Input.EmoteMoon, false);
          break;
        case 'Numpad9':
          this.updateInputHeld(Input.EmoteSuicidal, false);
          break;
        case 'Digit1':
          this.updateInputHeld(Input.Hotbar1, false);
          break;
        case 'Digit2':
          this.updateInputHeld(Input.Hotbar2, false);
          break;
        case 'Digit3':
          this.updateInputHeld(Input.Hotbar3, false);
          break;
        case 'Digit4':
          this.updateInputHeld(Input.Hotbar4, false);
          break;
        case 'Digit5':
          this.updateInputHeld(Input.Hotbar5, false);
          break;
        case 'Digit6':
          this.updateInputHeld(Input.Hotbar6, false);
          break;
        case 'Tab':
          this.updateInputHeld(Input.Tab, false);
          break;
        case 'KeyR':
          this.updateInputHeld(Input.Refresh, false);
          break;
        case 'KeyC':
          this.updateInputHeld(Input.ViewCharacter, false);
          break;
        case 'KeyE':
          this.updateInputHeld(Input.ViewInventory, false);
          break;
        case 'KeyP':
          this.updateInputHeld(Input.ViewSpells, false);
          break;
      }
    });

    window.addEventListener(
      'wheel',
      (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (e.deltaY < 0) this.client.viewportController.zoomIn();
          else if (e.deltaY > 0) this.client.viewportController.zoomOut();
        }
      },
      { passive: false },
    );
  }

  setTouchDirection(direction: Direction | null): void {
    this.updateInputHeld(Input.Up, direction === Direction.Up);
    this.updateInputHeld(Input.Down, direction === Direction.Down);
    this.updateInputHeld(Input.Left, direction === Direction.Left);
    this.updateInputHeld(Input.Right, direction === Direction.Right);
  }

  setTouchAttack(held: boolean): void {
    this.updateInputHeld(Input.Attack, held);
  }

  setTouchSitStand(held: boolean): void {
    this.updateInputHeld(Input.SitStand, held);
  }

  private updateInputHeld(input: Input, down: boolean) {
    this.held[input] = down;
    const index = this.lastInputHeld.indexOf(input);
    if (down) {
      if (index === -1) this.lastInputHeld.push(input);
    }
  }

  private isInputHeld(input: Input): boolean {
    return this.held[input] || false;
  }

  private isOrWasInputHeld(input: Input): boolean {
    return this.held[input] || this.wasInputHeldLastTick(input);
  }

  private getLastHeldDirection(): Input | null {
    const directions = this.lastInputHeld.filter((i) =>
      [Input.Up, Input.Down, Input.Left, Input.Right].includes(i),
    );
    return directions[directions.length - 1] ?? null;
  }

  private wasInputHeldLastTick(input: Input): boolean {
    return this.lastInputHeld.indexOf(input) > -1;
  }

  private clearUnheldInput() {
    for (let i = this.lastInputHeld.length - 1; i >= 0; --i) {
      if (!this.held[this.lastInputHeld[i]]) {
        this.lastInputHeld.splice(i, 1);
      }
    }
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
    this.dialogOpenTicks = Math.max(this.dialogOpenTicks - 1, 0);

    if (
      this.frozen ||
      this.client.state !== GameState.InGame ||
      this.client.typing
    ) {
      this.clearUnheldInput();
      return;
    }

    const character = this.client.getPlayerCharacter();
    if (!character) {
      return;
    }

    if (this.isOrWasInputHeld(Input.Hotbar1) && this.hotbarTicks === 0) {
      this.client.spellController.useHotbarSlot(0);
      this.hotbarTicks = HOTBAR_COOLDOWN_TICKS;
    } else if (this.isOrWasInputHeld(Input.Hotbar2) && this.hotbarTicks === 0) {
      this.client.spellController.useHotbarSlot(1);
      this.hotbarTicks = HOTBAR_COOLDOWN_TICKS;
    } else if (this.isOrWasInputHeld(Input.Hotbar3) && this.hotbarTicks === 0) {
      this.client.spellController.useHotbarSlot(2);
      this.hotbarTicks = HOTBAR_COOLDOWN_TICKS;
    } else if (this.isOrWasInputHeld(Input.Hotbar4) && this.hotbarTicks === 0) {
      this.client.spellController.useHotbarSlot(3);
      this.hotbarTicks = HOTBAR_COOLDOWN_TICKS;
    } else if (this.isOrWasInputHeld(Input.Hotbar5) && this.hotbarTicks === 0) {
      this.client.spellController.useHotbarSlot(4);
      this.hotbarTicks = HOTBAR_COOLDOWN_TICKS;
    } else if (this.isOrWasInputHeld(Input.Hotbar6) && this.hotbarTicks === 0) {
      this.client.spellController.useHotbarSlot(5);
      this.hotbarTicks = HOTBAR_COOLDOWN_TICKS;
    }

    if (this.isOrWasInputHeld(Input.Tab) && this.minimapTicks === 0) {
      playSfxById(SfxId.ButtonClick);
      this.client.toggleMinimap();
      this.minimapTicks = WALK_TICKS;
    }

    if (this.isOrWasInputHeld(Input.Refresh) && this.refreshTicks === 0) {
      this.client.refresh();
      this.refreshTicks = WALK_TICKS;
    }

    if (
      this.isOrWasInputHeld(Input.ViewCharacter) &&
      this.dialogOpenTicks === 0
    ) {
      this.client.emit('toggleDialog', { id: 'character' });
      this.dialogOpenTicks = WALK_TICKS;
    }

    if (
      this.isOrWasInputHeld(Input.ViewInventory) &&
      this.dialogOpenTicks === 0
    ) {
      this.client.emit('toggleDialog', { id: 'inventory' });
      this.dialogOpenTicks = WALK_TICKS;
    }

    if (this.isOrWasInputHeld(Input.ViewSpells) && this.dialogOpenTicks === 0) {
      this.client.emit('toggleDialog', { id: 'spells' });
      this.dialogOpenTicks = WALK_TICKS;
    }

    const animation = this.client.animationController.characterAnimations.get(
      character.playerId,
    );
    const lastHeldDirection = this.getLastHeldDirection();
    const attackHeld = this.wasInputHeldLastTick(Input.Attack);
    const sitStandHeld = this.wasInputHeldLastTick(Input.SitStand);
    this.clearUnheldInput();

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
          this.client.toastController.showWarning(
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
        !this.isInputHeld(Input.Attack)
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

    if (this.isInputHeld(Input.EmotePlayful)) {
      this.client.socialController.emote(Emote.Playful);
      return;
    }

    if (this.isInputHeld(Input.EmoteEmbarassed)) {
      this.client.socialController.emote(Emote.Embarrassed);
      return;
    }

    if (this.isInputHeld(Input.EmoteHappy)) {
      this.client.socialController.emote(Emote.Happy);
      return;
    }

    if (this.isInputHeld(Input.EmoteDepressed)) {
      this.client.socialController.emote(Emote.Depressed);
      return;
    }

    if (this.isInputHeld(Input.EmoteSad)) {
      this.client.socialController.emote(Emote.Sad);
      return;
    }

    if (this.isInputHeld(Input.EmoteAngry)) {
      this.client.socialController.emote(Emote.Angry);
      return;
    }

    if (this.isInputHeld(Input.EmoteConfused)) {
      this.client.socialController.emote(Emote.Confused);
      return;
    }

    if (this.isInputHeld(Input.EmoteSurprised)) {
      this.client.socialController.emote(Emote.Surprised);
      return;
    }

    if (this.isInputHeld(Input.EmoteHearts)) {
      this.client.socialController.emote(Emote.Hearts);
      return;
    }

    if (this.isInputHeld(Input.EmoteMoon)) {
      this.client.socialController.emote(Emote.Moon);
      return;
    }

    if (this.isInputHeld(Input.EmoteSuicidal)) {
      this.client.socialController.emote(Emote.Suicidal);
      return;
    }
  }
}
