import type { Coords } from 'eolib';
import type { Vector2 } from './vector';

export class Rectangle {
  depth = 0;
  constructor(
    public position: Vector2,
    public width: number,
    public height: number,
  ) {}
};

type EntityRect = {
  id: number;
  rect: Rectangle;
};

const characterRectangles: Map<number, Rectangle> = new Map();
const npcRectangles: Map<number, Rectangle> = new Map();
const doorRectangles: Map<Coords, Rectangle> = new Map();

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
      rect,
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

export function getNpcRectangle(index: number): Rectangle | undefined {
  return npcRectangles.get(index);
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
      rect,
    };
  }

  return null;
}

export function setDoorRectangle(coords: Coords, rectangle: Rectangle) {
  doorRectangles.set(coords, rectangle);
}

export function getDoorRectangle(coords: Coords): Rectangle | undefined {
  return doorRectangles.get(coords);
}

export function getDoorIntersecting(point: Vector2): Coords | null {
  for (const [coords, rectangle] of doorRectangles) {
    if (pointIntersectRect(point, rectangle)) {
      return coords;
    }
  }

  return null;
}

export function clearRectangles() {
  characterRectangles.clear();
  npcRectangles.clear();
  doorRectangles.clear();
}
