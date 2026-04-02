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

import type { Client } from '@/client';
import { SPELL_COOLDOWN_TICKS } from '@/consts';
import { EOResourceID } from '@/edf';
import { SpellTarget } from '@/game-state';
import {
  CharacterDeathAnimation,
  CharacterSpellChantAnimation,
  EffectAnimation,
  type EffectTarget,
  NpcDeathAnimation,
} from '@/render';
import { playSfxById, SfxId } from '@/sfx';
import { SlotType } from '@/ui';
import { getTimestamp } from './movement-controller';

enum SpellState {
  None = 0,
  Chanting = 1,
  Casting = 2,
}

export class SpellController {
  private client: Client;
  state = SpellState.None;
  selectedSpellId = 0;
  queuedSpellId = 0;
  spellCastTimestamp = 0;
  spellTarget: SpellTarget | null = null;
  spellTargetId = 0;
  spellCooldownTicks = 0;

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

      const animation = this.client.animationController.characterAnimations.get(
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
        this.spellTarget =
          record.targetType === SkillTargetType.Self
            ? SpellTarget.Self
            : SpellTarget.Group;
        this.spellTargetId = 0;
        this.queuedSpellId = slot.typeId;
        return;
      }

      this.selectedSpellId = slot.typeId;
      this.client.emit('spellQueued', undefined);
      playSfxById(SfxId.SpellActivate);
    }
  }

  beginSpellChant(): void {
    const record = this.client.getEsfRecordById(this.queuedSpellId);
    if (!record) {
      return;
    }

    if (this.client.tp < record.tpCost) {
      this.client.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_WARNING,
        this.client.getResourceString(EOResourceID.ATTACK_YOU_ARE_EXHAUSTED_TP),
      );
      this.queuedSpellId = 0;
      this.spellCooldownTicks = 0;
      return;
    }

    if (
      record.type === SkillType.Heal &&
      this.spellTarget === SpellTarget.Npc
    ) {
      this.queuedSpellId = 0;
      this.spellCooldownTicks = 0;
      return;
    }

    if (
      record.type === SkillType.Attack &&
      this.spellTarget !== SpellTarget.Npc &&
      this.client.map!.type !== MapType.Pk
    ) {
      this.queuedSpellId = 0;
      this.spellCooldownTicks = 0;
      return;
    }

    if (this.spellTarget === SpellTarget.Npc) {
      const npc = this.client.getNpcByIndex(this.spellTargetId);
      if (!npc) {
        this.queuedSpellId = 0;
        this.spellCooldownTicks = 0;
        return;
      }

      const animation = this.client.animationController.npcAnimations.get(
        npc.index,
      );
      if (animation instanceof NpcDeathAnimation) {
        this.queuedSpellId = 0;
        this.spellCooldownTicks = 0;
        return;
      }
    }

    if (this.spellTarget === SpellTarget.Player) {
      const character = this.client.getCharacterById(this.spellTargetId);
      if (!character) {
        this.queuedSpellId = 0;
        this.spellCooldownTicks = 0;
        return;
      }

      const animation = this.client.animationController.characterAnimations.get(
        this.spellTargetId,
      );
      if (animation instanceof CharacterDeathAnimation) {
        this.queuedSpellId = 0;
        this.spellCooldownTicks = 0;
        return;
      }
    }

    this.spellCastTimestamp = getTimestamp();
    this.state = SpellState.Chanting;
    const packet = new SpellRequestClientPacket();
    packet.spellId = this.queuedSpellId;
    packet.timestamp = this.spellCastTimestamp;
    this.client.bus!.send(packet);

    this.client.animationController.characterAnimations.set(
      this.client.playerId,
      new CharacterSpellChantAnimation(
        this.client.sans11,
        this.queuedSpellId,
        record.chant,
        record.castTime,
      ),
    );
  }

  castSpell(spellId: number): void {
    const timestamp = getTimestamp();
    const character = this.client.getPlayerCharacter();

    switch (this.spellTarget) {
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
          this.spellTarget === SpellTarget.Npc
            ? SpellTargetType.Npc
            : SpellTargetType.Player;
        packet.victimId = this.spellTargetId;
        packet.previousTimestamp = this.spellCastTimestamp;
        packet.timestamp = timestamp;
        this.client.bus!.send(packet);
        break;
      }
    }

    this.queuedSpellId = 0;
    this.spellCooldownTicks = SPELL_COOLDOWN_TICKS;
    this.state = SpellState.Casting;
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

    this.client.animationController.effects.push(
      new EffectAnimation(record.graphicId, target, metadata),
    );

    if (metadata.sfx) {
      playSfxById(metadata.sfx);
    }
  }

  tick(): void {
    this.spellCooldownTicks = Math.max(this.spellCooldownTicks - 1, 0);

    if (this.queuedSpellId && this.state === SpellState.None) {
      this.beginSpellChant();
    } else if (!this.spellCooldownTicks && this.state === SpellState.Casting) {
      this.state = SpellState.None;
    }
  }
}
