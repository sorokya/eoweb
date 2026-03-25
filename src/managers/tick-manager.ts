import { Direction, Emote as EmoteType } from 'eolib';
import { ChatBubble } from '../chat-bubble';
import type { Client } from '../client';
import {
  CLEAR_OUT_OF_RANGE_TICKS,
  IDLE_TICKS,
  SPELL_COOLDOWN_TICKS,
  USAGE_TICKS,
} from '../consts';
import { getTimestamp } from '../movement-controller';
import {
  CharacterDeathAnimation,
  CharacterSpellChantAnimation,
  CharacterWalkAnimation,
  NpcDeathAnimation,
} from '../render';
import { playSfxById, SfxId } from '../sfx';
import { inRange, randomRange } from '../utils';

export function tickUsage(client: Client): void {
  client.usageTicks = Math.max(client.usageTicks - 1, 0);
  if (!client.usageTicks) {
    client.usage += 1;
    client.usageTicks = USAGE_TICKS;
  }
}

export function tickIdle(client: Client): void {
  client.idleTicks = Math.max(client.idleTicks - 1, 0);
  if (!client.idleTicks) {
    client.emote(EmoteType.Moon);
    client.idleTicks = IDLE_TICKS;
  }
}

export function tickItemProtection(client: Client): void {
  for (const [index, { ticks, ownerId }] of client.itemProtectionTimers) {
    if (ticks <= 1) {
      client.itemProtectionTimers.delete(index);
    } else {
      client.itemProtectionTimers.set(index, { ticks: ticks - 1, ownerId });
    }
  }
}

export function tickDrunk(client: Client): void {
  if (!client.drunk) {
    return;
  }

  client.drunkEmoteTicks = Math.max(client.drunkEmoteTicks - 1, 0);
  if (!client.drunkEmoteTicks) {
    client.emote(EmoteType.Drunk);
    client.drunkEmoteTicks = 10 + randomRange(0, 8) * 5;
  }

  client.drunkTicks = Math.max(client.drunkTicks - 1, 0);
  if (!client.drunkTicks) {
    client.drunk = false;
    client.drunkEmoteTicks = 0;
  }
}

export function tickOutOfRange(client: Client): void {
  client.clearOutofRangeTicks = Math.max(client.clearOutofRangeTicks - 1, 0);
  if (!client.clearOutofRangeTicks) {
    const playerCoords = client.getPlayerCoords();
    client.nearby.characters = client.nearby.characters.filter((c) =>
      inRange(playerCoords, c.coords),
    );
    client.nearby.npcs = client.nearby.npcs.filter((n) =>
      inRange(playerCoords, n.coords),
    );
    client.nearby.items = client.nearby.items.filter((i) =>
      inRange(playerCoords, i.coords),
    );
    client.clearOutofRangeTicks = CLEAR_OUT_OF_RANGE_TICKS;

    if (client.menuPlayerId) {
      const character = client.getCharacterById(client.menuPlayerId);
      if (!character) {
        client.menuPlayerId = 0;
      }
    }
  }
}

export function tickSpellQueue(client: Client): void {
  if (client.queuedSpellId) {
    client.beginSpellChant();
  }

  client.spellCooldownTicks = Math.max(client.spellCooldownTicks - 1, 0);
}

export function tickQueuedNpcChats(client: Client): void {
  const emptyQueuedNpcChats: number[] = [];
  for (const [index, messages] of client.queuedNpcChats) {
    const existingChat = client.npcChats.get(index);
    if (existingChat) {
      continue;
    }

    const npc = client.getNpcByIndex(index);
    if (!npc) {
      emptyQueuedNpcChats.push(index);
      continue;
    }

    const record = client.getEnfRecordById(npc.id);
    if (!record) {
      emptyQueuedNpcChats.push(index);
      continue;
    }

    client.npcChats.set(index, new ChatBubble(client.sans11, messages[0]));

    if (messages.length > 1) {
      messages.splice(0, 1);
    } else {
      emptyQueuedNpcChats.push(index);
    }
  }
  for (const index of emptyQueuedNpcChats) {
    client.queuedNpcChats.delete(index);
  }
}

/**
 * Ticks character animations and returns state about the player character.
 * @returns `{ playerWalking, playerDying }` — used by the caller to decide warp acceptance.
 */
export function tickCharacterAnimations(
  client: Client,
  activeCharIds: Set<number>,
): {
  playerWalking: boolean;
  playerDying: boolean;
} {
  const endedCharacterAnimations: number[] = [];
  let playerWalking = false;
  let playerDying = false;
  for (const [id, animation] of client.characterAnimations) {
    if (!animation.ticks || !activeCharIds.has(id)) {
      if (
        id === client.playerId &&
        animation instanceof CharacterSpellChantAnimation
      ) {
        client.castSpell(animation.spellId);
      } else if (
        id === client.playerId &&
        client.spellCooldownTicks !== SPELL_COOLDOWN_TICKS
      ) {
        client.queuedSpellId = 0;
        client.spellCooldownTicks = SPELL_COOLDOWN_TICKS;
      }

      if (
        id !== client.playerId &&
        animation instanceof CharacterDeathAnimation
      ) {
        client.nearby.characters = client.nearby.characters.filter(
          (c) => c.playerId !== id,
        );
      }

      endedCharacterAnimations.push(id);
      continue;
    }
    if (id === client.playerId && animation instanceof CharacterWalkAnimation) {
      playerWalking = true;
    }
    if (
      id === client.playerId &&
      animation instanceof CharacterDeathAnimation
    ) {
      playerDying = true;
    }
    animation.tick();
  }
  for (const id of endedCharacterAnimations) {
    client.characterAnimations.delete(id);
  }

  return { playerWalking, playerDying };
}

