import {
  AdminInteractAgreeServerPacket,
  AdminInteractRemoveServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';
import { playSfxById, SfxId } from '../sfx';

function handleAdminInteractRemove(client: Client, reader: EoReader) {
  const packet = AdminInteractRemoveServerPacket.deserialize(reader);

  // TODO: Hide animation
  const character = client.getCharacterById(packet.playerId);
  if (character) {
    playSfxById(SfxId.AdminHide);
    character.invisible = true;
  }
}

function handleAdminInteractAgree(client: Client, reader: EoReader) {
  const packet = AdminInteractAgreeServerPacket.deserialize(reader);

  // TODO: Hide animation
  const character = client.getCharacterById(packet.playerId);
  if (character) {
    playSfxById(SfxId.AdminHide);
    character.invisible = false;
  }
}

export function registerAdminInteractHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.AdminInteract,
    PacketAction.Remove,
    (reader) => {
      handleAdminInteractRemove(client, reader);
    },
  );
  client.bus.registerPacketHandler(
    PacketFamily.AdminInteract,
    PacketAction.Agree,
    (reader) => {
      handleAdminInteractAgree(client, reader);
    },
  );
}
