import {
  GuildAcceptClientPacket,
  GuildAgreeClientPacket,
  GuildBuyClientPacket,
  GuildCreateClientPacket,
  GuildInfoType,
  GuildJunkClientPacket,
  GuildKickClientPacket,
  GuildPlayerClientPacket,
  GuildRankClientPacket,
  GuildRemoveClientPacket,
  GuildReportClientPacket,
  GuildRequestClientPacket,
  GuildTakeClientPacket,
  GuildTellClientPacket,
  GuildUseClientPacket,
} from 'eolib';
import type { Client } from '../client';
import { playSfxById, SfxId } from '../sfx';

export class GuildController {
  // Create-flow state
  createMembers: string[] = [];
  createTag = '';
  createName = '';

  // Cached data from server responses
  cachedDescription = '';
  cachedRanks: string[] = [];
  cachedBankGold = 0;

  // Pending invite/join-request state
  pendingInvitePlayerId = 0;
  pendingInviteType: 'create' | 'join' = 'create';
  pendingInviteName = '';

  constructor(private client: Client) {}

  private clearGuild() {
    this.client.guildTag = '';
    this.client.guildName = '';
    this.client.guildRank = 0;
    this.client.guildRankName = '';
  }

  // ── State updates (called by handlers) ───────────────────────────────

  setCreated(
    guildTag: string,
    guildName: string,
    rankName: string,
    goldAmount: number,
  ) {
    this.client.guildTag = guildTag;
    this.client.guildName = guildName;
    this.client.guildRankName = rankName;
    this.client.guildRank = 0; // founder
    this.client.emit('guildCreated', {
      guildTag,
      guildName,
      rankName,
      goldAmount,
    });
  }

  setJoined(guildTag: string, guildName: string, rankName: string) {
    this.client.guildTag = guildTag;
    this.client.guildName = guildName;
    this.client.guildRankName = rankName;
    playSfxById(SfxId.JoinGuild);
    this.client.emit('guildJoined', { guildTag, guildName, rankName });
  }

  kick() {
    this.clearGuild();
  }

  setRankUpdated(rank: number) {
    this.client.guildRank = rank;
    this.client.emit('guildRankUpdated', { rank });
  }

  setCreateBegin() {
    this.createMembers = [];
    this.client.emit('guildCreateBegin', undefined);
  }

  setCreateAdd(name: string) {
    this.createMembers.push(name);
    this.client.emit('guildCreateAdd', { name });
  }

  setCreateAddConfirm(name: string) {
    if (name) this.createMembers.push(name);
    this.client.emit('guildCreateAddConfirm', { name });
  }

  setInfoReceived(data: {
    name: string;
    tag: string;
    createDate: string;
    description: string;
    wealth: string;
    ranks: string[];
    staff: { rank: number; name: string }[];
  }) {
    this.client.emit('guildInfo', data);
  }

  setMemberListReceived(
    members: { rank: number; name: string; rankName: string }[],
  ) {
    this.client.emit('guildMemberList', { members });
  }

  setDescriptionReceived(description: string) {
    this.cachedDescription = description;
    this.client.emit('guildDescription', { description });
  }

  setRanksReceived(ranks: string[]) {
    this.cachedRanks = [...ranks];
    this.client.emit('guildRanks', { ranks });
  }

  setBankReceived(gold: number) {
    this.cachedBankGold = gold;
    this.client.emit('guildBank', { gold });
  }

  setBankUpdated(goldAmount: number) {
    // Update gold in inventory
    const gold = this.client.items.find((i) => i.id === 1);
    if (gold) {
      this.cachedBankGold += gold.amount - goldAmount;
      gold.amount = goldAmount;
      this.client.emit('inventoryChanged', undefined);
    }
    this.client.emit('guildBankUpdated', undefined);
  }

  setPendingInvite(playerId: number, type: 'create' | 'join', name: string) {
    this.pendingInvitePlayerId = playerId;
    this.pendingInviteType = type;
    this.pendingInviteName = name;

    playSfxById(SfxId.ServerMessage);
    this.client.emit(
      type === 'join' ? 'guildJoinRequest' : 'guildCreateInvite',
      undefined,
    );
  }

