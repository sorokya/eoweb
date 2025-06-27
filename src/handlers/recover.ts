import {
  type EoReader,
  PacketAction,
  PacketFamily,
  RecoverAgreeServerPacket,
  RecoverPlayerServerPacket,
} from 'eolib';
import type { Client } from '../client';
import { HealthBar } from '../render/health-bar';

function handleRecoverPlayer(client: Client, reader: EoReader) {
  const packet = RecoverPlayerServerPacket.deserialize(reader);

  if (client.hp !== packet.hp) {
    const amount = packet.hp - client.hp;
    const percentage = (packet.hp / client.maxHp) * 100;
    client.hp = packet.hp;
    client.characterHealthBars.set(
      client.playerId,
      new HealthBar(percentage, 0, amount),
    );
  }

  client.tp = packet.tp;
  client.emit('statsUpdate', undefined);
}

function handleRecoverAgree(client: Client, reader: EoReader) {
  const packet = RecoverAgreeServerPacket.deserialize(reader);
  const character = client.getCharacterById(packet.playerId);
  if (!character) {
    client.requestCharacterRange([packet.playerId]);
    return;
  }

  character.hp += packet.healHp;
  client.characterHealthBars.set(
    packet.playerId,
    new HealthBar(packet.hpPercentage, 0, packet.healHp),
  );
}

export function registerRecoverHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Recover,
    PacketAction.Player,
    (reader) => handleRecoverPlayer(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Recover,
    PacketAction.Agree,
    (reader) => handleRecoverAgree(client, reader),
  );
}
