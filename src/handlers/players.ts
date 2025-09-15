import {
  type EoReader,
  PacketAction,
  PacketFamily,
  PlayersAgreeServerPacket,
  WarpEffect,
} from 'eolib';
import type { Client } from '../client';
import { EffectAnimation, EffectTargetCharacter } from '../render/effect';
import { playSfxById, SfxId } from '../sfx';

function handlePlayersAgree(client: Client, reader: EoReader) {
  const packet = PlayersAgreeServerPacket.deserialize(reader);
  for (const character of packet.nearby.characters) {
    const index = client.nearby.characters.findIndex(
      (c) => c.playerId === character.playerId,
    );

    switch (character.warpEffect) {
      case WarpEffect.Admin: {
        const metadata = client.getEffectMetadata(4);
        client.effects.push(
          new EffectAnimation(
            4,
            new EffectTargetCharacter(character.playerId),
            metadata,
          ),
        );
        playSfxById(SfxId.AdminWarp);
        break;
      }
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

  client.atlas.refresh();
}

export function registerPlayersHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Players,
    PacketAction.Agree,
    (reader) => handlePlayersAgree(client, reader),
  );
}
