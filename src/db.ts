import { Ecf, Eif, Emf, Enf, EoReader, EoWriter, Esf } from 'eolib';
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import { Edf } from '@/edf';
import type { ChatChannel, ChatIcon } from '@/ui/enums';
import { padWithZeros } from '@/utils';

type PubsKey = 'eif' | 'enf' | 'ecf' | 'esf';

export type StoredChatMessage = {
  id?: number;
  characterId: number;
  channel: ChatChannel;
  name?: string;
  message: string;
  icon?: ChatIcon | null;
  timestampUtc: number;
};

interface DB extends DBSchema {
  pubs: {
    key: PubsKey;
    value: Uint8Array;
  };
  maps: {
    key: number;
    value: Uint8Array;
  };
  edfs: {
    key: number;
    value: Uint8Array;
  };
  chatMessages: {
    key: number;
    value: StoredChatMessage;
    indexes: {
      'by-char-channel': [number, string];
      'by-char': number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<DB>>;

function getDb(): Promise<IDBPDatabase<DB>> {
  if (!dbPromise) {
    dbPromise = openDB<DB>('db', 4, {
      upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1 || !db.objectStoreNames.contains('pubs')) {
          db.createObjectStore('pubs');
        }
        if (oldVersion < 1 || !db.objectStoreNames.contains('maps')) {
          db.createObjectStore('maps');
        }
        if (oldVersion < 2 || !db.objectStoreNames.contains('edfs')) {
          db.createObjectStore('edfs');
        }
        if (oldVersion < 3 || !db.objectStoreNames.contains('chatMessages')) {
          const store = db.createObjectStore('chatMessages', {
            autoIncrement: true,
          });
          store.createIndex('by-char-channel', ['characterId', 'channel']);
          store.createIndex('by-char', 'characterId');
        } else if (oldVersion < 4) {
          // v3→v4: add by-char index to existing store
          const store = tx.objectStore('chatMessages');
          if (!store.indexNames.contains('by-char')) {
            store.createIndex('by-char', 'characterId');
          }
        }
      },
    });
  }
  return dbPromise;
}

export async function saveChatMessage(msg: StoredChatMessage): Promise<void> {
  const db = await getDb();
  await db.put('chatMessages', msg);
}

export async function getChatMessages(
  characterId: number,
  channel: ChatChannel,
  limit = 200,
): Promise<StoredChatMessage[]> {
  const db = await getDb();
  const index = db.transaction('chatMessages').store.index('by-char-channel');
  const results: StoredChatMessage[] = [];
  let cursor = await index.openCursor([characterId, channel], 'prev');
  while (cursor && results.length < limit) {
    results.unshift(cursor.value);
    cursor = await cursor.continue();
  }
  return results;
}

export type PagedChatResult = {
  messages: StoredChatMessage[];
  total: number;
  totalPages: number;
};

export async function getPagedChatMessages(
  characterId: number,
  channel: ChatChannel | null,
  page: number,
  pageSize: number,
  search: string,
  sortDir: 'asc' | 'desc' = 'asc',
): Promise<PagedChatResult> {
  const db = await getDb();
  const tx = db.transaction('chatMessages', 'readonly');
  let all: StoredChatMessage[] = [];

  if (channel !== null) {
    const index = tx.store.index('by-char-channel');
    let cursor = await index.openCursor([characterId, channel], 'prev');
    while (cursor) {
      all.unshift({ ...cursor.value, id: cursor.primaryKey });
      cursor = await cursor.continue();
    }
  } else {
    const index = tx.store.index('by-char');
    let cursor = await index.openCursor(characterId, 'prev');
    while (cursor) {
      all.unshift({ ...cursor.value, id: cursor.primaryKey });
      cursor = await cursor.continue();
    }
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    all = all.filter(
      (m) =>
        m.message.toLowerCase().includes(q) ||
        (m.name?.toLowerCase().includes(q) ?? false),
    );
  }

  // sort by timestamp
  all.sort((a, b) =>
    sortDir === 'asc'
      ? a.timestampUtc - b.timestampUtc
      : b.timestampUtc - a.timestampUtc,
  );

  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return { messages: all.slice(start, start + pageSize), total, totalPages };
}

export async function getAllFilteredChatMessages(
  characterId: number,
  channel: ChatChannel | null,
  search: string,
  sortDir: 'asc' | 'desc' = 'asc',
): Promise<StoredChatMessage[]> {
  const db = await getDb();
  const tx = db.transaction('chatMessages', 'readonly');
  let all: StoredChatMessage[] = [];

  if (channel !== null) {
    const index = tx.store.index('by-char-channel');
    let cursor = await index.openCursor([characterId, channel], 'prev');
    while (cursor) {
      all.unshift({ ...cursor.value, id: cursor.primaryKey });
      cursor = await cursor.continue();
    }
  } else {
    const index = tx.store.index('by-char');
    let cursor = await index.openCursor(characterId, 'prev');
    while (cursor) {
      all.unshift({ ...cursor.value, id: cursor.primaryKey });
      cursor = await cursor.continue();
    }
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    all = all.filter(
      (m) =>
        m.message.toLowerCase().includes(q) ||
        (m.name?.toLowerCase().includes(q) ?? false),
    );
  }

  all.sort((a, b) =>
    sortDir === 'asc'
      ? a.timestampUtc - b.timestampUtc
      : b.timestampUtc - a.timestampUtc,
  );
  return all;
}

export async function deleteChatMessage(id: number): Promise<void> {
  const db = await getDb();
  await db.delete('chatMessages', id);
}

export async function deleteAllChatMessages(
  characterId: number,
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('chatMessages', 'readwrite');
  const index = tx.store.index('by-char');
  let cursor = await index.openCursor(characterId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function getEmf(id: number): Promise<Emf | null> {
  const db = await getDb();
  const buf = await db.get('maps', id);
  if (!buf) {
    return null;
  }

  const reader = new EoReader(buf);
  return Emf.deserialize(reader);
}

export function saveEmf(id: number, emf: Emf) {
  getDb().then((db) => {
    const writer = new EoWriter();
    Emf.serialize(writer, emf);
    db.put('maps', writer.toByteArray(), id);
  });
}

export async function getEdf(id: number): Promise<Edf | null> {
  const db = await getDb();
  const buf = await db.get('edfs', id);
  if (!buf) {
    const response = await fetch(`/data/dat${padWithZeros(id, 3)}.edf`);
    if (!response.ok) {
      return null;
    }

    const data = await response.arrayBuffer();
    const buf = new Uint8Array(data);

    db.put('edfs', buf, id);

    return Edf.deserialize(new Uint8Array(data));
  }

  return Edf.deserialize(buf);
}

export async function getEif(): Promise<Eif | null> {
  const db = await getDb();
  const buf = await db.get('pubs', 'eif');
  if (!buf) {
    return null;
  }

  const reader = new EoReader(buf);
  return Eif.deserialize(reader);
}

export function saveEif(eif: Eif) {
  getDb().then((db) => {
    const writer = new EoWriter();
    Eif.serialize(writer, eif);
    db.put('pubs', writer.toByteArray(), 'eif');
  });
}

export async function getEcf(): Promise<Ecf | null> {
  const db = await getDb();
  const buf = await db.get('pubs', 'ecf');
  if (!buf) {
    return null;
  }

  const reader = new EoReader(buf);
  return Ecf.deserialize(reader);
}

export function saveEcf(ecf: Ecf) {
  getDb().then((db) => {
    const writer = new EoWriter();
    Ecf.serialize(writer, ecf);
    db.put('pubs', writer.toByteArray(), 'ecf');
  });
}

export async function getEnf(): Promise<Enf | null> {
  const db = await getDb();
  const buf = await db.get('pubs', 'enf');
  if (!buf) {
    return null;
  }

  const reader = new EoReader(buf);
  return Enf.deserialize(reader);
}

export function saveEnf(enf: Enf) {
  getDb().then((db) => {
    const writer = new EoWriter();
    Enf.serialize(writer, enf);
    db.put('pubs', writer.toByteArray(), 'enf');
  });
}

export async function getEsf(): Promise<Esf | null> {
  const db = await getDb();
  const buf = await db.get('pubs', 'esf');
  if (!buf) {
    return null;
  }

  const reader = new EoReader(buf);
  return Esf.deserialize(reader);
}

export function saveEsf(esf: Esf) {
  getDb().then((db) => {
    const writer = new EoWriter();
    Esf.serialize(writer, esf);
    db.put('pubs', writer.toByteArray(), 'esf');
  });
}
