import type { Vector2 } from '@/vector';

export class Rectangle {
  depth = 0;
  constructor(
    public position: Vector2,
    public width: number,
    public height: number,
  ) {}
}

type EntityRect = {
  id: number;
  rect: Rectangle;
};

type CoordsRect = {
  coords: Vector2;
  rectangle: Rectangle;
};

const characterRectangles: Map<number, Rectangle> = new Map();
const npcRectangles: Map<number, Rectangle> = new Map();
const doorRectangles: CoordsRect[] = [];
const signRectangles: CoordsRect[] = [];
const lockerRectangles: CoordsRect[] = [];
const boardRectangles: CoordsRect[] = [];
const jukeboxRectangles: CoordsRect[] = [];

function rectIntersect(a: Rectangle, b: Rectangle): boolean {
  return (
    a.position.x <= b.position.x + b.width &&
    b.position.x <= a.position.x + a.width &&
    a.position.y <= b.position.y + b.height &&
    b.position.y <= a.position.y + a.height
  );
}

function pointIntersectRect(point: Vector2, rectangle: Rectangle): boolean {
  return (
    point.x >= rectangle.position.x &&
    point.y >= rectangle.position.y &&
    point.x <= rectangle.position.x + rectangle.width &&
    point.y <= rectangle.position.y + rectangle.height
  );
}

export function setCharacterRectangle(playerId: number, rectangle: Rectangle) {
  const belowIds = [];
  characterRectangles.forEach((other, id) => {
    if (id !== playerId && rectIntersect(other, rectangle)) {
      belowIds.push(id);
    }
  });
  rectangle.depth = belowIds.length;
  characterRectangles.set(playerId, rectangle);
}

export function getCharacterRectangle(playerId: number): Rectangle | undefined {
  return characterRectangles.get(playerId);
}

export function getCharacterIntersecting(point: Vector2): EntityRect | null {
  let found = -1;
  let rect: Rectangle | null = null;
  characterRectangles.forEach((rectangle, id) => {
    if (
      pointIntersectRect(point, rectangle) &&
      (!rect || rect.depth < rectangle.depth)
    ) {
      found = id;
      rect = rectangle;
    }
  });

  if (found > -1) {
    return {
      id: found,
      rect: rect!,
    };
  }

  return null;
}

export function setNpcRectangle(index: number, rectangle: Rectangle) {
  const belowIds = [];
  npcRectangles.forEach((other, id) => {
    if (id !== index && rectIntersect(other, rectangle)) {
      belowIds.push(id);
    }
  });
  rectangle.depth = belowIds.length;
  npcRectangles.set(index, rectangle);
}

export function getNpcIntersecting(point: Vector2): EntityRect | null {
  let rect: Rectangle | null = null;
  let found = -1;
  npcRectangles.forEach((rectangle, index) => {
    if (
      pointIntersectRect(point, rectangle) &&
      (!rect || rect.depth < rectangle.depth)
    ) {
      found = index;
      rect = rectangle;
    }
  });

  if (found > -1) {
    return {
      id: found,
      rect: rect!,
    };
  }

  return null;
}

export function setDoorRectangle(coords: Vector2, rectangle: Rectangle) {
  const existing = doorRectangles.find(
    (r) => r.coords.x === coords.x && r.coords.y === coords.y,
  );
  if (existing) {
    existing.rectangle = rectangle;
    return;
  }

  doorRectangles.push({
    coords: { x: coords.x, y: coords.y },
    rectangle,
  });
}

export function getDoorIntersecting(point: Vector2): Vector2 | null {
  for (const { coords, rectangle } of doorRectangles) {
    if (pointIntersectRect(point, rectangle)) {
      return coords;
    }
  }

  return null;
}

export function setSignRectangle(coords: Vector2, rectangle: Rectangle) {
  const existing = signRectangles.find(
    (r) => r.coords.x === coords.x && r.coords.y === coords.y,
  );
  if (existing) {
    existing.rectangle = rectangle;
    return;
  }

  signRectangles.push({
    coords: { x: coords.x, y: coords.y },
    rectangle,
  });
}

export function getSignIntersecting(point: Vector2): Vector2 | null {
  for (const { coords, rectangle } of signRectangles) {
    if (pointIntersectRect(point, rectangle)) {
      return coords;
    }
  }

  return null;
}

export function setLockerRectangle(coords: Vector2, rectangle: Rectangle) {
  const existing = lockerRectangles.find(
    (r) => r.coords.x === coords.x && r.coords.y === coords.y,
  );
  if (existing) {
    existing.rectangle = rectangle;
    return;
  }

  lockerRectangles.push({
    coords: { x: coords.x, y: coords.y },
    rectangle,
  });
}

export function getLockerIntersecting(point: Vector2): Vector2 | null {
  for (const { coords, rectangle } of lockerRectangles) {
    if (pointIntersectRect(point, rectangle)) {
      return coords;
    }
  }

  return null;
}

export function setBoardRectangle(coords: Vector2, rectangle: Rectangle) {
  const existing = boardRectangles.find(
    (r) => r.coords.x === coords.x && r.coords.y === coords.y,
  );
  if (existing) {
    existing.rectangle = rectangle;
    return;
  }

  boardRectangles.push({
    coords: { x: coords.x, y: coords.y },
    rectangle,
  });
}

export function getBoardIntersecting(point: Vector2): Vector2 | null {
  for (const { coords, rectangle } of boardRectangles) {
    if (pointIntersectRect(point, rectangle)) {
      return coords;
    }
  }

  return null;
}

export function setJukeboxRectangle(coords: Vector2, rectangle: Rectangle) {
  const existing = jukeboxRectangles.find(
    (r) => r.coords.x === coords.x && r.coords.y === coords.y,
  );
  if (existing) {
    existing.rectangle = rectangle;
    return;
  }

  jukeboxRectangles.push({
    coords: { x: coords.x, y: coords.y },
    rectangle,
  });
}

export function getJukeboxIntersecting(point: Vector2): Vector2 | null {
  for (const { coords, rectangle } of jukeboxRectangles) {
    if (pointIntersectRect(point, rectangle)) {
      return coords;
    }
  }

  return null;
}

export function clearRectangles() {
  characterRectangles.clear();
  npcRectangles.clear();
  doorRectangles.splice(0, doorRectangles.length);
  signRectangles.splice(0, signRectangles.length);
  lockerRectangles.splice(0, lockerRectangles.length);
  boardRectangles.splice(0, boardRectangles.length);
  jukeboxRectangles.splice(0, jukeboxRectangles.length);
}
