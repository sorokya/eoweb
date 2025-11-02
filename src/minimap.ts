import { MapTileSpec, NpcType } from 'eolib';
import { StaticAtlasEntryType } from './atlas';
import type { Client } from './client';
import {
  DEATH_TICKS,
  WALK_HEIGHT_FACTOR as ORIGINAL_WALK_HEIGHT_FACTOR,
  WALK_WIDTH_FACTOR as ORIGINAL_WALK_WIDTH_FACTOR,
} from './consts';
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
  constructor(private client: Client) {}

  render(ctx: CanvasRenderingContext2D) {
    if (!this.client.minimapEnabled) {
      return;
    }

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
      playerScreen.x +=
        (mainCharacterAnimation.walkOffset.x / ORIGINAL_WALK_WIDTH_FACTOR) *
        WALK_WIDTH_FACTOR;
      playerScreen.y +=
        (mainCharacterAnimation.walkOffset.y / ORIGINAL_WALK_HEIGHT_FACTOR) *
        WALK_HEIGHT_FACTOR;
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
        tileScreen.x +=
          (animation.walkOffset.x / ORIGINAL_WALK_WIDTH_FACTOR) *
          WALK_WIDTH_FACTOR;
        tileScreen.y +=
          (animation.walkOffset.y / ORIGINAL_WALK_HEIGHT_FACTOR) *
          WALK_HEIGHT_FACTOR;
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
      const offset = { x: 0, y: 0 };
      if (animation instanceof CharacterWalkAnimation) {
        coords = animation.from;
        offset.x =
          (animation.walkOffset.x / ORIGINAL_WALK_WIDTH_FACTOR) *
          WALK_WIDTH_FACTOR;
        offset.y =
          (animation.walkOffset.y / ORIGINAL_WALK_HEIGHT_FACTOR) *
          WALK_HEIGHT_FACTOR;
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
