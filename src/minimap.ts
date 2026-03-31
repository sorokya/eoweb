import { Direction, MapTileSpec, NpcType } from 'eolib';
import { Sprite } from 'pixi.js';
import { StaticAtlasEntryType } from './atlas';
import type { Client } from './client';
import { DEATH_TICKS } from './consts';
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
  private spritePool: Sprite[] = [];
  private spriteHead = 0;
  constructor(private client: Client) {}

  private acquireSprite(): Sprite {
    if (this.spriteHead < this.spritePool.length) {
      const s = this.spritePool[this.spriteHead++];
      s.alpha = 1;
      s.visible = true;
      return s;
    }
    const s = new Sprite();
    s.eventMode = 'none';
    this.spritePool.push(s);
    this.spriteHead++;
    return s;
  }

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

  update(interpolation: number) {
    this.client.minimapContainer.removeChildren();
    this.spriteHead = 0;

    if (!this.client.minimapEnabled) {
      return;
    }

    this.interpolation = interpolation;

    const bmp = this.client.atlas.getStaticEntry(
      StaticAtlasEntryType.MinimapIcons,
    );
    if (!bmp) return;

    const player = this.client.getPlayerCoords();
    let playerScreen = isoToScreen(player);
    let mainCharacterAnimation =
      this.client.animationController.characterAnimations.get(
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

    playerScreen.x += this.client.quakeController.quakeOffset;

    const halfGameWidth = this.client.viewportController.getHalfGameWidth();
    const halfGameHeight = this.client.viewportController.getHalfGameHeight();

    const addIcon = (
      icon: MiniMapIcon,
      screenX: number,
      screenY: number,
      alpha = 0.5,
    ) => {
      const sourceX = START_X + icon * TILE_WIDTH + icon;
      const texture = this.client.atlas.getFrameTexture({
        atlasIndex: bmp.atlasIndex,
        x: bmp.x + sourceX,
        y: bmp.y + 1,
        w: TILE_WIDTH,
        h: TILE_HEIGHT,
      });
      if (!texture) return;
      const sprite = this.acquireSprite();
      sprite.texture = texture;
      sprite.position.set(screenX, screenY);
      sprite.alpha = alpha;
      this.client.minimapContainer.addChild(sprite);
    };

    for (let y = player.y - RANGE; y <= player.y + RANGE; y++) {
      for (let x = player.x - RANGE; x <= player.x + RANGE; x++) {
        if (
          x < 0 ||
          y < 0 ||
          x >= this.client.map!.width ||
          y >= this.client.map!.height
        ) {
          continue;
        }

        const spec = this.client
          .map!.tileSpecRows.find((r) => r.y === y)
          ?.tiles.find((t) => t.x === x);

        const hasWarp = this.client.map!.warpRows.some(
          (r) => r.y === y && r.tiles.find((t) => t.x === x),
        );

        const icon = hasWarp
          ? MiniMapIcon.Interactable
          : getIconForTile(spec?.tileSpec);

        if (icon === undefined) continue;

        const tileScreen = isoToScreen({ x, y });
        const screenX = Math.floor(
          tileScreen.x - HALF_TILE_WIDTH - playerScreen.x + halfGameWidth,
        );
        const screenY = Math.floor(
          tileScreen.y - HALF_TILE_HEIGHT - playerScreen.y + halfGameHeight,
        );
        addIcon(icon, screenX, screenY);
      }
    }

    for (const npc of this.client.nearby.npcs) {
      let tileScreen = isoToScreen(npc.coords);
      let dyingTicks = 0;
      let dying = false;
      let animation = this.client.animationController.npcAnimations.get(
        npc.index,
      );

      if (animation instanceof NpcDeathAnimation) {
        dying = true;
        dyingTicks = animation.ticks;
        if (animation.base) animation = animation.base;
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
        tileScreen.x - HALF_TILE_WIDTH - playerScreen.x + halfGameWidth,
      );
      const screenY = Math.floor(
        tileScreen.y - HALF_TILE_HEIGHT - playerScreen.y + halfGameHeight,
      );

      const record = this.client.getEnfRecordById(npc.id);
      if (!record) continue;

      const icon = [NpcType.Passive, NpcType.Aggressive].includes(record.type)
        ? MiniMapIcon.Monster
        : MiniMapIcon.Vendor;

      addIcon(
        icon,
        screenX,
        screenY,
        dying ? 0.5 * (dyingTicks / DEATH_TICKS) : 0.5,
      );
    }

    for (const character of this.client.nearby.characters) {
      let dyingTicks = 0;
      let dying = false;
      let animation = this.client.animationController.characterAnimations.get(
        character.playerId,
      );
      if (animation instanceof CharacterDeathAnimation) {
        dying = true;
        dyingTicks = animation.ticks;
        if (animation.base) animation = animation.base;
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
          halfGameWidth +
          offset.x,
      );
      const screenY = Math.floor(
        tileScreen.y -
          HALF_TILE_HEIGHT -
          playerScreen.y +
          halfGameHeight +
          offset.y,
      );

      const icon =
        character.playerId === this.client.playerId
          ? MiniMapIcon.PlayerCharacter
          : MiniMapIcon.Character;

      addIcon(
        icon,
        screenX,
        screenY,
        dying ? 0.5 * (dyingTicks / DEATH_TICKS) : 0.5,
      );
    }
  }
}

function isoToScreen(iv: Vector2): Vector2 {
  const sx = (iv.x - iv.y) * HALF_TILE_WIDTH;
  const sy = (iv.x + iv.y) * HALF_TILE_HEIGHT;
  return { x: sx, y: sy };
}
