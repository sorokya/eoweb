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
import { playSfxById, SfxId } from '@/sfx';

function handleBarberOpen(client: Client, reader: EoReader) {
  const packet = BarberOpenServerPacket.deserialize(reader);
  client.sessionId = packet.sessionId;
  client.emit('barberOpened', undefined);
}

function handleBarberAgree(client: Client, reader: EoReader) {
  const packet = BarberAgreeServerPacket.deserialize(reader);

  const gold = client.items.find((i) => i.id === 1);
  if (gold) {
    gold.amount = packet.goldAmount;
  }

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

  client.emit('inventoryChanged', undefined);
  client.emit('barberPurchased', undefined);
  playSfxById(SfxId.BuySell);
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
