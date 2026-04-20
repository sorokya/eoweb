import {
  CitizenAcceptServerPacket,
  CitizenOpenServerPacket,
  CitizenRemoveServerPacket,
  CitizenReplyServerPacket,
  CitizenRequestServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '@/client';

function handleCitizenOpen(client: Client, reader: EoReader) {
  const packet = CitizenOpenServerPacket.deserialize(reader);
  client.innController.handleOpened(
    packet.behaviorId,
    packet.currentHomeId,
    packet.sessionId,
    packet.questions,
  );
}

function handleCitizenReply(client: Client, reader: EoReader) {
  const packet = CitizenReplyServerPacket.deserialize(reader);
  client.innController.handleCitizenshipResult(packet.questionsWrong);
}

function handleCitizenRequest(client: Client, reader: EoReader) {
  const packet = CitizenRequestServerPacket.deserialize(reader);
  client.innController.handleSleepCost(packet.cost);
}

function handleCitizenAccept(client: Client, reader: EoReader) {
  const packet = CitizenAcceptServerPacket.deserialize(reader);
  client.innController.handleSleepConfirmed(packet.goldAmount);
}

function handleCitizenRemove(client: Client, reader: EoReader) {
  const packet = CitizenRemoveServerPacket.deserialize(reader);
  client.innController.handleRemoved(packet.replyCode);
}

export function registerCitizenHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Citizen,
    PacketAction.Open,
    (reader) => handleCitizenOpen(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Citizen,
    PacketAction.Reply,
    (reader) => handleCitizenReply(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Citizen,
    PacketAction.Request,
    (reader) => handleCitizenRequest(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Citizen,
    PacketAction.Accept,
    (reader) => handleCitizenAccept(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Citizen,
    PacketAction.Remove,
    (reader) => handleCitizenRemove(client, reader),
  );
}
