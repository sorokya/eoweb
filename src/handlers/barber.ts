import {
  type AvatarChange,
  AvatarChangeType,
  BarberAgreeServerPacket,
  BarberOpenServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '@/client';
import { GOLD_ITEM_ID } from '@/consts';
import { SfxId } from '@/sfx';

function handleBarberOpen(client: Client, reader: EoReader) {
  const packet = BarberOpenServerPacket.deserialize(reader);
  client.barberController.notifyOpened(packet.sessionId);
}

function handleBarberAgree(client: Client, reader: EoReader) {
  const packet = BarberAgreeServerPacket.deserialize(reader);

  client.inventoryController.setItem(GOLD_ITEM_ID, packet.goldAmount);

  const character = client.getCharacterById(packet.change.playerId);
  if (character) {
    switch (packet.change.changeType) {
      case AvatarChangeType.Hair: {
        const data = packet.change
          .changeTypeData as AvatarChange.ChangeTypeDataHair;
        character.hairStyle = data.hairStyle;
        character.hairColor = data.hairColor;
        break;
      }
      case AvatarChangeType.HairColor: {
        const data = packet.change
          .changeTypeData as AvatarChange.ChangeTypeDataHairColor;
        character.hairColor = data.hairColor;
        break;
      }
    }
    client.atlas.refresh();
  }

  client.barberController.notifyPurchased();
  client.audioController.playById(SfxId.BuySell);
}

export function registerBarberHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Barber,
    PacketAction.Open,
    (reader) => handleBarberOpen(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Barber,
    PacketAction.Agree,
    (reader) => handleBarberAgree(client, reader),
  );
}