export function tickCharacterEmotes(
  client: Client,
  activeCharIds: Set<number>,
): void {
  const endedCharacterEmotes: number[] = [];
  for (const [id, emote] of client.characterEmotes) {
    if (!emote.ticks || !activeCharIds.has(id)) {
      endedCharacterEmotes.push(id);
      continue;
    }
    emote.tick();
  }
  for (const id of endedCharacterEmotes) {
    client.characterEmotes.delete(id);
  }
}

export function tickNpcAnimations(
  client: Client,
  activeNpcIds: Set<number>,
): void {
  const endedNpcAnimations: number[] = [];
  for (const [id, animation] of client.npcAnimations) {
    if (!animation.ticks || !activeNpcIds.has(id)) {
      endedNpcAnimations.push(id);
      continue;
    }
    animation.tick();
  }
  for (const id of endedNpcAnimations) {
    if (client.npcAnimations.get(id) instanceof NpcDeathAnimation) {
      client.nearby.npcs = client.nearby.npcs.filter((n) => n.index !== id);
    }
    client.npcAnimations.delete(id);
  }
}

export function tickCursorClick(client: Client): void {
  if (client.cursorClickAnimation) {
    client.cursorClickAnimation.tick();
    if (!client.cursorClickAnimation.ticks) {
      client.cursorClickAnimation = undefined;
    }
  }
}

export function tickCharacterChatBubbles(
  client: Client,
  activeCharIds: Set<number>,
): void {
  const endedCharacterChatBubbles: number[] = [];
  for (const [id, bubble] of client.characterChats) {
    if (!bubble.ticks || !activeCharIds.has(id)) {
      endedCharacterChatBubbles.push(id);
      continue;
    }
    bubble.tick();
  }
  for (const id of endedCharacterChatBubbles) {
    client.characterChats.delete(id);
  }
}

export function tickNpcChatBubbles(
  client: Client,
  activeNpcIds: Set<number>,
): void {
  const endedNpcChatBubbles: number[] = [];
  for (const [id, bubble] of client.npcChats) {
    if (!bubble.ticks || !activeNpcIds.has(id)) {
      endedNpcChatBubbles.push(id);
      continue;
    }
    bubble.tick();
  }
  for (const id of endedNpcChatBubbles) {
    client.npcChats.delete(id);
  }
}

export function tickHealthBars(
  client: Client,
  activeCharIds: Set<number>,
  activeNpcIds: Set<number>,
): void {
  const endedNpcHealthBars: number[] = [];
  for (const [id, healthBar] of client.npcHealthBars) {
    if (!activeNpcIds.has(id) || healthBar.ticks <= 0) {
      endedNpcHealthBars.push(id);
      continue;
    }
    healthBar.tick();
  }
  for (const id of endedNpcHealthBars) {
    client.npcHealthBars.delete(id);
  }

  const endedCharacterHealthBars: number[] = [];
  for (const [id, healthBar] of client.characterHealthBars) {
    if (!activeCharIds.has(id) || healthBar.ticks <= 0) {
      endedCharacterHealthBars.push(id);
      continue;
    }
    healthBar.tick();
  }
  for (const id of endedCharacterHealthBars) {
    client.characterHealthBars.delete(id);
  }
}

export function tickEffects(client: Client): void {
  for (let i = client.effects.length - 1; i >= 0; i--) {
    const effect = client.effects[i];
    if (!effect.ticks && !effect.loops) {
      client.effects.splice(i, 1);
      continue;
    }
    effect.tick();
  }
}

export function tickDoors(client: Client): void {
  for (const door of client.doors) {
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

export function tickAutoWalk(client: Client): void {
  if (!client.autoWalkPath.length) {
    return;
  }

  const animation = client.characterAnimations.get(client.playerId);
  if (animation instanceof CharacterWalkAnimation) {
    return;
  }

  const current = client.getPlayerCoords();
  const character = client.getPlayerCharacter();
  const next = client.autoWalkPath.splice(0, 1)[0];

  if (!client.canWalk(next, true)) {
    client.autoWalkPath = [];
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
  client.characterAnimations.set(
    client.playerId,
    new CharacterWalkAnimation(current, next, direction),
  );
  character!.coords.x = next.x;
  character!.coords.y = next.y;
  character!.direction = direction;
  client.walk(direction, next, getTimestamp());
}

export function tickQuake(client: Client): void {
  if (!client.quakeTicks) {
    return;
  }

  client.quakeTicks = Math.max(client.quakeTicks - 1, 0);
  if (client.quakePower) {
    client.quakeOffset = randomRange(0, client.quakePower);
  } else {
    client.quakeOffset = 0;
  }

  if (Math.random() < 0.5) {
    client.quakeOffset = -client.quakeOffset;
  }

  if (!client.quakeTicks) {
    client.quakeOffset = 0;
  }
}
