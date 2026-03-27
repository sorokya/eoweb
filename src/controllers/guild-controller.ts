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
import { DialogResourceID } from '../edf';
import { playSfxById, SfxId } from '../sfx';
import { GuildDialogState } from '../types';

export type GuildInfoData = {
  name: string;
  tag: string;
  createDate: string;
  description: string;
  wealth: string;
  ranks: string[];
  staff: { rank: number; name: string }[];
};

export class GuildController {
  state = GuildDialogState.None;

  // Create-flow state
  createMembers: string[] = [];
  createTag = '';
  createName = '';

  // Cached data from server responses
  cachedInfo: GuildInfoData | null = null;
  cachedMembers: { rank: number; name: string; rankName: string }[] = [];
  cachedDescription = '';
  cachedRanks: string[] = [];
  cachedBankGold = 0;

  constructor(private client: Client) {}

  private clearGuild() {
    this.client.guildTag = '';
    this.client.guildName = '';
    this.client.guildRank = 0;
    this.client.guildRankName = '';
  }

  // ── State updates (called by handlers) ───────────────────────────────

  notifyCreated(
    guildTag: string,
    guildName: string,
    rankName: string,
    goldAmount: number,
  ) {
    this.client.guildTag = guildTag;
    this.client.guildName = guildName;
    this.client.guildRankName = rankName;
    this.client.guildRank = 0; // founder

    const gold = this.client.items.find((i) => i.id === 1);
    if (gold) {
      gold.amount = goldAmount;
      this.client.emit('inventoryChanged', undefined);
    }

    this.client.emit('guildUpdated', undefined);
  }

  notifyJoined(guildTag: string, guildName: string, rankName: string) {
    this.client.guildTag = guildTag;
    this.client.guildName = guildName;
    this.client.guildRankName = rankName;
    playSfxById(SfxId.JoinGuild);

    const strings = this.client.getDialogStrings(
      DialogResourceID.GUILD_YOU_HAVE_BEEN_ACCEPTED,
    );
    this.client.emit('smallAlert', {
      title: strings[0],
      message: strings[1],
    });
  }

  notifyKicked() {
    this.clearGuild();
  }

  notifyRankUpdated(rank: number) {
    this.client.guildRank = rank;
    this.client.emit('guildUpdated', undefined);
  }

  notifyCreateBegin() {
    this.createMembers = [];
    this.state = GuildDialogState.CreateWaiting;
    this.client.emit('guildUpdated', undefined);
  }

  notifyCreateAdd(name: string) {
    this.createMembers.push(name);
    this.client.emit('guildUpdated', undefined);
  }

  notifyCreateAddConfirm(name: string) {
    if (name) this.createMembers.push(name);
    this.state = GuildDialogState.CreateFinalize;
    this.client.emit('guildUpdated', undefined);
  }

  notifyInfoReceived(data: GuildInfoData) {
    this.cachedInfo = data;
    this.state = GuildDialogState.GuildInfo;
    this.client.emit('guildUpdated', undefined);
  }

  notifyMemberListReceived(
    members: { rank: number; name: string; rankName: string }[],
  ) {
    this.cachedMembers = members;
    this.state = GuildDialogState.GuildMembers;
    this.client.emit('guildUpdated', undefined);
  }

  notifyDescriptionReceived(description: string) {
    this.cachedDescription = description;
    this.state = GuildDialogState.EditDescription;
    this.client.emit('guildUpdated', undefined);
  }

  notifyRanksReceived(ranks: string[]) {
    this.cachedRanks = [...ranks];
    this.state = GuildDialogState.EditRanks;
    this.client.emit('guildUpdated', undefined);
  }

  notifyBankReceived(gold: number) {
    this.cachedBankGold = gold;
    this.state = GuildDialogState.Bank;
    this.client.emit('guildUpdated', undefined);
  }

  notifyBankUpdated(goldAmount: number) {
    const gold = this.client.items.find((i) => i.id === 1);
    if (gold) {
      this.cachedBankGold += gold.amount - goldAmount;
      gold.amount = goldAmount;
      this.client.emit('inventoryChanged', undefined);
    }
    this.requestBankInfo();
  }

  notifyPendingInvite(playerId: number, type: 'create' | 'join', name: string) {
    playSfxById(SfxId.ServerMessage);

    if (type === 'join') {
      this.client.emit('confirmation', {
        title: name,
        message: 'wants to join your guild. Accept?',
        onConfirm: () => this.acceptJoinRequest(playerId),
      });
    } else {
      this.client.emit('confirmation', {
        title: name,
        message: 'is being created. Would you like to join?',
        onConfirm: () => this.acceptCreateInvite(playerId),
      });
    }
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
