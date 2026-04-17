import {
  AttackUseClientPacket,
  Coords,
  Direction,
  Emote as EmoteType,
  FacePlayerClientPacket,
  MapTileSpec,
  SitAction,
  SitRequestClientPacket,
  WalkAction,
  WalkAdminClientPacket,
  WalkPlayerClientPacket,
} from 'eolib';

import type { Client } from '@/client';
import { INITIAL_IDLE_TICKS } from '@/consts';
import {
  CharacterWalkAnimation,
  EffectAnimation,
  EffectTargetCharacter,
  Emote,
} from '@/render';
import { playSfxById, SfxId } from '@/sfx';
import { randomRange } from '@/utils';
import type { Vector2 } from '@/vector';

type WalkedSubscriber = () => void;

export class MovementController {
  private client: Client;
  autoWalkPath: Vector2[] = [];

  private walkedSubscribers: WalkedSubscriber[] = [];

  constructor(client: Client) {
    this.client = client;
  }

  subscribeWalked(cb: WalkedSubscriber): void {
    this.walkedSubscribers.push(cb);
  }

  unsubscribeWalked(cb: WalkedSubscriber): void {
    this.walkedSubscribers = this.walkedSubscribers.filter((s) => s !== cb);
  }

  private notifyWalked(): void {
    for (const cb of this.walkedSubscribers) cb();
  }

  face(direction: Direction): void {
    const packet = new FacePlayerClientPacket();
    packet.direction = direction;
    this.client.bus!.send(packet);
    this.client.usageController.idleTicks = INITIAL_IDLE_TICKS;
  }

  walk(direction: Direction, coords: Vector2, timestamp: number): void {
    const packet = this.client.commandController.nowall
      ? new WalkAdminClientPacket()
      : new WalkPlayerClientPacket();

    if (this.client.commandController.nowall) {
      playSfxById(SfxId.GhostPlayer);
    }

    const spec = this.client
      .map!.tileSpecRows.find((r) => r.y === coords.y)
      ?.tiles.find((t) => t.x === coords.x);

    if (spec && spec.tileSpec === MapTileSpec.Water) {
      const metadata = this.client.getEffectMetadata(9);
      playSfxById(metadata.sfx);
      this.client.animationController.effects.push(
        new EffectAnimation(
          9,
          new EffectTargetCharacter(this.client.playerId),
          metadata,
        ),
      );
    }

    packet.walkAction = new WalkAction();
    packet.walkAction.direction = direction;
    packet.walkAction.coords = new Coords();
    packet.walkAction.coords.x = coords.x;
    packet.walkAction.coords.y = coords.y;
    packet.walkAction.timestamp = timestamp;
    this.client.bus!.send(packet);
    this.client.usageController.idleTicks = INITIAL_IDLE_TICKS;
    this.client.audioController.updateListenerPosition(coords);
    this.notifyWalked();
  }

  attack(direction: Direction, timestamp: number): void {
    const packet = new AttackUseClientPacket();
    packet.direction = direction;
    packet.timestamp = timestamp;
    this.client.bus!.send(packet);

    const player = this.client.getPlayerCharacter();
    const metadata = this.client.getWeaponMetadata(player!.equipment.weapon!);
    const index = randomRange(0, metadata.sfx.length - 1);
    playSfxById(metadata.sfx[index]);

    if (metadata.sfx[0] === SfxId.Harp1 || metadata.sfx[0] === SfxId.Guitar1) {
      this.client.animationController.characterEmotes.set(
        this.client.playerId,
        new Emote(EmoteType.Playful + 1),
      );
    }

    const spec = this.client
      .map!.tileSpecRows.find((r) => r.y === player!.coords.y!)
      ?.tiles.find((t) => t.x === player!.coords.x!);

    if (spec && spec.tileSpec === MapTileSpec.Water) {
      const metadata = this.client.getEffectMetadata(9);
      playSfxById(metadata.sfx);
      this.client.animationController.effects.push(
        new EffectAnimation(
          9,
          new EffectTargetCharacter(this.client.playerId),
          metadata,
        ),
      );
    }
    this.client.usageController.idleTicks = INITIAL_IDLE_TICKS;
  }

  sit(): void {
    playSfxById(SfxId.Sit);
    const packet = new SitRequestClientPacket();
    packet.sitAction = SitAction.Sit;
    packet.sitActionData = new SitRequestClientPacket.SitActionDataSit();
    packet.sitActionData.cursorCoords = new Coords();
    packet.sitActionData.cursorCoords.x = 0;
    packet.sitActionData.cursorCoords.y = 0;
    this.client.bus!.send(packet);
    this.client.usageController.idleTicks = INITIAL_IDLE_TICKS;
  }

  stand(): void {
    const packet = new SitRequestClientPacket();
    packet.sitAction = SitAction.Stand;
    this.client.bus!.send(packet);
    this.client.usageController.idleTicks = INITIAL_IDLE_TICKS;
  }

  tick(): void {
    if (!this.autoWalkPath.length) {
      return;
    }

    const animation = this.client.animationController.characterAnimations.get(
      this.client.playerId,
    );
    if (animation instanceof CharacterWalkAnimation) {
      return;
    }

    const current = this.client.getPlayerCoords();
    const character = this.client.getPlayerCharacter();
    const next = this.autoWalkPath.splice(0, 1)[0];

    if (!this.client.mapController.canWalk(next, true)) {
      this.autoWalkPath = [];
      return;
    }

    const diffX = next.x - current.x;
    const diffY = next.y - current.y;
    let direction: Direction;
    if (Math.abs(diffX) > Math.abs(diffY)) {
      direction = diffX > 0 ? Direction.Right : Direction.Left;
    } else {
      direction = diffY > 0 ? Direction.Down : Direction.Up;
    }
    this.client.animationController.characterAnimations.set(
      this.client.playerId,
      new CharacterWalkAnimation(current, next, direction),
    );
    character!.coords.x = next.x;
    character!.coords.y = next.y;
    character!.direction = direction;
    this.walk(direction, next, getTimestamp());
  }
}

export function getTimestamp(): number {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  const millisecond = now.getMilliseconds();
  const ms = Math.floor(millisecond);

  return hour * 360000 + minute * 6000 + second * 100 + Math.floor(ms / 10);
}
