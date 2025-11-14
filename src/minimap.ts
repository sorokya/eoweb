import { Direction, MapTileSpec, NpcType } from 'eolib';
import { StaticAtlasEntryType } from './atlas';
import type { Client } from './client';
import { DEATH_TICKS } from './consts';
import { HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from './game-state';
import { CharacterDeathAnimation } from './render/character-death';
import { CharacterWalkAnimation } from './render/character-walk';
import { NpcDeathAnimation } from './render/npc-death';
import { NpcWalkAnimation } from './render/npc-walk';
import type { Vector2 } from './vector';

const TILE_WIDTH = 26;
const HALF_TILE_WIDTH = TILE_WIDTH >> 1;
const TILE_HEIGHT = 14;
const HALF_TILE_HEIGHT = TILE_HEIGHT >> 1;
const RANGE = 20;
const START_X = 80;
const WALK_WIDTH_FACTOR = HALF_TILE_WIDTH / 4;
const WALK_HEIGHT_FACTOR = HALF_TILE_HEIGHT / 4;

const WALK_OFFSETS = [
  {
    [Direction.Down]: { x: -WALK_WIDTH_FACTOR, y: WALK_HEIGHT_FACTOR },
    [Direction.Right]: { x: WALK_WIDTH_FACTOR, y: WALK_HEIGHT_FACTOR },
    [Direction.Up]: { x: WALK_WIDTH_FACTOR, y: -WALK_HEIGHT_FACTOR },
    [Direction.Left]: { x: -WALK_WIDTH_FACTOR, y: -WALK_HEIGHT_FACTOR },
  },
  {
    [Direction.Down]: { x: -WALK_WIDTH_FACTOR * 2, y: WALK_HEIGHT_FACTOR * 2 },
    [Direction.Right]: { x: WALK_WIDTH_FACTOR * 2, y: WALK_HEIGHT_FACTOR * 2 },
    [Direction.Up]: { x: WALK_WIDTH_FACTOR * 2, y: -WALK_HEIGHT_FACTOR * 2 },
    [Direction.Left]: { x: -WALK_WIDTH_FACTOR * 2, y: -WALK_HEIGHT_FACTOR * 2 },
  },
  {
    [Direction.Down]: { x: -WALK_WIDTH_FACTOR * 3, y: WALK_HEIGHT_FACTOR * 3 },
    [Direction.Right]: { x: WALK_WIDTH_FACTOR * 3, y: WALK_HEIGHT_FACTOR * 3 },
    [Direction.Up]: { x: WALK_WIDTH_FACTOR * 3, y: -WALK_HEIGHT_FACTOR * 3 },
    [Direction.Left]: { x: -WALK_WIDTH_FACTOR * 3, y: -WALK_HEIGHT_FACTOR * 3 },
  },
  {
    [Direction.Down]: { x: -WALK_WIDTH_FACTOR * 4, y: WALK_HEIGHT_FACTOR * 4 },
    [Direction.Right]: { x: WALK_WIDTH_FACTOR * 4, y: WALK_HEIGHT_FACTOR * 4 },
    [Direction.Up]: { x: WALK_WIDTH_FACTOR * 4, y: -WALK_HEIGHT_FACTOR * 4 },
    [Direction.Left]: { x: -WALK_WIDTH_FACTOR * 4, y: -WALK_HEIGHT_FACTOR * 4 },
  },
];

enum MiniMapIcon {
  Wall = 0,
  Character = 1,
  Monster = 2,
  PlayerCharacter = 3,
  Interactable = 4,
  Vendor = 5,
}

function getIconForTile(
  spec: MapTileSpec | undefined,
): MiniMapIcon | undefined {
  if (spec === undefined) {
    return;
  }

  switch (spec) {
    case MapTileSpec.Wall:
    case MapTileSpec.FakeWall:
      return MiniMapIcon.Wall;
    case MapTileSpec.BankVault:
    case MapTileSpec.Jukebox:
    case MapTileSpec.Board1:
    case MapTileSpec.Board2:
    case MapTileSpec.Board3:
    case MapTileSpec.Board4:
    case MapTileSpec.Board5:
    case MapTileSpec.Board6:
    case MapTileSpec.Board7:
    case MapTileSpec.Board8:
    case MapTileSpec.ChairAll:
    case MapTileSpec.ChairDown:
    case MapTileSpec.ChairDownRight:
    case MapTileSpec.ChairLeft:
    case MapTileSpec.ChairRight:
    case MapTileSpec.ChairUp:
    case MapTileSpec.ChairUpLeft:
    case MapTileSpec.Chest:
      return MiniMapIcon.Interactable;
  }
}

export class MinimapRenderer {
  private interpolation = 0;
  constructor(private client: Client) {}

  private interpolateWalkOffset(frame: number, direction: Direction): Vector2 {
    const prevOffset =
      frame > 0 ? WALK_OFFSETS[frame - 1][direction] : { x: 0, y: 0 };
    const walkOffset = WALK_OFFSETS[frame][direction];

    return {
      x: Math.floor(
        prevOffset.x + (walkOffset.x - prevOffset.x) * this.interpolation,
      ),
      y: Math.floor(
        prevOffset.y + (walkOffset.y - prevOffset.y) * this.interpolation,
      ),
    };
  }

  render(ctx: CanvasRenderingContext2D, interpolation: number) {
    if (!this.client.minimapEnabled) {
      return;
    }

    this.interpolation = interpolation;

    const bmp = this.client.atlas.getStaticEntry(
      StaticAtlasEntryType.MinimapIcons,
    );

    if (!bmp) {
      return;
    }

    const atlas = this.client.atlas.getAtlas(bmp.atlasIndex);
    if (!atlas) {
      return;
    }

    const player = this.client.getPlayerCoords();
    let playerScreen = isoToScreen(player);
    let mainCharacterAnimation = this.client.characterAnimations.get(
      this.client.playerId,
    );

    if (
      mainCharacterAnimation instanceof CharacterDeathAnimation &&
      mainCharacterAnimation.base
    ) {
      mainCharacterAnimation = mainCharacterAnimation.base;
    }

    if (mainCharacterAnimation instanceof CharacterWalkAnimation) {
      playerScreen = isoToScreen(mainCharacterAnimation.from);
      const walkOffset = this.interpolateWalkOffset(
        mainCharacterAnimation.animationFrame,
        mainCharacterAnimation.direction,
      );
      playerScreen.x += walkOffset.x;
      playerScreen.y += walkOffset.y;
    }

    playerScreen.x += this.client.quakeOffset;

    ctx.globalAlpha = 0.5;
    for (let y = player.y - RANGE; y <= player.y + RANGE; y++) {
      for (let x = player.x - RANGE; x <= player.x + RANGE; x++) {
        if (
          x < 0 ||
          y < 0 ||
          x >= this.client.map.width ||
          y >= this.client.map.height
        ) {
          continue;
        }

        const spec = this.client.map.tileSpecRows
          .find((r) => r.y === y)
          ?.tiles.find((t) => t.x === x);

        const hasWarp = this.client.map.warpRows.some(
          (r) => r.y === y && r.tiles.find((t) => t.x === x),
        );

        const icon = hasWarp
          ? MiniMapIcon.Interactable
          : getIconForTile(spec?.tileSpec);

        if (icon === undefined) {
          continue;
        }

        const tileScreen = isoToScreen({ x, y });
        const screenX = Math.floor(
          tileScreen.x - HALF_TILE_WIDTH - playerScreen.x + HALF_GAME_WIDTH,
        );
        const screenY = Math.floor(
          tileScreen.y - HALF_TILE_HEIGHT - playerScreen.y + HALF_GAME_HEIGHT,
        );

        const sourceX = START_X + icon * TILE_WIDTH + icon;
        ctx.drawImage(
          atlas,
          bmp.x + sourceX,
          bmp.y + 1,
          TILE_WIDTH,
          TILE_HEIGHT,
          screenX,
          screenY,
          TILE_WIDTH,
          TILE_HEIGHT,
        );
      }
    }

    for (const npc of this.client.nearby.npcs) {
      let tileScreen = isoToScreen(npc.coords);

      let dyingTicks = 0;
      let dying = false;
      let animation = this.client.npcAnimations.get(npc.index);

      if (animation instanceof NpcDeathAnimation) {
        dying = true;
        dyingTicks = animation.ticks;
        if (animation.base) {
          animation = animation.base;
        }
      }

      if (animation instanceof NpcWalkAnimation) {
        tileScreen = isoToScreen(animation.from);
        const walkOffset = dying
          ? WALK_OFFSETS[animation.animationFrame][animation.direction]
          : this.interpolateWalkOffset(
              animation.animationFrame,
              animation.direction,
            );
        tileScreen.x += walkOffset.x;
        tileScreen.y += walkOffset.y;
      }

      const screenX = Math.floor(
        tileScreen.x - HALF_TILE_WIDTH - playerScreen.x + HALF_GAME_WIDTH,
      );
      const screenY = Math.floor(
        tileScreen.y - HALF_TILE_HEIGHT - playerScreen.y + HALF_GAME_HEIGHT,
      );

      const record = this.client.getEnfRecordById(npc.id);
      if (!record) {
        continue;
      }

      let icon: MiniMapIcon;
      if ([NpcType.Passive, NpcType.Aggressive].includes(record.type)) {
        icon = MiniMapIcon.Monster;
      } else {
        icon = MiniMapIcon.Vendor;
      }

      const sourceX = START_X + icon * TILE_WIDTH + icon;

      if (dying) {
        ctx.globalAlpha = 0.5 * (dyingTicks / DEATH_TICKS);
      }

      ctx.drawImage(
        atlas,
        bmp.x + sourceX,
        bmp.y + 1,
        TILE_WIDTH,
        TILE_HEIGHT,
        screenX,
        screenY,
        TILE_WIDTH,
        TILE_HEIGHT,
      );

      if (dying) {
        ctx.globalAlpha = 0.5;
      }
    }

    for (const character of this.client.nearby.characters) {
      let dyingTicks = 0;
      let dying = false;
      let animation = this.client.characterAnimations.get(character.playerId);
      if (animation instanceof CharacterDeathAnimation) {
        dying = true;
        dyingTicks = animation.ticks;

        if (animation.base) {
          animation = animation.base;
        }
      }

      let coords: Vector2 = character.coords;
      let offset = { x: 0, y: 0 };
      if (animation instanceof CharacterWalkAnimation) {
        coords = animation.from;
        offset = dying
          ? WALK_OFFSETS[animation.animationFrame][animation.direction]
          : this.interpolateWalkOffset(
              animation.animationFrame,
              animation.direction,
            );
      }

      const tileScreen = isoToScreen(coords);
      const screenX = Math.floor(
        tileScreen.x -
          HALF_TILE_WIDTH -
          playerScreen.x +
          HALF_GAME_WIDTH +
          offset.x,
      );
      const screenY = Math.floor(
        tileScreen.y -
          HALF_TILE_HEIGHT -
          playerScreen.y +
          HALF_GAME_HEIGHT +
          offset.y,
      );

      let icon: MiniMapIcon;
      if (character.playerId === this.client.playerId) {
        icon = MiniMapIcon.PlayerCharacter;
      } else {
        icon = MiniMapIcon.Character;
      }
      const sourceX = START_X + icon * TILE_WIDTH + icon;

      if (dying) {
        ctx.globalAlpha = 0.5 * (dyingTicks / DEATH_TICKS);
      }

      ctx.drawImage(
        atlas,
        bmp.x + sourceX,
        bmp.y + 1,
        TILE_WIDTH,
        TILE_HEIGHT,
        screenX,
        screenY,
        TILE_WIDTH,
        TILE_HEIGHT,
      );

      if (dying) {
        ctx.globalAlpha = 0.5;
      }
    }

    ctx.globalAlpha = 1;
  }
}

function isoToScreen(iv: Vector2): Vector2 {
  const sx = (iv.x - iv.y) * HALF_TILE_WIDTH;
  const sy = (iv.x + iv.y) * HALF_TILE_HEIGHT;
  return { x: sx, y: sy };
}
