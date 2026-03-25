import { Direction, Emote as EmoteType } from 'eolib';
import { ChatBubble } from '../chat-bubble';
import type { Client } from '../client';
import {
  CLEAR_OUT_OF_RANGE_TICKS,
  IDLE_TICKS,
  SPELL_COOLDOWN_TICKS,
  USAGE_TICKS,
} from '../consts';
import {
  CharacterDeathAnimation,
  CharacterSpellChantAnimation,
  CharacterWalkAnimation,
  NpcDeathAnimation,
} from '../render';
import { playSfxById, SfxId } from '../sfx';
import { inRange, randomRange } from '../utils';
import { getTimestamp } from './movement-controller';

export class TickController {
  private client: Client;
  usageTicks = USAGE_TICKS;
  clearOutofRangeTicks = 0;
  drunkEmoteTicks = 0;
  drunkTicks = 0;
  quakeTicks = 0;
  quakePower = 0;
  quakeOffset = 0;

  constructor(client: Client) {
    this.client = client;
  }

  tickUsage(): void {
    this.usageTicks = Math.max(this.usageTicks - 1, 0);
    if (!this.usageTicks) {
      this.client.usage += 1;
      this.usageTicks = USAGE_TICKS;
    }
  }

  tickIdle(): void {
    this.client.idleTicks = Math.max(this.client.idleTicks - 1, 0);
    if (!this.client.idleTicks) {
      this.client.socialController.emote(EmoteType.Moon);
      this.client.idleTicks = IDLE_TICKS;
    }
  }

  tickItemProtection(): void {
    for (const [index, { ticks, ownerId }] of this.client
      .itemProtectionTimers) {
      if (ticks <= 1) {
        this.client.itemProtectionTimers.delete(index);
      } else {
        this.client.itemProtectionTimers.set(index, {
          ticks: ticks - 1,
          ownerId,
        });
      }
    }
  }

  tickDrunk(): void {
    if (!this.client.drunk) {
      return;
    }

    this.drunkEmoteTicks = Math.max(this.drunkEmoteTicks - 1, 0);
    if (!this.drunkEmoteTicks) {
      this.client.socialController.emote(EmoteType.Drunk);
      this.drunkEmoteTicks = 10 + randomRange(0, 8) * 5;
    }

    this.drunkTicks = Math.max(this.drunkTicks - 1, 0);
    if (!this.drunkTicks) {
      this.client.drunk = false;
      this.drunkEmoteTicks = 0;
    }
  }

  tickOutOfRange(): void {
    this.clearOutofRangeTicks = Math.max(this.clearOutofRangeTicks - 1, 0);
    if (!this.clearOutofRangeTicks) {
      const playerCoords = this.client.getPlayerCoords();
      this.client.nearby.characters = this.client.nearby.characters.filter(
        (c) => inRange(playerCoords, c.coords),
      );
      this.client.nearby.npcs = this.client.nearby.npcs.filter((n) =>
        inRange(playerCoords, n.coords),
      );
      this.client.nearby.items = this.client.nearby.items.filter((i) =>
        inRange(playerCoords, i.coords),
      );
      this.clearOutofRangeTicks = CLEAR_OUT_OF_RANGE_TICKS;

      if (this.client.menuPlayerId) {
        const character = this.client.getCharacterById(
          this.client.menuPlayerId,
        );
        if (!character) {
          this.client.menuPlayerId = 0;
        }
      }
    }
  }

  tickSpellQueue(): void {
    if (this.client.queuedSpellId) {
      this.client.combatController.beginSpellChant();
    }

    this.client.spellCooldownTicks = Math.max(
      this.client.spellCooldownTicks - 1,
      0,
    );
  }

