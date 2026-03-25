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

export class CombatController {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  useHotbarSlot(index: number): void {
    const slot = this.client.hotbarSlots[index];
    if (!slot) {
      return;
    }

    if (slot.type === SlotType.Item) {
      this.client.inventoryController.useItem(slot.typeId);
    } else {
      if (!this.client.spells.find((s) => s.id === slot.typeId)) {
        return;
      }

      const record = this.client.getEsfRecordById(slot.typeId);
      if (!record) {
        return;
      }

      const animation = this.client.characterAnimations.get(
        this.client.playerId,
      );
      if (animation) {
        return;
      }

      // TODO: Bard
      if (record.type === SkillType.Bard) {
        return;
      }

      if (
        record.targetType === SkillTargetType.Group &&
        !this.client.partyMembers.length
      ) {
        return;
      }

      if (
        [SkillTargetType.Self, SkillTargetType.Group].includes(
          record.targetType,
        )
      ) {
        this.client.spellTarget =
          record.targetType === SkillTargetType.Self
            ? SpellTarget.Self
            : SpellTarget.Group;
        this.client.spellTargetId = 0;
        this.client.queuedSpellId = slot.typeId;
        return;
      }

      this.client.selectedSpellId = slot.typeId;
      this.client.emit('spellQueued', undefined);
      playSfxById(SfxId.SpellActivate);
    }
  }

  beginSpellChant(): void {
    const record = this.client.getEsfRecordById(this.client.queuedSpellId);
    if (!record) {
      return;
    }

    if (this.client.tp < record.tpCost) {
      this.client.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_WARNING,
        this.client.getResourceString(EOResourceID.ATTACK_YOU_ARE_EXHAUSTED_TP),
      );
      this.client.queuedSpellId = 0;
      return;
    }

    if (
      record.type === SkillType.Heal &&
      this.client.spellTarget === SpellTarget.Npc
    ) {
      this.client.queuedSpellId = 0;
      return;
    }

    if (
      record.type === SkillType.Attack &&
      this.client.spellTarget !== SpellTarget.Npc &&
      this.client.map!.type !== MapType.Pk
    ) {
      this.client.queuedSpellId = 0;
      return;
    }

    if (this.client.spellTarget === SpellTarget.Npc) {
      const npc = this.client.getNpcByIndex(this.client.spellTargetId);
      if (!npc) {
        this.client.queuedSpellId = 0;
        return;
      }

      const animation = this.client.npcAnimations.get(npc.index);
      if (animation instanceof NpcDeathAnimation) {
        this.client.queuedSpellId = 0;
        return;
      }
    }

    if (this.client.spellTarget === SpellTarget.Player) {
      const character = this.client.getCharacterById(this.client.spellTargetId);
      if (!character) {
        this.client.queuedSpellId = 0;
        return;
      }

      const animation = this.client.characterAnimations.get(
        this.client.spellTargetId,
      );
      if (animation instanceof CharacterDeathAnimation) {
        this.client.queuedSpellId = 0;
        return;
      }
    }

    this.client.spellCastTimestamp = getTimestamp();
    const packet = new SpellRequestClientPacket();
    packet.spellId = this.client.queuedSpellId;
    packet.timestamp = this.client.spellCastTimestamp;
    this.client.bus!.send(packet);

    this.client.characterAnimations.set(
      this.client.playerId,
      new CharacterSpellChantAnimation(
        this.client.sans11,
        this.client.queuedSpellId,
        record.chant,
        record.castTime,
      ),
    );

    this.client.queuedSpellId = 0;
  }

  castSpell(spellId: number): void {
    const timestamp = getTimestamp();
    const character = this.client.getPlayerCharacter();

    switch (this.client.spellTarget) {
      case SpellTarget.Self: {
        const packet = new SpellTargetSelfClientPacket();
        packet.spellId = spellId;
        packet.direction = character!.direction!;
        packet.timestamp = timestamp;
        this.client.bus!.send(packet);
        break;
      }
      case SpellTarget.Group: {
        const packet = new SpellTargetGroupClientPacket();
        packet.spellId = spellId;
        packet.timestamp = timestamp;
        this.client.bus!.send(packet);
        break;
      }
      default: {
        const packet = new SpellTargetOtherClientPacket();
        packet.spellId = spellId;
        packet.targetType =
          this.client.spellTarget === SpellTarget.Npc
            ? SpellTargetType.Npc
            : SpellTargetType.Player;
        packet.victimId = this.client.spellTargetId;
        packet.previousTimestamp = this.client.spellCastTimestamp;
        packet.timestamp = timestamp;
        this.client.bus!.send(packet);
        break;
      }
    }

    this.client.queuedSpellId = 0;
    this.client.spellCooldownTicks = SPELL_COOLDOWN_TICKS;
  }

  playSpellEffect(spellId: number, target: EffectTarget): void {
    const record = this.client.getEsfRecordById(spellId);
    if (!record) {
      return;
    }

    const metadata = this.client.getEffectMetadata(record.graphicId);
    if (!metadata) {
      return;
    }

    this.client.effects.push(
      new EffectAnimation(record.graphicId, target, metadata),
    );

    if (metadata.sfx) {
      playSfxById(metadata.sfx);
    }
  }
}
