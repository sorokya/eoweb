import {
  type EoReader,
  GuildAcceptServerPacket,
  GuildAgreeServerPacket,
  GuildBuyServerPacket,
  GuildCreateServerPacket,
  GuildOpenServerPacket,
  GuildRankServerPacket,
  GuildReply,
  GuildReplyServerPacket,
  GuildReportServerPacket,
  GuildRequestServerPacket,
  GuildSellServerPacket,
  GuildTakeServerPacket,
  GuildTellServerPacket,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';

function handleGuildOpen(client: Client, reader: EoReader) {
  const packet = GuildOpenServerPacket.deserialize(reader);
  client.sessionId = packet.sessionId;
  client.emit('guildOpened', undefined);
}

function handleGuildReply(client: Client, reader: EoReader) {
  const packet = GuildReplyServerPacket.deserialize(reader);
  const code = packet.replyCode;

  switch (code) {
    case GuildReply.CreateBegin:
      client.guildController.setCreateBegin();
      return;
    case GuildReply.CreateAdd: {
      const data =
        packet.replyCodeData as GuildReplyServerPacket.ReplyCodeDataCreateAdd;
      client.guildController.setCreateAdd(data.name);
      return;
    }
    case GuildReply.CreateAddConfirm: {
      const data =
        packet.replyCodeData as GuildReplyServerPacket.ReplyCodeDataCreateAddConfirm;
      client.guildController.setCreateAddConfirm(data.name);
      return;
    }
    case GuildReply.JoinRequest: {
      const data =
        packet.replyCodeData as GuildReplyServerPacket.ReplyCodeDataJoinRequest;
      client.guildController.setPendingInvite(data.playerId, 'join', data.name);
      return;
    }
    default: {
      client.emit('guildReply', { code });
    }
  }
}

function handleGuildCreate(client: Client, reader: EoReader) {
  const packet = GuildCreateServerPacket.deserialize(reader);
  client.guildController.setCreated(
    packet.guildTag,
    packet.guildName,
    packet.rankName,
    packet.goldAmount,
  );
}

function handleGuildRequest(client: Client, reader: EoReader) {
  const packet = GuildRequestServerPacket.deserialize(reader);
  client.guildController.setPendingInvite(
    packet.playerId,
    'create',
    packet.guildIdentity,
  );
}

function handleGuildTell(client: Client, reader: EoReader) {
  const packet = GuildTellServerPacket.deserialize(reader);
  client.guildController.setMemberListReceived(
    packet.members.map((m) => ({
      rank: m.rank,
      name: m.name,
      rankName: m.rankName,
    })),
  );
}

function handleGuildReport(client: Client, reader: EoReader) {
  const packet = GuildReportServerPacket.deserialize(reader);
  client.guildController.setInfoReceived({
    name: packet.name,
    tag: packet.tag,
    createDate: packet.createDate,
    description: packet.description,
    wealth: packet.wealth,
    ranks: packet.ranks,
    staff: packet.staff.map((s) => ({ rank: s.rank, name: s.name })),
  });
}

function handleGuildTake(client: Client, reader: EoReader) {
  const packet = GuildTakeServerPacket.deserialize(reader);
  client.guildController.setDescriptionReceived(packet.description);
}

function handleGuildRank(client: Client, reader: EoReader) {
  const packet = GuildRankServerPacket.deserialize(reader);
  client.guildController.setRanksReceived(packet.ranks);
}

function handleGuildSell(client: Client, reader: EoReader) {
  const packet = GuildSellServerPacket.deserialize(reader);
  client.guildController.setBankReceived(packet.goldAmount);
}

function handleGuildBuy(client: Client, reader: EoReader) {
  const packet = GuildBuyServerPacket.deserialize(reader);
  client.guildController.setBankUpdated(packet.goldAmount);
}

function handleGuildKick(client: Client, _reader: EoReader) {
  client.guildController.kick();
}

function handleGuildAccept(client: Client, reader: EoReader) {
  const packet = GuildAcceptServerPacket.deserialize(reader);
  client.guildController.setRankUpdated(packet.rank);
}

function handleGuildAgree(client: Client, reader: EoReader) {
  const packet = GuildAgreeServerPacket.deserialize(reader);
  client.guildController.setJoined(
    packet.guildTag,
    packet.guildName,
    packet.rankName,
  );
}

export function registerGuildHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Guild,
    PacketAction.Open,
    (reader) => handleGuildOpen(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Guild,
    PacketAction.Reply,
    (reader) => handleGuildReply(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Guild,
    PacketAction.Create,
    (reader) => handleGuildCreate(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Guild,
    PacketAction.Request,
    (reader) => handleGuildRequest(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Guild,
    PacketAction.Tell,
    (reader) => handleGuildTell(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Guild,
    PacketAction.Report,
    (reader) => handleGuildReport(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Guild,
    PacketAction.Take,
    (reader) => handleGuildTake(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Guild,
    PacketAction.Rank,
    (reader) => handleGuildRank(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Guild,
    PacketAction.Sell,
    (reader) => handleGuildSell(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Guild,
    PacketAction.Buy,
    (reader) => handleGuildBuy(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Guild,
    PacketAction.Kick,
    (reader) => handleGuildKick(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Guild,
    PacketAction.Accept,
    (reader) => handleGuildAccept(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Guild,
    PacketAction.Agree,
    (reader) => handleGuildAgree(client, reader),
  );
}
