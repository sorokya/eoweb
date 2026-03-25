import type { Client } from '../client';
import { CLEAR_OUT_OF_RANGE_TICKS } from '../consts';
import { inRange } from '../utils';

export class CleanupController {
  private client: Client;
  clearOutofRangeTicks = 0;

  constructor(client: Client) {
    this.client = client;
  }

  tick(): void {
    this.clearOutofRangeTicks = Math.max(this.clearOutofRangeTicks - 1, 0);
    if (!this.clearOutofRangeTicks) {
      const playerCoords = this.client.getPlayerCoords();
      this.client.nearby.characters = this.client.nearby.characters.filter(
        (c) => inRange(playerCoords, c.coords),
      );
      this.client.nearby.npcs = this.client.nearby.npcs.filter((n) =>
        inRange(playerCoords, n.coords),
      );
      this.client.nearby.items = this.client.nearby.items.filter((i) =>
        inRange(playerCoords, i.coords),
      );
      this.clearOutofRangeTicks = CLEAR_OUT_OF_RANGE_TICKS;

      if (this.client.menuPlayerId) {
        const character = this.client.getCharacterById(
          this.client.menuPlayerId,
        );
        if (!character) {
          this.client.menuPlayerId = 0;
        }
      }
    }
  }
}
