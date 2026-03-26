import {
  type EoReader,
  GuildAcceptServerPacket,
  GuildAgreeServerPacket,
  GuildBuyServerPacket,
  GuildCreateServerPacket,
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

const REPLY_MESSAGES: Partial<Record<GuildReply, string>> = {
  [GuildReply.Busy]: 'The guild master is busy.',
  [GuildReply.NotApproved]: 'Guild name or tag not approved.',
  [GuildReply.AlreadyMember]: 'You are already in a guild.',
  [GuildReply.NoCandidates]: 'No candidates available.',
  [GuildReply.Exists]: 'A guild with that name or tag already exists.',
  [GuildReply.RecruiterOffline]: 'That recruiter is offline.',
  [GuildReply.RecruiterNotHere]: 'That recruiter is not on this map.',
  [GuildReply.RecruiterWrongGuild]: 'That player is not in that guild.',
  [GuildReply.NotRecruiter]: 'That player does not have recruiter permissions.',
  [GuildReply.NotPresent]: 'Player not found.',
  [GuildReply.AccountLow]: 'The guild bank does not have enough gold.',
  [GuildReply.Accepted]: 'Player accepted into the guild!',
  [GuildReply.NotFound]: 'Guild not found.',
  [GuildReply.Updated]: 'Guild updated.',
  [GuildReply.RanksUpdated]: 'Guild ranks updated.',
  [GuildReply.RemoveLeader]: 'You cannot kick a leader.',
  [GuildReply.RemoveNotMember]: 'That player is not a member of the guild.',
  [GuildReply.Removed]: 'Member has been removed.',
  [GuildReply.RankingLeader]: 'You cannot change a leader rank.',
  [GuildReply.RankingNotMember]: 'That player is not a member of the guild.',
};

function handleGuildOpen(client: Client, _reader: EoReader) {
  client.emit('guildOpened', undefined);
}

function handleGuildReply(client: Client, reader: EoReader) {
  const packet = GuildReplyServerPacket.deserialize(reader);
  const code = packet.replyCode;

  switch (code) {
    case GuildReply.CreateBegin:
      client.emit('guildCreateBegin', undefined);
      return;
    case GuildReply.CreateAdd: {
      const data =
        packet.replyCodeData as GuildReplyServerPacket.ReplyCodeDataCreateAdd;
      client.emit('guildCreateAdd', { name: data.name });
      return;
    }
    case GuildReply.CreateAddConfirm: {
      const data =
        packet.replyCodeData as GuildReplyServerPacket.ReplyCodeDataCreateAddConfirm;
      client.emit('guildCreateAddConfirm', { name: data.name });
      return;
    }
    case GuildReply.JoinRequest: {
      const data =
        packet.replyCodeData as GuildReplyServerPacket.ReplyCodeDataJoinRequest;
      client.emit('guildJoinRequest', {
        playerId: data.playerId,
        playerName: data.name,
      });
      return;
    }
    default: {
      const message = REPLY_MESSAGES[code] ?? `Guild reply: ${code}`;
      client.emit('guildReply', { code, message });
    }
  }
}

function handleGuildCreate(client: Client, reader: EoReader) {
  const packet = GuildCreateServerPacket.deserialize(reader);
  client.guildTag = packet.guildTag;
  client.guildName = packet.guildName;
  client.guildRankName = packet.rankName;
  client.guildRank = 0; // founder
  client.emit('guildCreated', {
    guildTag: packet.guildTag,
    guildName: packet.guildName,
    rankName: packet.rankName,
    goldAmount: packet.goldAmount,
  });
}

function handleGuildRequest(client: Client, reader: EoReader) {
  const packet = GuildRequestServerPacket.deserialize(reader);
  client.emit('guildCreateInvite', {
    playerId: packet.playerId,
    guildIdentity: packet.guildIdentity,
  });
}

function handleGuildTell(client: Client, reader: EoReader) {
  const packet = GuildTellServerPacket.deserialize(reader);
  client.emit('guildMemberList', {
    members: packet.members.map((m) => ({
      rank: m.rank,
      name: m.name,
      rankName: m.rankName,
    })),
  });
}

function handleGuildReport(client: Client, reader: EoReader) {
  const packet = GuildReportServerPacket.deserialize(reader);
  client.emit('guildInfo', {
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
  client.emit('guildDescription', { description: packet.description });
}

function handleGuildRank(client: Client, reader: EoReader) {
  const packet = GuildRankServerPacket.deserialize(reader);
  client.emit('guildRanks', { ranks: packet.ranks });
}

function handleGuildSell(client: Client, reader: EoReader) {
  const packet = GuildSellServerPacket.deserialize(reader);
  client.emit('guildBank', { gold: packet.goldAmount });
}

function handleGuildBuy(client: Client, reader: EoReader) {
  const packet = GuildBuyServerPacket.deserialize(reader);
  // Update gold in inventory
  const gold = client.items.find((i) => i.id === 1);
  if (gold) {
    gold.amount = packet.goldAmount;
    client.emit('inventoryChanged', undefined);
  }
  client.emit('guildBankUpdated', { goldAmount: packet.goldAmount });
}

function handleGuildKick(client: Client, _reader: EoReader) {
  // Player was kicked or left the guild
  client.guildTag = '';
  client.guildName = '';
  client.guildRank = 0;
  client.guildRankName = '';
  client.emit('guildLeft', undefined);
}

function handleGuildAccept(client: Client, reader: EoReader) {
  const packet = GuildAcceptServerPacket.deserialize(reader);
  client.guildRank = packet.rank;
  client.emit('guildRankUpdated', { rank: packet.rank });
}

function handleGuildAgree(client: Client, reader: EoReader) {
  const packet = GuildAgreeServerPacket.deserialize(reader);
  // Player has been added to a guild
  client.guildTag = packet.guildTag;
  client.guildName = packet.guildName;
  client.guildRankName = packet.rankName;
  client.emit('guildJoined', {
    guildTag: packet.guildTag,
    guildName: packet.guildName,
    rankName: packet.rankName,
  });
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
    PacketAction.Admin,
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
