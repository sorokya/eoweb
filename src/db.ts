import { Ecf, Eif, Emf, Enf, EoReader, EoWriter, Esf } from 'eolib';
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import { Edf } from './edf';
import { padWithZeros } from './utils/pad-with-zeros';

type PubsKey = 'eif' | 'enf' | 'ecf' | 'esf';

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
}

let dbPromise: Promise<IDBPDatabase<DB>>;

function getDb(): Promise<IDBPDatabase<DB>> {
  if (!dbPromise) {
    dbPromise = openDB<DB>('db', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pubs')) {
          db.createObjectStore('pubs');
        }
        if (!db.objectStoreNames.contains('maps')) {
          db.createObjectStore('maps');
        }
        if (!db.objectStoreNames.contains('edfs')) {
          db.createObjectStore('edfs');
        }
      },
    });
  }
  return dbPromise;
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
