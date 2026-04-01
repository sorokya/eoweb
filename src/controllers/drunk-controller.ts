import { Emote as EmoteType } from 'eolib';
import type { Client } from '@/client';
import { randomRange } from '@/utils';

export class DrunkController {
  private client: Client;
  drunk = false;
  drunkEmoteTicks = 0;
  drunkTicks = 0;

  constructor(client: Client) {
    this.client = client;
  }

  tick(): void {
    if (!this.drunk) {
      return;
    }

    this.drunkEmoteTicks = Math.max(this.drunkEmoteTicks - 1, 0);
    if (!this.drunkEmoteTicks) {
      this.client.socialController.emote(EmoteType.Drunk);
      this.drunkEmoteTicks = 10 + randomRange(0, 8) * 5;
    }

    this.drunkTicks = Math.max(this.drunkTicks - 1, 0);
    if (!this.drunkTicks) {
      this.drunk = false;
      this.drunkEmoteTicks = 0;
    }
  }
}
