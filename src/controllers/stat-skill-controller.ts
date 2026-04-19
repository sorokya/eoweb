import {
  type SkillLearn,
  type StatId,
  StatSkillAddClientPacket,
  StatSkillJunkClientPacket,
  StatSkillRemoveClientPacket,
  StatSkillTakeClientPacket,
  TrainType,
} from 'eolib';

import type { Client } from '@/client';

type OpenedSubscriber = (name: string, skills: SkillLearn[]) => void;
type SkillsChangedSubscriber = () => void;

export class StatSkillController {
  private client: Client;

  masterName = '';
  availableSkills: SkillLearn[] = [];

  private openedSubscribers: OpenedSubscriber[] = [];
  private skillsChangedSubscribers: SkillsChangedSubscriber[] = [];

  constructor(client: Client) {
    this.client = client;
  }

  subscribeOpened(cb: OpenedSubscriber): void {
    this.openedSubscribers.push(cb);
  }

  unsubscribeOpened(cb: OpenedSubscriber): void {
    this.openedSubscribers = this.openedSubscribers.filter((s) => s !== cb);
  }

  subscribeSkillsChanged(cb: SkillsChangedSubscriber): void {
    this.skillsChangedSubscribers.push(cb);
  }

  unsubscribeSkillsChanged(cb: SkillsChangedSubscriber): void {
    this.skillsChangedSubscribers = this.skillsChangedSubscribers.filter(
      (s) => s !== cb,
    );
  }

  notifyOpened(name: string, skills: SkillLearn[]): void {
    this.masterName = name;
    this.availableSkills = skills;
    for (const cb of this.openedSubscribers) cb(name, skills);
  }

  notifySkillsChanged(): void {
    for (const cb of this.skillsChangedSubscribers) cb();
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
