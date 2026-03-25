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

export function face(client: Client, direction: Direction): void {
  const packet = new FacePlayerClientPacket();
  packet.direction = direction;
  client.bus!.send(packet);
  client.idleTicks = INITIAL_IDLE_TICKS;
}

export function walk(
  client: Client,
  direction: Direction,
  coords: Vector2,
  timestamp: number,
): void {
  const packet = client.nowall
    ? new WalkAdminClientPacket()
    : new WalkPlayerClientPacket();

  if (client.nowall) {
    playSfxById(SfxId.GhostPlayer);
  }

  const spec = client
    .map!.tileSpecRows.find((r) => r.y === coords.y)
    ?.tiles.find((t) => t.x === coords.x);

  if (spec && spec.tileSpec === MapTileSpec.Water) {
    const metadata = client.getEffectMetadata(9);
    playSfxById(metadata.sfx);
    client.effects.push(
      new EffectAnimation(
        9,
        new EffectTargetCharacter(client.playerId),
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
  client.bus!.send(packet);
  client.idleTicks = INITIAL_IDLE_TICKS;
  client.setAmbientVolume();
}

export function attack(
  client: Client,
  direction: Direction,
  timestamp: number,
): void {
  const packet = new AttackUseClientPacket();
  packet.direction = direction;
  packet.timestamp = timestamp;
  client.bus!.send(packet);

  const player = client.getPlayerCharacter();
  const metadata = client.getWeaponMetadata(player!.equipment.weapon!);
  const index = randomRange(0, metadata.sfx.length - 1);
  playSfxById(metadata.sfx[index]);

  if (metadata.sfx[0] === SfxId.Harp1 || metadata.sfx[0] === SfxId.Guitar1) {
    client.characterEmotes.set(
      client.playerId,
      new Emote(EmoteType.Playful + 1),
    );
  }

  const spec = client
    .map!.tileSpecRows.find((r) => r.y === player!.coords.y!)
    ?.tiles.find((t) => t.x === player!.coords.x!);

  if (spec && spec.tileSpec === MapTileSpec.Water) {
    const metadata = client.getEffectMetadata(9);
    playSfxById(metadata.sfx);
    client.effects.push(
      new EffectAnimation(
        9,
        new EffectTargetCharacter(client.playerId),
        metadata,
      ),
    );
  }
  client.idleTicks = INITIAL_IDLE_TICKS;
}

export function sit(client: Client): void {
  const packet = new SitRequestClientPacket();
  packet.sitAction = SitAction.Sit;
  packet.sitActionData = new SitRequestClientPacket.SitActionDataSit();
  packet.sitActionData.cursorCoords = new Coords();
  packet.sitActionData.cursorCoords.x = 0;
  packet.sitActionData.cursorCoords.y = 0;
  client.bus!.send(packet);
  client.idleTicks = INITIAL_IDLE_TICKS;
}

export function stand(client: Client): void {
  const packet = new SitRequestClientPacket();
  packet.sitAction = SitAction.Stand;
  client.bus!.send(packet);
  client.idleTicks = INITIAL_IDLE_TICKS;
}