  // ── Outgoing actions ──────────────────────────────────────────────────

  beginCreate(tag: string, name: string) {
    this.createTag = tag;
    this.createName = name;
    const packet = new GuildRequestClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.guildTag = tag;
    packet.guildName = name;
    this.client.bus.send(packet);
  }

  finalizeCreate(description: string) {
    const packet = new GuildCreateClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.guildTag = this.createTag;
    packet.guildName = this.createName;
    packet.description = description;
    this.client.bus.send(packet);
  }

  requestToJoin(tag: string, recruiter: string) {
    const packet = new GuildPlayerClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.guildTag = tag.toUpperCase().padEnd(3).slice(0, 3);
    packet.recruiterName = recruiter;
    this.client.bus.send(packet);
  }

  acceptCreateInvite(inviterPlayerId: number) {
    const packet = new GuildAcceptClientPacket();
    packet.inviterPlayerId = inviterPlayerId;
    this.client.bus.send(packet);
  }

  acceptJoinRequest(playerId: number) {
    const packet = new GuildUseClientPacket();
    packet.playerId = playerId;
    this.client.bus.send(packet);
  }

  requestGuildInfo(tag: string) {
    const packet = new GuildReportClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.guildIdentity = tag;
    this.client.bus.send(packet);
  }

  requestMemberList(tag: string) {
    const packet = new GuildTellClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.guildIdentity = tag;
    this.client.bus.send(packet);
  }

  requestDescriptionInfo() {
    const packet = new GuildTakeClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.infoType = GuildInfoType.Description;
    packet.guildTag = this.client.guildTag.padEnd(3).slice(0, 3);
    this.client.bus.send(packet);
  }

  requestRanksInfo() {
    const packet = new GuildTakeClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.infoType = GuildInfoType.Ranks;
    packet.guildTag = this.client.guildTag.padEnd(3).slice(0, 3);
    this.client.bus.send(packet);
  }

  requestBankInfo() {
    const packet = new GuildTakeClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.infoType = GuildInfoType.Bank;
    packet.guildTag = this.client.guildTag.padEnd(3).slice(0, 3);
    this.client.bus.send(packet);
  }

  saveDescription(description: string) {
    const packet = new GuildAgreeClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.infoType = GuildInfoType.Description;
    packet.infoTypeData = new GuildAgreeClientPacket.InfoTypeDataDescription();
    (
      packet.infoTypeData as GuildAgreeClientPacket.InfoTypeDataDescription
    ).description = description;
    this.client.bus.send(packet);
  }

  saveRanks(ranks: string[]) {
    const packet = new GuildAgreeClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.infoType = GuildInfoType.Ranks;
    packet.infoTypeData = new GuildAgreeClientPacket.InfoTypeDataRanks();
    (packet.infoTypeData as GuildAgreeClientPacket.InfoTypeDataRanks).ranks =
      ranks;
    this.client.bus.send(packet);
  }

  depositToBank(amount: number) {
    const packet = new GuildBuyClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.goldAmount = amount;
    this.client.bus.send(packet);
    playSfxById(SfxId.BuySell);
  }

  kickMember(name: string) {
    const packet = new GuildKickClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.memberName = name;
    this.client.bus.send(packet);
  }

  changeMemberRank(name: string, rank: number) {
    const packet = new GuildRankClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.rank = rank;
    packet.memberName = name;
    this.client.bus.send(packet);
  }

  leaveGuild() {
    const packet = new GuildRemoveClientPacket();
    packet.sessionId = this.client.sessionId;
    this.client.bus.send(packet);
    this.clearGuild();
    playSfxById(SfxId.LeaveGuild);
    this.client.emit('guildOpened', undefined);
  }

  disbandGuild() {
    const packet = new GuildJunkClientPacket();
    packet.sessionId = this.client.sessionId;
    this.client.bus.send(packet);
    this.clearGuild();
    playSfxById(SfxId.LeaveGuild);
    this.client.emit('guildOpened', undefined);
  }
}
