import * as eolib from 'eolib';
import { EoReader, PacketAction, PacketFamily } from 'eolib';

export type PacketLogEntry = {
  id: number;
  source: 'client' | 'server';
  family: PacketFamily;
  action: PacketAction;
  timestamp: Date;
  /**
   * Full display bytes for binary view.
   * Client: [action, family, seq_byte(s), ...payload] pre-encryption.
   * Server: [action, family, ...payload] post-decryption.
   */
  rawBytes: Uint8Array;
  /** Clean payload bytes only — sequence stripped, used for JSON deserialization. */
  payload: Uint8Array;
};

const SENSITIVE_PACKETS: Array<{
  family: PacketFamily;
  action: PacketAction;
}> = [
  { family: PacketFamily.Login, action: PacketAction.Request }, // LoginRequestClientPacket
];

export function isSensitivePacket(entry: PacketLogEntry): boolean {
  return SENSITIVE_PACKETS.some(
    (s) => s.family === entry.family && s.action === entry.action,
  );
}

// --- Packet class registry built from eolib exports ---

type PacketClass = {
  family: PacketFamily;
  action: PacketAction;
  deserialize(reader: EoReader): unknown;
};

function buildRegistry(suffix: string): Map<string, PacketClass> {
  const map = new Map<string, PacketClass>();
  for (const [name, cls] of Object.entries(eolib)) {
    if (
      name.endsWith(suffix) &&
      typeof cls === 'function' &&
      'family' in cls &&
      'action' in cls &&
      'deserialize' in cls
    ) {
      const typedCls = cls as unknown as PacketClass;
      map.set(`${typedCls.family}_${typedCls.action}`, typedCls);
    }
  }
  return map;
}

const SERVER_REGISTRY = buildRegistry('ServerPacket');
const CLIENT_REGISTRY = buildRegistry('ClientPacket');

function toJsonSafe(val: unknown): unknown {
  if (val instanceof Uint8Array || ArrayBuffer.isView(val)) {
    return Array.from(val as Uint8Array);
  }
  if (Array.isArray(val)) return val.map(toJsonSafe);
  if (val !== null && typeof val === 'object') {
    return Object.fromEntries(
      Object.entries(val as Record<string, unknown>).map(([k, v]) => [
        k,
        toJsonSafe(v),
      ]),
    );
  }
  return val;
}

export function parsePacketToJson(entry: PacketLogEntry): string | null {
  const key = `${entry.family}_${entry.action}`;
  const registry =
    entry.source === 'server' ? SERVER_REGISTRY : CLIENT_REGISTRY;
  const cls = registry.get(key);
  if (!cls) return null;
  try {
    const reader = new EoReader(entry.payload);
    const packet = cls.deserialize(reader);
    return JSON.stringify(toJsonSafe(packet), null, 2);
  } catch {
    return null;
  }
}

// --- Store ---

const MAX_LOG_ENTRIES = 100;
let nextId = 0;

export class PacketLogStore {
  private entries: PacketLogEntry[] = [];
  private listeners = new Set<() => void>();

  addEntry(entry: Omit<PacketLogEntry, 'id'>) {
    if (this.entries.length >= MAX_LOG_ENTRIES) {
      this.entries.shift();
    }
    this.entries.push({ ...entry, id: nextId++ });
    this.notify();
  }

  getEntries(): readonly PacketLogEntry[] {
    return this.entries;
  }

  clear() {
    this.entries = [];
    this.notify();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
  }

  unsubscribe(listener: () => void) {
    this.listeners.delete(listener);
  }

  private notify() {
    for (const l of this.listeners) l();
  }
}
