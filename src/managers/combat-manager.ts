import {
  MapType,
  SkillTargetType,
  SkillType,
  SpellRequestClientPacket,
  SpellTargetGroupClientPacket,
  SpellTargetOtherClientPacket,
  SpellTargetSelfClientPacket,
  SpellTargetType,
} from 'eolib';

import type { Client } from '../client';
import { SPELL_COOLDOWN_TICKS } from '../consts';
import { EOResourceID } from '../edf';
import { getTimestamp } from '../movement-controller';
import {
  CharacterDeathAnimation,
  CharacterSpellChantAnimation,
  EffectAnimation,
  type EffectTarget,
  NpcDeathAnimation,
} from '../render';
import { playSfxById } from '../sfx';
import { SfxId, SlotType, SpellTarget } from '../types';

export function useHotbarSlot(client: Client, index: number): void {
  const slot = client.hotbarSlots[index];
  if (!slot) {
    return;
  }

  if (slot.type === SlotType.Item) {
    client.useItem(slot.typeId);
  } else {
    if (!client.spells.find((s) => s.id === slot.typeId)) {
      return;
    }

    const record = client.getEsfRecordById(slot.typeId);
    if (!record) {
      return;
    }

    const animation = client.characterAnimations.get(client.playerId);
    if (animation) {
      return;
    }

    // TODO: Bard
    if (record.type === SkillType.Bard) {
      return;
    }

    if (
      record.targetType === SkillTargetType.Group &&
      !client.partyMembers.length
    ) {
      return;
    }

    if (
      [SkillTargetType.Self, SkillTargetType.Group].includes(record.targetType)
    ) {
      client.spellTarget =
        record.targetType === SkillTargetType.Self
          ? SpellTarget.Self
          : SpellTarget.Group;
      client.spellTargetId = 0;
      client.queuedSpellId = slot.typeId;
      return;
    }

    client.selectedSpellId = slot.typeId;
    client.emit('spellQueued', undefined);
    playSfxById(SfxId.SpellActivate);
  }
}

export function beginSpellChant(client: Client): void {
  const record = client.getEsfRecordById(client.queuedSpellId);
  if (!record) {
    return;
  }

  if (client.tp < record.tpCost) {
    client.setStatusLabel(
      EOResourceID.STATUS_LABEL_TYPE_WARNING,
      client.getResourceString(EOResourceID.ATTACK_YOU_ARE_EXHAUSTED_TP)!,
    );
    client.queuedSpellId = 0;
    return;
  }

  if (
    record.type === SkillType.Heal &&
    client.spellTarget === SpellTarget.Npc
  ) {
    client.queuedSpellId = 0;
    return;
  }

  if (
    record.type === SkillType.Attack &&
    client.spellTarget !== SpellTarget.Npc &&
    client.map!.type !== MapType.Pk
  ) {
    client.queuedSpellId = 0;
    return;
  }

  if (client.spellTarget === SpellTarget.Npc) {
    const npc = client.getNpcByIndex(client.spellTargetId);
    if (!npc) {
      client.queuedSpellId = 0;
      return;
    }

    const animation = client.npcAnimations.get(npc.index);
    if (animation instanceof NpcDeathAnimation) {
      client.queuedSpellId = 0;
      return;
    }
  }

  if (client.spellTarget === SpellTarget.Player) {
    const character = client.getCharacterById(client.spellTargetId);
    if (!character) {
      client.queuedSpellId = 0;
      return;
    }

    const animation = client.characterAnimations.get(client.spellTargetId);
    if (animation instanceof CharacterDeathAnimation) {
      client.queuedSpellId = 0;
      return;
    }
  }

  client.spellCastTimestamp = getTimestamp();
  const packet = new SpellRequestClientPacket();
  packet.spellId = client.queuedSpellId;
  packet.timestamp = client.spellCastTimestamp;
  client.bus!.send(packet);

  client.characterAnimations.set(
    client.playerId,
    new CharacterSpellChantAnimation(
      client.sans11,
      client.queuedSpellId,
      record.chant,
      record.castTime,
    ),
  );

  client.queuedSpellId = 0;
}

export function castSpell(client: Client, spellId: number): void {
  const timestamp = getTimestamp();
  const character = client.getPlayerCharacter();

  switch (client.spellTarget) {
    case SpellTarget.Self: {
      const packet = new SpellTargetSelfClientPacket();
      packet.spellId = spellId;
      packet.direction = character!.direction!;
      packet.timestamp = timestamp;
      client.bus!.send(packet);
      break;
    }
    case SpellTarget.Group: {
      const packet = new SpellTargetGroupClientPacket();
      packet.spellId = spellId;
      packet.timestamp = timestamp;
      client.bus!.send(packet);
      break;
    }
    default: {
      const packet = new SpellTargetOtherClientPacket();
      packet.spellId = spellId;
      packet.targetType =
        client.spellTarget === SpellTarget.Npc
          ? SpellTargetType.Npc
          : SpellTargetType.Player;
      packet.victimId = client.spellTargetId;
      packet.previousTimestamp = client.spellCastTimestamp;
      packet.timestamp = timestamp;
      client.bus!.send(packet);
      break;
    }
  }

  client.queuedSpellId = 0;
  client.spellCooldownTicks = SPELL_COOLDOWN_TICKS;
}

export function playSpellEffect(
  client: Client,
  spellId: number,
  target: EffectTarget,
): void {
  const record = client.getEsfRecordById(spellId);
  if (!record) {
    return;
  }

  const metadata = client.getEffectMetadata(record.graphicId);
  if (!metadata) {
    return;
  }

  client.effects.push(new EffectAnimation(record.graphicId, target, metadata));

  if (metadata.sfx) {
    playSfxById(metadata.sfx);
  }
}
