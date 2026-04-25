import { Emote as EmoteType } from 'eolib';
import type { Client } from '@/client';
import { IDLE_TICKS, INITIAL_IDLE_TICKS, USAGE_TICKS } from '@/consts';

export class UsageController {
  private client: Client;
  usageTicks = USAGE_TICKS;
  usage = 0;
  idleTicks = INITIAL_IDLE_TICKS;

  get idle(): boolean {
    return !this.idleTicks;
  }

  constructor(client: Client) {
    this.client = client;
  }

  tick(): void {
    this.usageTicks = Math.max(this.usageTicks - 1, 0);
    if (!this.usageTicks) {
      this.usage += 1;
      this.usageTicks = USAGE_TICKS;
    }

    this.idleTicks = Math.max(this.idleTicks - 1, 0);
    if (!this.idleTicks) {
      this.client.movementController.emote(EmoteType.Moon);
      this.idleTicks = IDLE_TICKS;
    }
  }
}
