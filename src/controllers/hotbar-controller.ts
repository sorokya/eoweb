import type { Client } from '@/client';
import { type ISlot, SlotType } from '@/ui/enums';

const SLOT_COUNT = 6;
const EMPTY_SLOT: ISlot = { type: SlotType.Empty, typeId: 0 };

function storageKey(characterName: string): string {
  return `eoweb:hotbar-slots:${characterName}`;
}

export class HotbarController {
  private client: Client;
  private subscribers: (() => void)[] = [];

  constructor(client: Client) {
    this.client = client;
  }

  load(characterName: string): void {
    const key = storageKey(characterName);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as ISlot[];
        if (Array.isArray(parsed)) {
          this.client.hotbarSlots = Array.from(
            { length: SLOT_COUNT },
            (_, i) => parsed[i] ?? { ...EMPTY_SLOT },
          );
          this.notifySubscribers();
          return;
        }
      }
    } catch {
      // ignore
    }
    this.client.hotbarSlots = Array.from({ length: SLOT_COUNT }, () => ({
      ...EMPTY_SLOT,
    }));
    this.notifySubscribers();
  }

  setSlot(index: number, slot: ISlot): void {
    const next = [...this.client.hotbarSlots];
    next[index] = slot;
    this.client.hotbarSlots = next;
    this.save(next);
    this.notifySubscribers();
  }

  clearSlot(index: number): void {
    const next = [...this.client.hotbarSlots];
    next[index] = { ...EMPTY_SLOT };
    this.client.hotbarSlots = next;
    this.save(next);
    this.notifySubscribers();
  }

  private save(slots: ISlot[]): void {
    const key = storageKey(this.client.name);
    try {
      localStorage.setItem(key, JSON.stringify(slots));
    } catch {
      // ignore
    }
  }

  subscribe(fn: () => void): () => void {
    this.subscribers.push(fn);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== fn);
    };
  }

  private notifySubscribers(): void {
    for (const fn of this.subscribers) {
      fn();
    }
  }
}
