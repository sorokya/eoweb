import {
  type EoReader,
  PacketAction,
  PacketFamily,
  PlayersAgreeServerPacket,
  PlayersPingServerPacket,
  PlayersPongServerPacket,
  WarpEffect,
} from 'eolib';
import type { Client } from '@/client';
import { ADMIN_WARP_ENTER_EFFECT_ID } from '@/consts';
import { EOResourceID } from '@/edf';
import { EffectAnimation, EffectTargetCharacter } from '@/render';
import { SfxId } from '@/sfx';

function handlePlayersAgree(client: Client, reader: EoReader) {
  const packet = PlayersAgreeServerPacket.deserialize(reader);
  for (const character of packet.nearby.characters) {
    const index = client.nearby.characters.findIndex(
      (c) => c.playerId === character.playerId,
    );

    switch (character.warpEffect) {
      case WarpEffect.Admin: {
        const metadata = client.getEffectMetadata(ADMIN_WARP_ENTER_EFFECT_ID);
        client.animationController.effects.push(
          new EffectAnimation(
            ADMIN_WARP_ENTER_EFFECT_ID,
            new EffectTargetCharacter(character.playerId),
            metadata,
          ),
        );
        client.audioController.playAtPosition(
          SfxId.AdminWarp,
          character.coords,
        );
        break;
      }
      case WarpEffect.Scroll:
        client.audioController.playAtPosition(
          SfxId.ScrollTeleport,
          character.coords,
        );
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

function handlePlayersPing(client: Client, reader: EoReader) {
  const packet = PlayersPingServerPacket.deserialize(reader);
  client.emit('serverChat', {
    message: `${packet.name} ${client.getResourceString(EOResourceID.STATUS_LABEL_IS_ONLINE_NOT_FOUND)}`,
  });
}

function handlePlayersPong(client: Client, reader: EoReader) {
  const packet = PlayersPongServerPacket.deserialize(reader);
  client.emit('serverChat', {
    message: `${packet.name} ${client.getResourceString(EOResourceID.STATUS_LABEL_IS_ONLINE_SAME_MAP)}`,
  });
}

function handlePlayersNet242(client: Client, reader: EoReader) {
  const packet = PlayersPongServerPacket.deserialize(reader);
  client.emit('serverChat', {
    message: `${packet.name} ${client.getResourceString(EOResourceID.STATUS_LABEL_IS_ONLINE_IN_THIS_WORLD)}`,
  });
}

export function registerPlayersHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Players,
    PacketAction.Agree,
    (reader) => handlePlayersAgree(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Players,
    PacketAction.Ping,
    (reader) => handlePlayersPing(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Players,
    PacketAction.Pong,
    (reader) => handlePlayersPong(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Players,
    PacketAction.Net242,
    (reader) => handlePlayersNet242(client, reader),
  );
}
