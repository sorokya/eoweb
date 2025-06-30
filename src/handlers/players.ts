import {
  type EoReader,
  PacketAction,
  PacketFamily,
  PlayersAgreeServerPacket,
  WarpEffect,
} from 'eolib';
import type { Client } from '../client';
import { playSfxById, SfxId } from '../sfx';

function handlePlayersAgree(client: Client, reader: EoReader) {
  const packet = PlayersAgreeServerPacket.deserialize(reader);
  for (const character of packet.nearby.characters) {
    const index = client.nearby.characters.findIndex(
      (c) => c.playerId === character.playerId,
    );

    switch (character.warpEffect) {
      case WarpEffect.Admin:
        // TODO: warp animation
        playSfxById(SfxId.AdminWarp);
        break;
      case WarpEffect.Scroll:
        playSfxById(SfxId.ScrollTeleport);
        break;
    }

    if (index > -1) {
      client.nearby.characters[index] = character;
    } else {
      client.nearby.characters.push(character);
    }
  }
}

export function registerPlayersHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Players,
    PacketAction.Agree,
    (reader) => handlePlayersAgree(client, reader),
  );
}
