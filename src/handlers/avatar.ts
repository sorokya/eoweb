import {
  AvatarAgreeServerPacket,
  type AvatarChange,
  AvatarChangeType,
  AvatarRemoveServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
  WarpEffect,
} from 'eolib';
import type { Client } from '../client';
import { playSfxById, SfxId } from '../sfx';

function handleAvatarRemove(client: Client, reader: EoReader) {
  const packet = AvatarRemoveServerPacket.deserialize(reader);
  switch (packet.warpEffect) {
    case WarpEffect.Admin:
      // TODO: warp animation
      playSfxById(SfxId.AdminWarp);
      break;
    case WarpEffect.Scroll:
      playSfxById(SfxId.ScrollTeleport);
      break;
  }
  client.nearby.characters = client.nearby.characters.filter(
    (c) => c.playerId !== packet.playerId,
  );
}

function handleAvatarAgree(client: Client, reader: EoReader) {
  const packet = AvatarAgreeServerPacket.deserialize(reader);
  const player = client.nearby.characters.find(
    (c) => c.playerId === packet.change.playerId,
  );

  if (!player) {
    return;
  }

  switch (packet.change.changeType) {
    case AvatarChangeType.Equipment: {
      const update = packet.change
        .changeTypeData as AvatarChange.ChangeTypeDataEquipment;
      player.equipment.armor = update.equipment.armor;
      player.equipment.boots = update.equipment.boots;
      player.equipment.shield = update.equipment.shield;
      player.equipment.weapon = update.equipment.weapon;
      player.equipment.hat = update.equipment.hat;
      break;
    }
    case AvatarChangeType.Hair: {
      const update = packet.change
        .changeTypeData as AvatarChange.ChangeTypeDataHair;
      player.hairStyle = update.hairStyle;
      player.hairColor = update.hairColor;
      break;
    }
    case AvatarChangeType.HairColor: {
      const update = packet.change
        .changeTypeData as AvatarChange.ChangeTypeDataHairColor;
      player.hairColor = update.hairColor;
      break;
    }
  }
}

export function registerAvatarHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Avatar,
    PacketAction.Remove,
    (reader) => handleAvatarRemove(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Avatar,
    PacketAction.Agree,
    (reader) => handleAvatarAgree(client, reader),
  );
}
