import {
  BankOpenClientPacket,
  BarberOpenClientPacket,
  type CharacterMapInfo,
  CitizenOpenClientPacket,
  GuildOpenClientPacket,
  MarriageOpenClientPacket,
  type NpcMapInfo,
  NpcType,
  PriestOpenClientPacket,
  QuestUseClientPacket,
  ShopOpenClientPacket,
  StatSkillOpenClientPacket,
} from 'eolib';
import type { Client } from '../client';
import { SpellTarget } from '../types';

export class NpcController {
  private client: Client;
  interactNpcIndex = 0;

  constructor(client: Client) {
    this.client = client;
  }

  clickNpc(npc: NpcMapInfo): void {
    const record = this.client.getEnfRecordById(npc.id);
    if (!record) {
      return;
    }

    switch (record.type) {
      case NpcType.Quest: {
        const packet = new QuestUseClientPacket();
        packet.npcIndex = npc.index;
        packet.questId = 0;
        this.client.bus!.send(packet);
        break;
      }
      case NpcType.Bank: {
        const packet = new BankOpenClientPacket();
        packet.npcIndex = npc.index;
        this.client.bus!.send(packet);
        break;
      }
      case NpcType.Shop: {
        const packet = new ShopOpenClientPacket();
        packet.npcIndex = npc.index;
        this.client.bus!.send(packet);
        break;
      }
      case NpcType.Barber: {
        const packet = new BarberOpenClientPacket();
        packet.npcIndex = npc.index;
        this.client.bus!.send(packet);
        break;
      }
      case NpcType.Guild: {
        const packet = new GuildOpenClientPacket();
        packet.npcIndex = npc.index;
        this.client.bus!.send(packet);
        break;
      }
      case NpcType.Inn: {
        const packet = new CitizenOpenClientPacket();
        packet.npcIndex = npc.index;
        this.client.bus!.send(packet);
        break;
      }
      case NpcType.Lawyer: {
        const packet = new MarriageOpenClientPacket();
        packet.npcIndex = npc.index;
        this.client.bus!.send(packet);
        break;
      }
      case NpcType.Priest: {
        const packet = new PriestOpenClientPacket();
        packet.npcIndex = npc.index;
        this.client.bus!.send(packet);
        break;
      }
      case NpcType.Trainer: {
        const packet = new StatSkillOpenClientPacket();
        packet.npcIndex = npc.index;
        this.client.bus!.send(packet);
        break;
      }
      case NpcType.Aggressive:
      case NpcType.Passive: {
        if (
          !this.client.selectedSpellId ||
          this.client.queuedSpellId > 0 ||
          this.client.spellCooldownTicks > 0
        ) {
          return;
        }
        this.client.spellTarget = SpellTarget.Npc;
        this.client.spellTargetId = npc.index;
        this.client.queuedSpellId = this.client.selectedSpellId;
        this.client.spellCooldownTicks = 999;
        break;
      }
      default:
        return;
    }

    this.interactNpcIndex = npc.index;
  }

  clickCharacter(character: CharacterMapInfo): void {
    if (
      !this.client.selectedSpellId ||
      this.client.queuedSpellId > 0 ||
      this.client.spellCooldownTicks > 0
    ) {
      return;
    }

    this.client.spellTarget = SpellTarget.Player;
    this.client.spellTargetId = character.playerId;
    this.client.queuedSpellId = this.client.selectedSpellId;
    this.client.spellCooldownTicks = 999;
  }
}
