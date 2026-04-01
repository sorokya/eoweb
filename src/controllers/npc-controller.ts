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
import type { Client } from '@/client';
import { SpellTarget } from '@/game-state';
import { ChatBubble } from '@/render';

export class NpcController {
  private client: Client;
  interactNpcIndex = 0;
  queuedNpcChats: Map<number, string[]> = new Map();

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
          !this.client.spellController.selectedSpellId ||
          this.client.spellController.queuedSpellId > 0 ||
          this.client.spellController.spellCooldownTicks > 0
        ) {
          return;
        }
        this.client.spellController.spellTarget = SpellTarget.Npc;
        this.client.spellController.spellTargetId = npc.index;
        this.client.spellController.queuedSpellId =
          this.client.spellController.selectedSpellId;
        break;
      }
      default:
        return;
    }

    this.interactNpcIndex = npc.index;
  }

  clickCharacter(character: CharacterMapInfo): void {
    if (
      !this.client.spellController.selectedSpellId ||
      this.client.spellController.queuedSpellId > 0 ||
      this.client.spellController.spellCooldownTicks > 0
    ) {
      return;
    }

    this.client.spellController.spellTarget = SpellTarget.Player;
    this.client.spellController.spellTargetId = character.playerId;
    this.client.spellController.queuedSpellId =
      this.client.spellController.selectedSpellId;
  }

  tick(): void {
    const emptyQueuedNpcChats: number[] = [];
    for (const [index, messages] of this.queuedNpcChats) {
      const existingChat = this.client.animationController.npcChats.get(index);
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

      this.client.animationController.npcChats.set(
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
      this.queuedNpcChats.delete(index);
    }
  }
}
