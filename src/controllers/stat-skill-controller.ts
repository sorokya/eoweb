import {
  type StatId,
  StatSkillAddClientPacket,
  StatSkillJunkClientPacket,
  StatSkillRemoveClientPacket,
  StatSkillTakeClientPacket,
  TrainType,
} from 'eolib';

import type { Client } from '../client';

export class StatSkillController {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  trainStat(statId: StatId): void {
    const packet = new StatSkillAddClientPacket();
    packet.actionType = TrainType.Stat;
    packet.actionTypeData = new StatSkillAddClientPacket.ActionTypeDataStat();
    packet.actionTypeData.statId = statId;
    this.client.bus!.send(packet);
  }

  learnSkill(skillId: number): void {
    const packet = new StatSkillTakeClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.spellId = skillId;
    this.client.bus!.send(packet);
  }

  forgetSkill(skillId: number): void {
    const packet = new StatSkillRemoveClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.spellId = skillId;
    this.client.bus!.send(packet);
  }

  resetCharacter(): void {
    const packet = new StatSkillJunkClientPacket();
    packet.sessionId = this.client.sessionId;
    this.client.bus!.send(packet);
  }
}
