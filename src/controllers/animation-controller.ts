import type { Client } from '@/client';
import { SPELL_COOLDOWN_TICKS, SPLOOSHIE_EFFECT_ID } from '@/consts';
import type { ChatBubble } from '@/render';
import {
  type Animation,
  CharacterDeathAnimation,
  CharacterSpellChantAnimation,
  CharacterWalkAnimation,
  type CursorClickAnimation,
  EffectAnimation,
  EffectTargetCharacter,
  type Emote,
  type HealthBar,
  NpcDeathAnimation,
  NpcWalkAnimation,
} from '@/render';
import { SfxId } from '@/sfx';
import type { EffectMetadata } from '@/utils';

export class AnimationController {
  private client: Client;
  characterAnimations: Map<number, Animation> = new Map();
  pendingCharacterAnimations: Map<number, Animation> = new Map();
  npcAnimations: Map<number, Animation> = new Map();
  pendingNpcAnimations: Map<number, Animation> = new Map();
  characterChats: Map<number, ChatBubble> = new Map();
  npcChats: Map<number, ChatBubble> = new Map();
  npcHealthBars: Map<number, HealthBar> = new Map();
  characterHealthBars: Map<number, HealthBar> = new Map();
  characterEmotes: Map<number, Emote> = new Map();
  effects: EffectAnimation[] = [];
  cursorClickAnimation: CursorClickAnimation | undefined;

  private splooshiMetadata: EffectMetadata | undefined;

  constructor(client: Client) {
    this.client = client;
  }

  playSplooshieEffect(playerId: number): void {
    if (!this.splooshiMetadata) {
      this.splooshiMetadata =
        this.client.getEffectMetadata(SPLOOSHIE_EFFECT_ID);
    }

    this.effects.push(
      new EffectAnimation(
        SPLOOSHIE_EFFECT_ID,
        new EffectTargetCharacter(playerId),
        this.splooshiMetadata,
      ),
    );

    if (!this.splooshiMetadata.sfx) {
      return;
    }

    if (playerId === this.client.playerId) {
      this.client.audioController.playById(this.splooshiMetadata.sfx);
      return;
    }

    const position = this.client.getCharacterById(playerId)?.coords;
    if (position) {
      this.client.audioController.playAtPosition(SfxId.Water, position);
    }
  }

  tick(
    activeCharIds: Set<number>,
    activeNpcIds: Set<number>,
  ): { playerWalking: boolean; playerDying: boolean } {
    // Drain pending animations so they're created inside the tick loop,
    // allowing the renderedFirstFrame no-op to happen in this same tick.
    for (const [id, animation] of this.pendingCharacterAnimations) {
      if (animation instanceof CharacterWalkAnimation) {
        const character = this.client.getCharacterById(id);
        if (character) {
          character.direction = animation.direction;
          character.coords.x = animation.to.x;
          character.coords.y = animation.to.y;
        }
      }
      this.characterAnimations.set(id, animation);
    }
    this.pendingCharacterAnimations.clear();

    for (const [id, animation] of this.pendingNpcAnimations) {
      if (animation instanceof NpcWalkAnimation) {
        const npc = this.client.nearby.npcs.find((n) => n.index === id);
        if (npc) {
          npc.direction = animation.direction;
          npc.coords.x = animation.to.x;
          npc.coords.y = animation.to.y;
        }
      }
      this.npcAnimations.set(id, animation);
    }
    this.pendingNpcAnimations.clear();

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
