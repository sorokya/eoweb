import {
  type EoReader,
  PacketAction,
  PacketFamily,
  PartyAddServerPacket,
  PartyAgreeServerPacket,
  PartyCreateServerPacket,
  PartyListServerPacket,
  PartyRemoveServerPacket,
  PartyReplyCode,
  PartyReplyServerPacket,
  PartyRequestServerPacket,
  PartyTargetGroupServerPacket,
} from 'eolib';
import type { Client } from '@/client';

function handlePartyReply(client: Client, reader: EoReader) {
  const packet = PartyReplyServerPacket.deserialize(reader);
  switch (packet.replyCode) {
    case PartyReplyCode.AlreadyInAnotherParty: {
      const data =
        packet.replyCodeData as PartyReplyServerPacket.ReplyCodeDataAlreadyInAnotherParty;
      client.partyController.notifyAlreadyInAnotherParty(data.playerName);
      return;
    }
    case PartyReplyCode.AlreadyInYourParty: {
      const data =
        packet.replyCodeData as PartyReplyServerPacket.ReplyCodeDataAlreadyInYourParty;
      client.partyController.notifyAlreadyInYourParty(data.playerName);
      return;
    }
    case PartyReplyCode.PartyIsFull: {
      client.partyController.notifyPartyIsFull();
      return;
    }
  }
}

function handlePartyRequest(client: Client, reader: EoReader) {
  const packet = PartyRequestServerPacket.deserialize(reader);
  client.partyController.notifyInvitation(
    packet.inviterPlayerId,
    packet.requestType,
  );
}

function handlePartyCreate(client: Client, reader: EoReader) {
  const packet = PartyCreateServerPacket.deserialize(reader);
  client.partyController.notifyJoinedParty(packet.members);
}

function handlePartyAdd(client: Client, reader: EoReader) {
  const packet = PartyAddServerPacket.deserialize(reader);
  client.partyController.notifyMemberJoined(packet.member);
}

function handlePartyRemove(client: Client, reader: EoReader) {
  const packet = PartyRemoveServerPacket.deserialize(reader);
  client.partyController.notifyMemberLeft(packet.playerId);
}

function handlePartyClose(client: Client) {
  client.partyController.notifyLeftParty();
}

function handlePartyList(client: Client, reader: EoReader) {
  const packet = PartyListServerPacket.deserialize(reader);
  client.partyController.notifyMembersUpdated(packet.members);
}

function handlePartyAgree(client: Client, reader: EoReader) {
  const packet = PartyAgreeServerPacket.deserialize(reader);
  client.partyController.notifyMemberHpUpdated(
    packet.playerId,
    packet.hpPercentage,
  );
}

function handlePartyTargetGroup(client: Client, reader: EoReader) {
  const packet = PartyTargetGroupServerPacket.deserialize(reader);
  client.partyController.notifyExperienceGains(packet.gains);
}

export function registerPartyHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Party,
    PacketAction.Reply,
    (reader) => handlePartyReply(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Party,
    PacketAction.Request,
    (reader) => handlePartyRequest(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Party,
    PacketAction.Create,
    (reader) => handlePartyCreate(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Party,
    PacketAction.Add,
    (reader) => handlePartyAdd(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Party,
    PacketAction.Remove,
    (reader) => handlePartyRemove(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Party,
    PacketAction.Close,
    () => handlePartyClose(client),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Party,
    PacketAction.List,
    (reader) => handlePartyList(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Party,
    PacketAction.Agree,
    (reader) => handlePartyAgree(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Party,
    PacketAction.TargetGroup,
    (reader) => handlePartyTargetGroup(client, reader),
  );
}
