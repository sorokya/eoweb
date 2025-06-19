import type { Vector2 } from './vector';

type Rectangle = {
  position: Vector2;
  width: number;
  height: number;
};

type EntityRect = {
  id: number;
  rect: Rectangle;
};

const characterRectangles: Map<number, Rectangle> = new Map();
const npcRectangles: Map<number, Rectangle> = new Map();

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
  characterRectangles.set(playerId, rectangle);
  for (const id of belowIds) {
    characterRectangles.delete(id);
  }
}

export function forEachCharacterRect(
  callback: (rectangle: Rectangle, id: number) => undefined,
) {
  characterRectangles.forEach(callback);
}

export function getCharacterIntersecting(point: Vector2): EntityRect | null {
  let found = -1;
  let rect = null;
  characterRectangles.forEach((rectangle, id) => {
    if (pointIntersectRect(point, rectangle)) {
      found = id;
      rect = rectangle;
      return false;
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
  npcRectangles.set(index, rectangle);
  for (const id of belowIds) {
    npcRectangles.delete(id);
  }
}

export function getNpcIntersecting(point: Vector2): EntityRect | null {
  let rect = null;
  let found = -1;
  npcRectangles.forEach((rectangle, index) => {
    if (pointIntersectRect(point, rectangle)) {
      found = index;
      rect = rectangle;
      return false;
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

export function clearRectangles() {
  characterRectangles.clear();
  npcRectangles.clear();
}