  tickQueuedNpcChats(): void {
    const emptyQueuedNpcChats: number[] = [];
    for (const [index, messages] of this.client.queuedNpcChats) {
      const existingChat = this.client.npcChats.get(index);
      if (existingChat) {
        continue;
      }

      const npc = this.client.getNpcByIndex(index);
      if (!npc) {
        emptyQueuedNpcChats.push(index);
        continue;
      }

      const record = this.client.getEnfRecordById(npc.id);
      if (!record) {
        emptyQueuedNpcChats.push(index);
        continue;
      }

      this.client.npcChats.set(
        index,
        new ChatBubble(this.client.sans11, messages[0]),
      );

      if (messages.length > 1) {
        messages.splice(0, 1);
      } else {
        emptyQueuedNpcChats.push(index);
      }
    }
    for (const index of emptyQueuedNpcChats) {
      this.client.queuedNpcChats.delete(index);
    }
  }

  /**
   * Ticks character animations and returns state about the player character.
   * @returns `{ playerWalking, playerDying }` — used by the caller to decide warp acceptance.
   */
  tickCharacterAnimations(activeCharIds: Set<number>): {
    playerWalking: boolean;
    playerDying: boolean;
  } {
    const endedCharacterAnimations: number[] = [];
    let playerWalking = false;
    let playerDying = false;
    for (const [id, animation] of this.client.characterAnimations) {
      if (!animation.ticks || !activeCharIds.has(id)) {
        if (
          id === this.client.playerId &&
          animation instanceof CharacterSpellChantAnimation
        ) {
          this.client.combatController.castSpell(animation.spellId);
        } else if (
          id === this.client.playerId &&
          this.client.spellCooldownTicks !== SPELL_COOLDOWN_TICKS
        ) {
          this.client.queuedSpellId = 0;
          this.client.spellCooldownTicks = SPELL_COOLDOWN_TICKS;
        }

        if (
          id !== this.client.playerId &&
          animation instanceof CharacterDeathAnimation
        ) {
          this.client.nearby.characters = this.client.nearby.characters.filter(
            (c) => c.playerId !== id,
          );
        }

        endedCharacterAnimations.push(id);
        continue;
      }
      if (
        id === this.client.playerId &&
        animation instanceof CharacterWalkAnimation
      ) {
        playerWalking = true;
      }
      if (
        id === this.client.playerId &&
        animation instanceof CharacterDeathAnimation
      ) {
        playerDying = true;
      }
      animation.tick();
    }
    for (const id of endedCharacterAnimations) {
      this.client.characterAnimations.delete(id);
    }

    return { playerWalking, playerDying };
  }

  tickCharacterEmotes(activeCharIds: Set<number>): void {
    const endedCharacterEmotes: number[] = [];
    for (const [id, emote] of this.client.characterEmotes) {
      if (!emote.ticks || !activeCharIds.has(id)) {
        endedCharacterEmotes.push(id);
        continue;
      }
      emote.tick();
    }
    for (const id of endedCharacterEmotes) {
      this.client.characterEmotes.delete(id);
    }
  }

  tickNpcAnimations(activeNpcIds: Set<number>): void {
    const endedNpcAnimations: number[] = [];
    for (const [id, animation] of this.client.npcAnimations) {
      if (!animation.ticks || !activeNpcIds.has(id)) {
        endedNpcAnimations.push(id);
        continue;
      }
      animation.tick();
    }
    for (const id of endedNpcAnimations) {
      if (this.client.npcAnimations.get(id) instanceof NpcDeathAnimation) {
        this.client.nearby.npcs = this.client.nearby.npcs.filter(
          (n) => n.index !== id,
        );
      }
      this.client.npcAnimations.delete(id);
    }
  }

  tickCursorClick(): void {
    if (this.client.cursorClickAnimation) {
      this.client.cursorClickAnimation.tick();
      if (!this.client.cursorClickAnimation.ticks) {
        this.client.cursorClickAnimation = undefined;
      }
    }
  }

