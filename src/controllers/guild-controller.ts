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
  GuildReply,
  GuildReportClientPacket,
  GuildRequestClientPacket,
  GuildTakeClientPacket,
  GuildTellClientPacket,
  GuildUseClientPacket,
} from 'eolib';
import type { Client } from '@/client';
import {
  GUILD_MAX_RANK,
  GUILD_MIN_DEPOSIT,
  GUILD_RANK_LEADER,
  GUILD_RANK_NEW_MEMBER,
} from '@/consts';
import { DialogResourceID } from '@/edf';
import { GuildDialogState } from '@/game-state';
import { playSfxById, SfxId } from '@/sfx';
import { capitalize } from '@/utils';

const REPLY_DIALOG_IDS: Partial<Record<GuildReply, DialogResourceID>> = {
  [GuildReply.Busy]: DialogResourceID.GUILD_MASTER_IS_BUSY,
  [GuildReply.NotApproved]: DialogResourceID.GUILD_CREATE_NAME_NOT_APPROVED,
  [GuildReply.AlreadyMember]: DialogResourceID.GUILD_ALREADY_A_MEMBER,
  [GuildReply.NoCandidates]: DialogResourceID.GUILD_CREATE_NO_CANDIDATES,
  [GuildReply.Exists]: DialogResourceID.GUILD_TAG_OR_NAME_ALREADY_EXISTS,
  [GuildReply.RecruiterOffline]: DialogResourceID.GUILD_RECRUITER_NOT_FOUND,
  [GuildReply.RecruiterNotHere]: DialogResourceID.GUILD_RECRUITER_NOT_HERE,
  [GuildReply.RecruiterWrongGuild]: DialogResourceID.GUILD_RECRUITER_NOT_MEMBER,
  [GuildReply.NotRecruiter]: DialogResourceID.GUILD_RECRUITER_RANK_TOO_LOW,
  [GuildReply.NotPresent]: DialogResourceID.GUILD_RECRUITER_INPUT_MISSING,
  [GuildReply.AccountLow]: DialogResourceID.GUILD_BANK_ACCOUNT_LOW,
  [GuildReply.Accepted]: DialogResourceID.GUILD_MEMBER_HAS_BEEN_ACCEPTED,
  [GuildReply.NotFound]: DialogResourceID.GUILD_DOES_NOT_EXIST,
  [GuildReply.Updated]: DialogResourceID.GUILD_DETAILS_UPDATED,
  [GuildReply.RanksUpdated]: DialogResourceID.GUILD_DETAILS_UPDATED,
  [GuildReply.RemoveLeader]: DialogResourceID.GUILD_REMOVE_PLAYER_IS_LEADER,
  [GuildReply.RemoveNotMember]: DialogResourceID.GUILD_REMOVE_PLAYER_NOT_MEMBER,
  [GuildReply.Removed]: DialogResourceID.GUILD_REMOVE_SUCCESS,
  [GuildReply.RankingLeader]: DialogResourceID.GUILD_RANK_TOO_LOW,
  [GuildReply.RankingNotMember]:
    DialogResourceID.GUILD_REMOVE_PLAYER_NOT_MEMBER,
};

type GuildInfoData = {
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
  createDescription = '';

  // Cached data from server responses
  cachedInfo: GuildInfoData | null = null;
  cachedMembers: { rank: number; name: string; rankName: string }[] = [];
  cachedDescription = '';
  cachedRanks: string[] = [];
  cachedBankGold = 0;

  constructor(private client: Client) {}

  private clearGuild() {
    this.client.guildTag = '   ';
    this.client.guildName = '';
    this.client.guildRank = 0;
    this.client.guildRankName = '';
  }

  // ── State updates (called by handlers) ───────────────────────────────

  notifyReply(code: GuildReply) {
    const dialogId = REPLY_DIALOG_IDS[code];
    const strings = dialogId
      ? this.client.getDialogStrings(dialogId)
      : ['Guild reply', `Code: ${GuildReply[code]}`];
    this.client.emit('smallAlert', {
      title: strings[0],
      message: strings[1],
    });
  }

  notifyCreated(
    guildTag: string,
    guildName: string,
    rankName: string,
    goldAmount: number,
  ) {
    this.client.guildTag = guildTag;
    this.client.guildName = guildName;
    this.client.guildRankName = rankName;
    this.client.guildRank = GUILD_RANK_LEADER;

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
    this.client.guildRank = GUILD_RANK_NEW_MEMBER;
    playSfxById(SfxId.JoinGuild);

    this.state = GuildDialogState.None;
    this.client.emit('guildUpdated', undefined);

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
    if (this.state !== GuildDialogState.None) {
      this.state = GuildDialogState.MainMenu;
      this.client.emit('guildUpdated', undefined);
    }
  }

  notifyRankUpdated(rank: number) {
    this.client.guildRank = rank;
    this.client.emit('guildUpdated', undefined);
  }

  notifyCreateBegin() {
    this.state = GuildDialogState.CreateWaiting;
    this.client.emit('guildUpdated', undefined);
  }

  notifyCreateAdd(name: string) {
    this.createMembers.push(capitalize(name));
    this.client.emit('guildUpdated', undefined);
  }

  notifyCreateAddConfirm(name: string) {
    if (name) this.createMembers.push(capitalize(name));
    this.state = GuildDialogState.None;
    this.client.emit('guildUpdated', undefined);

    playSfxById(SfxId.ServerMessage);
    const strings = this.client.getDialogStrings(
      DialogResourceID.GUILD_WILL_BE_CREATED,
    );
    this.client.emit('confirmation', {
      title: strings[0],
      message: strings[1],
      onConfirm: () => this.finalizeCreate(),
    });
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
      const strings = this.client.getDialogStrings(
        DialogResourceID.GUILD_PLAYER_WANTS_TO_JOIN,
      );
      this.client.emit('confirmation', {
        title: strings[0],
        message: `${name} ${strings[1]}`,
        onConfirm: () => this.acceptJoinRequest(playerId),
      });
    } else {
      const strings = this.client.getDialogStrings(
        DialogResourceID.GUILD_INVITATION_INVITES_YOU,
      );
      this.client.emit('confirmation', {
        title: strings[0],
        message: `${name} ${strings[1]}`,
        onConfirm: () => this.acceptCreateInvite(playerId),
      });
    }
  }

  // ── Outgoing actions ──────────────────────────────────────────────────

  beginCreate(tag: string, name: string, description: string) {
    this.createTag = tag;
    this.createName = name;
    this.createDescription = description;
    this.createMembers = [capitalize(this.client.name)];
    const packet = new GuildRequestClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.guildTag = tag;
    packet.guildName = name;
    this.client.bus.send(packet);
  }

  finalizeCreate() {
    const packet = new GuildCreateClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.guildTag = this.createTag;
    packet.guildName = this.createName;
    packet.description = this.createDescription;
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
    const gold = this.client.items.find((i) => i.id === 1);
    if (!gold || gold.amount < amount || amount < GUILD_MIN_DEPOSIT) {
      return;
    }

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
    packet.rank = Math.max(0, Math.min(GUILD_MAX_RANK, rank));
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
