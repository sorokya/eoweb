import type { Client } from '@/client';
import { SPELL_COOLDOWN_TICKS } from '@/consts';
import type { ChatBubble } from '@/render';
import {
  type Animation,
  CharacterDeathAnimation,
  CharacterSpellChantAnimation,
  CharacterWalkAnimation,
  type CursorClickAnimation,
  type EffectAnimation,
  type Emote,
  type HealthBar,
  NpcDeathAnimation,
} from '@/render';

export class AnimationController {
  private client: Client;
  characterAnimations: Map<number, Animation> = new Map();
  npcAnimations: Map<number, Animation> = new Map();
  characterChats: Map<number, ChatBubble> = new Map();
  npcChats: Map<number, ChatBubble> = new Map();
  npcHealthBars: Map<number, HealthBar> = new Map();
  characterHealthBars: Map<number, HealthBar> = new Map();
  characterEmotes: Map<number, Emote> = new Map();
  effects: EffectAnimation[] = [];
  cursorClickAnimation: CursorClickAnimation | undefined;

  constructor(client: Client) {
    this.client = client;
  }

  tick(
    activeCharIds: Set<number>,
    activeNpcIds: Set<number>,
  ): { playerWalking: boolean; playerDying: boolean } {
    const result = this.tickCharacterAnimations(activeCharIds);
    this.tickCharacterEmotes(activeCharIds);
    this.tickNpcAnimations(activeNpcIds);
    this.tickCursorClick();
    this.tickCharacterChatBubbles(activeCharIds);
    this.tickHealthBars(activeCharIds, activeNpcIds);
    this.tickNpcChatBubbles(activeNpcIds);
    this.tickEffects();
    return result;
  }

  private tickCharacterAnimations(activeCharIds: Set<number>): {
    playerWalking: boolean;
    playerDying: boolean;
  } {
    const endedCharacterAnimations: number[] = [];
    let playerWalking = false;
    let playerDying = false;
    for (const [id, animation] of this.characterAnimations) {
      if (!animation.ticks || !activeCharIds.has(id)) {
        if (
          id === this.client.playerId &&
          animation instanceof CharacterSpellChantAnimation
        ) {
          this.client.spellController.castSpell(animation.spellId);
        } else if (
          id === this.client.playerId &&
          this.client.spellController.spellCooldownTicks !==
            SPELL_COOLDOWN_TICKS
        ) {
          this.client.spellController.queuedSpellId = 0;
          this.client.spellController.spellCooldownTicks = SPELL_COOLDOWN_TICKS;
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
      this.characterAnimations.delete(id);
    }

    return { playerWalking, playerDying };
  }

  private tickCharacterEmotes(activeCharIds: Set<number>): void {
    const endedCharacterEmotes: number[] = [];
    for (const [id, emote] of this.characterEmotes) {
      if (!emote.ticks || !activeCharIds.has(id)) {
        endedCharacterEmotes.push(id);
        continue;
      }
      emote.tick();
    }
    for (const id of endedCharacterEmotes) {
      this.characterEmotes.delete(id);
    }
  }

  private tickNpcAnimations(activeNpcIds: Set<number>): void {
    const endedNpcAnimations: number[] = [];
    for (const [id, animation] of this.npcAnimations) {
      if (!animation.ticks || !activeNpcIds.has(id)) {
        endedNpcAnimations.push(id);
        continue;
      }
      animation.tick();
    }
    for (const id of endedNpcAnimations) {
      if (this.npcAnimations.get(id) instanceof NpcDeathAnimation) {
        this.client.nearby.npcs = this.client.nearby.npcs.filter(
          (n) => n.index !== id,
        );
      }
      this.npcAnimations.delete(id);
    }
  }

  private tickCursorClick(): void {
    if (this.cursorClickAnimation) {
      this.cursorClickAnimation.tick();
      if (!this.cursorClickAnimation.ticks) {
        this.cursorClickAnimation = undefined;
      }
    }
  }

  private tickCharacterChatBubbles(activeCharIds: Set<number>): void {
    const endedCharacterChatBubbles: number[] = [];
    for (const [id, bubble] of this.characterChats) {
      if (!bubble.ticks || !activeCharIds.has(id)) {
        endedCharacterChatBubbles.push(id);
        continue;
      }
      bubble.tick();
    }
    for (const id of endedCharacterChatBubbles) {
      this.characterChats.delete(id);
    }
  }

  private tickNpcChatBubbles(activeNpcIds: Set<number>): void {
    const endedNpcChatBubbles: number[] = [];
    for (const [id, bubble] of this.npcChats) {
      if (!bubble.ticks || !activeNpcIds.has(id)) {
        endedNpcChatBubbles.push(id);
        continue;
      }
      bubble.tick();
    }
    for (const id of endedNpcChatBubbles) {
      this.npcChats.delete(id);
    }
  }

  private tickHealthBars(
    activeCharIds: Set<number>,
    activeNpcIds: Set<number>,
  ): void {
    const endedNpcHealthBars: number[] = [];
    for (const [id, healthBar] of this.npcHealthBars) {
      if (!activeNpcIds.has(id) || healthBar.ticks <= 0) {
        endedNpcHealthBars.push(id);
        continue;
      }
      healthBar.tick();
    }
    for (const id of endedNpcHealthBars) {
      this.npcHealthBars.delete(id);
    }

    const endedCharacterHealthBars: number[] = [];
    for (const [id, healthBar] of this.characterHealthBars) {
      if (!activeCharIds.has(id) || healthBar.ticks <= 0) {
        endedCharacterHealthBars.push(id);
        continue;
      }
      healthBar.tick();
    }
    for (const id of endedCharacterHealthBars) {
      this.characterHealthBars.delete(id);
    }
  }

  private tickEffects(): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      if (!effect.ticks && !effect.loops) {
        this.effects.splice(i, 1);
        continue;
      }
      effect.tick();
    }
  }
}