  tickCharacterChatBubbles(activeCharIds: Set<number>): void {
    const endedCharacterChatBubbles: number[] = [];
    for (const [id, bubble] of this.client.characterChats) {
      if (!bubble.ticks || !activeCharIds.has(id)) {
        endedCharacterChatBubbles.push(id);
        continue;
      }
      bubble.tick();
    }
    for (const id of endedCharacterChatBubbles) {
      this.client.characterChats.delete(id);
    }
  }

  tickNpcChatBubbles(activeNpcIds: Set<number>): void {
    const endedNpcChatBubbles: number[] = [];
    for (const [id, bubble] of this.client.npcChats) {
      if (!bubble.ticks || !activeNpcIds.has(id)) {
        endedNpcChatBubbles.push(id);
        continue;
      }
      bubble.tick();
    }
    for (const id of endedNpcChatBubbles) {
      this.client.npcChats.delete(id);
    }
  }

  tickHealthBars(activeCharIds: Set<number>, activeNpcIds: Set<number>): void {
    const endedNpcHealthBars: number[] = [];
    for (const [id, healthBar] of this.client.npcHealthBars) {
      if (!activeNpcIds.has(id) || healthBar.ticks <= 0) {
        endedNpcHealthBars.push(id);
        continue;
      }
      healthBar.tick();
    }
    for (const id of endedNpcHealthBars) {
      this.client.npcHealthBars.delete(id);
    }

    const endedCharacterHealthBars: number[] = [];
    for (const [id, healthBar] of this.client.characterHealthBars) {
      if (!activeCharIds.has(id) || healthBar.ticks <= 0) {
        endedCharacterHealthBars.push(id);
        continue;
      }
      healthBar.tick();
    }
    for (const id of endedCharacterHealthBars) {
      this.client.characterHealthBars.delete(id);
    }
  }

  tickEffects(): void {
    for (let i = this.client.effects.length - 1; i >= 0; i--) {
      const effect = this.client.effects[i];
      if (!effect.ticks && !effect.loops) {
        this.client.effects.splice(i, 1);
        continue;
      }
      effect.tick();
    }
  }

  tickDoors(): void {
    for (const door of this.client.doors) {
      if (!door.open) {
        continue;
      }

      door.openTicks = Math.max(door.openTicks - 1, 0);
      if (!door.openTicks) {
        door.open = false;
        playSfxById(SfxId.DoorClose);
      }
    }
  }

  tickAutoWalk(): void {
    if (!this.client.autoWalkPath.length) {
      return;
    }

    const animation = this.client.characterAnimations.get(this.client.playerId);
    if (animation instanceof CharacterWalkAnimation) {
      return;
    }

    const current = this.client.getPlayerCoords();
    const character = this.client.getPlayerCharacter();
    const next = this.client.autoWalkPath.splice(0, 1)[0];

    if (!this.client.mapController.canWalk(next, true)) {
      this.client.autoWalkPath = [];
      return;
    }

    const diffX = next.x - current.x;
    const diffY = next.y - current.y;
    let direction: Direction;
    if (Math.abs(diffX) > Math.abs(diffY)) {
      direction = diffX > 0 ? Direction.Right : Direction.Left;
    } else {
      direction = diffY > 0 ? Direction.Down : Direction.Up;
    }
    this.client.characterAnimations.set(
      this.client.playerId,
      new CharacterWalkAnimation(current, next, direction),
    );
    character!.coords.x = next.x;
    character!.coords.y = next.y;
    character!.direction = direction;
    this.client.movementController.walk(direction, next, getTimestamp());
  }

  tickQuake(): void {
    if (!this.quakeTicks) {
      return;
    }

    this.quakeTicks = Math.max(this.quakeTicks - 1, 0);
    if (this.quakePower) {
      this.quakeOffset = randomRange(0, this.quakePower);
    } else {
      this.quakeOffset = 0;
    }

    if (Math.random() < 0.5) {
      this.quakeOffset = -this.quakeOffset;
    }

    if (!this.quakeTicks) {
      this.quakeOffset = 0;
    }
  }
}
