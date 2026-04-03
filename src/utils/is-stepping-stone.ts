import { type Emf, MapTileSpec } from 'eolib';
import type { Vector2 } from '@/vector';

function getTileSpec(map: Emf, coords: Vector2): MapTileSpec | null {
  const row = map.tileSpecRows.find((r) => r.y === coords.y);
  return row?.tiles.find((t) => t.x === coords.x)?.tileSpec ?? null;
}

export function isSteppingStoneWalk(
  map: Emf,
  from: Vector2,
  to: Vector2,
): boolean {
  return (
    getTileSpec(map, from) === MapTileSpec.Jump ||
    getTileSpec(map, to) === MapTileSpec.Jump
  );
}
