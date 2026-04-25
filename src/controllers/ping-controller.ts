import { MessagePingClientPacket } from 'eolib';
import type { Client } from '@/client';

const MAX_PING_HISTORY = 100;
const PING_RATE = 17; // 2.04 seconds

export class PingController {
  private pingStart = 0;
  pingHistory: number[] = [];
  minPing = 0;
  maxPing = 0;
  avgPing = 0;
  private packet = new MessagePingClientPacket();
  private ticks = 0;
  private listeners = new Set<() => void>();

  constructor(private client: Client) {}

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  tick() {
    this.ticks = Math.max(0, this.ticks - 1);
    if (this.ticks === 0) {
      this.sendPing();
      this.ticks = PING_RATE;
    }
  }

  private sendPing() {
    this.pingStart = Date.now();
    this.client.bus!.send(this.packet);
  }

  notifyPong() {
    const delta = Date.now() - this.pingStart;
    this.pingHistory.push(delta);
    if (this.pingHistory.length > MAX_PING_HISTORY) {
      this.pingHistory.shift();
    }
    this.minPing = Math.min(...this.pingHistory);
    this.maxPing = Math.max(...this.pingHistory);
    this.avgPing = Math.floor(
      this.pingHistory.reduce((a, b) => a + b, 0) / this.pingHistory.length,
    );
    for (const cb of this.listeners) cb();
  }
}
