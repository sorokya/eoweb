import {
  AdminInteractAgreeServerPacket,
  AdminInteractRemoveServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '@/client';
import { ADMIN_HIDE_EFFECT_ID } from '@/consts';
import {
  EffectAnimation,
  EffectTargetCharacter,
  EffectTargetTile,
} from '@/render';
import { SfxId } from '@/sfx';

function handleAdminInteractRemove(client: Client, reader: EoReader) {
  const packet = AdminInteractRemoveServerPacket.deserialize(reader);

  const character = client.getCharacterById(packet.playerId);
  if (character) {
    const metadata = client.getEffectMetadata(ADMIN_HIDE_EFFECT_ID);
    client.animationController.effects.push(
      new EffectAnimation(
        ADMIN_HIDE_EFFECT_ID,
        new EffectTargetTile(character.coords),
        metadata,
      ),
    );
    client.audioController.playAtPosition(SfxId.AdminHide, character.coords);
    character.invisible = true;
  }
}

function handleAdminInteractAgree(client: Client, reader: EoReader) {
  const packet = AdminInteractAgreeServerPacket.deserialize(reader);

  const character = client.getCharacterById(packet.playerId);
  if (character) {
    const metadata = client.getEffectMetadata(ADMIN_HIDE_EFFECT_ID);
    client.animationController.effects.push(
      new EffectAnimation(
        ADMIN_HIDE_EFFECT_ID,
        new EffectTargetCharacter(character.playerId),
        metadata,
      ),
    );
    client.audioController.playAtPosition(SfxId.AdminHide, character.coords);
    character.invisible = false;
  }
}

export function registerAdminInteractHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.AdminInteract,
    PacketAction.Remove,
    (reader) => handleAdminInteractRemove(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.AdminInteract,
    PacketAction.Agree,
    (reader) => handleAdminInteractAgree(client, reader),
  );
}
