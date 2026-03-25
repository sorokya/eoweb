import {
  AttackUseClientPacket,
  Coords,
  type Direction,
  Emote as EmoteType,
  FacePlayerClientPacket,
  MapTileSpec,
  SitAction,
  SitRequestClientPacket,
  WalkAction,
  WalkAdminClientPacket,
  WalkPlayerClientPacket,
} from 'eolib';

import type { Client } from '../client';
import { INITIAL_IDLE_TICKS } from '../consts';
import { EffectAnimation, EffectTargetCharacter, Emote } from '../render';
import { playSfxById } from '../sfx';
import { SfxId } from '../types';
import { randomRange } from '../utils';
import type { Vector2 } from '../vector';

export class MovementController {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  face(direction: Direction): void {
    const packet = new FacePlayerClientPacket();
    packet.direction = direction;
    this.client.bus!.send(packet);
    this.client.idleTicks = INITIAL_IDLE_TICKS;
  }

  walk(direction: Direction, coords: Vector2, timestamp: number): void {
    const packet = this.client.nowall
      ? new WalkAdminClientPacket()
      : new WalkPlayerClientPacket();

    if (this.client.nowall) {
      playSfxById(SfxId.GhostPlayer);
    }

    const spec = this.client
      .map!.tileSpecRows.find((r) => r.y === coords.y)
      ?.tiles.find((t) => t.x === coords.x);

    if (spec && spec.tileSpec === MapTileSpec.Water) {
      const metadata = this.client.getEffectMetadata(9);
      playSfxById(metadata.sfx);
      this.client.effects.push(
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
    this.client.idleTicks = INITIAL_IDLE_TICKS;
    this.client.audioController.setAmbientVolume();
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
      this.client.characterEmotes.set(
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
      this.client.effects.push(
        new EffectAnimation(
          9,
          new EffectTargetCharacter(this.client.playerId),
          metadata,
        ),
      );
    }
    this.client.idleTicks = INITIAL_IDLE_TICKS;
  }

  sit(): void {
    const packet = new SitRequestClientPacket();
    packet.sitAction = SitAction.Sit;
    packet.sitActionData = new SitRequestClientPacket.SitActionDataSit();
    packet.sitActionData.cursorCoords = new Coords();
    packet.sitActionData.cursorCoords.x = 0;
    packet.sitActionData.cursorCoords.y = 0;
    this.client.bus!.send(packet);
    this.client.idleTicks = INITIAL_IDLE_TICKS;
  }

  stand(): void {
    const packet = new SitRequestClientPacket();
    packet.sitAction = SitAction.Stand;
    this.client.bus!.send(packet);
    this.client.idleTicks = INITIAL_IDLE_TICKS;
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
