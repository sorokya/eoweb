import {
  AvatarAdminServerPacket,
  AvatarAgreeServerPacket,
  type AvatarChange,
  AvatarChangeType,
  AvatarRemoveServerPacket,
  AvatarReplyServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
  WarpEffect,
} from 'eolib';
import type { Client } from '../client';
import { CharacterDeathAnimation } from '../render/character-death';
import {
  EffectAnimation,
  EffectTargetCharacter,
  EffectTargetTile,
} from '../render/effect';
import { HealthBar } from '../render/health-bar';
import { playSfxById, SfxId } from '../sfx';

function handleAvatarRemove(client: Client, reader: EoReader) {
  const packet = AvatarRemoveServerPacket.deserialize(reader);
  if (client.menuPlayerId === packet.playerId) {
    client.menuPlayerId = 0;
  }

  const character = client.getCharacterById(packet.playerId);
  if (!character) {
    return;
  }

  switch (packet.warpEffect) {
    case WarpEffect.Admin: {
      const metadata = client.getEffectMetadata(3);
      client.effects.push(
        new EffectAnimation(
          3,
          new EffectTargetTile(character.coords),
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

  const animation = client.characterAnimations.get(packet.playerId);
  if (animation instanceof CharacterDeathAnimation) {
    return;
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

  client.atlas.refresh();
}

function handleAvatarReply(client: Client, reader: EoReader) {
  const packet = AvatarReplyServerPacket.deserialize(reader);

  if (packet.victimId === client.playerId) {
    client.hp = Math.max(client.hp - packet.damage, 0);
    client.emit('statsUpdate', undefined);
  }

  const victim = client.getCharacterById(packet.victimId);
  if (!victim) {
    client.requestCharacterRange([packet.victimId]);
    return;
  }

  client.characterHealthBars.set(
    packet.victimId,
    new HealthBar(packet.hpPercentage, packet.damage),
  );

  if (packet.dead) {
    client.setCharacterDeathAnimation(packet.victimId);
    playSfxById(SfxId.Dead);
  }
}

function handleAvatarAdmin(client: Client, reader: EoReader) {
  const packet = AvatarAdminServerPacket.deserialize(reader);

  if (
    packet.victimId === client.playerId &&
    packet.casterId !== client.playerId
  ) {
    client.hp = Math.max(client.hp - packet.damage, 0);
    client.emit('statsUpdate', undefined);
  }

  const victim = client.getCharacterById(packet.victimId);
  if (!victim) {
    client.requestCharacterRange([packet.victimId]);
    return;
  }

  client.characterHealthBars.set(
    packet.victimId,
    new HealthBar(packet.hpPercentage, packet.damage),
  );

  if (packet.victimDied) {
    client.setCharacterDeathAnimation(packet.victimId);
    playSfxById(SfxId.Dead);
  }

  const record = client.getEsfRecordById(packet.spellId);
  if (!record) {
    return;
  }

  const meta = client.getEffectMetadata(record.graphicId);
  if (meta.sfx) {
    playSfxById(meta.sfx);
  }

  client.effects.push(
    new EffectAnimation(
      record.graphicId,
      new EffectTargetCharacter(packet.victimId),
      meta,
    ),
  );
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
  client.bus.registerPacketHandler(
    PacketFamily.Avatar,
    PacketAction.Reply,
    (reader) => handleAvatarReply(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Avatar,
    PacketAction.Admin,
    (reader) => handleAvatarAdmin(client, reader),
  );
}
