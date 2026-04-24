import {
  Emote as EmoteType,
  PartyAcceptClientPacket,
  type PartyExpShare,
  type PartyMember,
  PartyRemoveClientPacket,
  PartyRequestClientPacket,
  PartyRequestType,
  PartyTakeClientPacket,
} from 'eolib';
import type { Client } from '@/client';
import { DialogResourceID, EOResourceID } from '@/edf';
import { Emote } from '@/render';
import { SfxId } from '@/sfx';
import { ChatChannels, ChatIcon } from '@/ui/enums';
import { capitalize } from '@/utils';

export class PartyController {
  members: PartyMember[] = [];
  private partySubscribers: (() => void)[] = [];
  private notifySubscribers() {
    for (const cb of this.partySubscribers) {
      cb();
    }
  }

  subscribe(cb: () => void) {
    this.partySubscribers.push(cb);
  }

  unsubscribe(cb: () => void) {
    this.partySubscribers = this.partySubscribers.filter((s) => s !== cb);
  }

  constructor(private client: Client) {}

  reset() {
    this.members = [];
    this.notifySubscribers();
  }

  requestToJoin(playerId: number): void {
    const packet = new PartyRequestClientPacket();
    packet.requestType = PartyRequestType.Join;
    packet.playerId = playerId;
    this.client.bus!.send(packet);
  }

  invite(playerId: number): void {
    const packet = new PartyRequestClientPacket();
    packet.requestType = PartyRequestType.Invite;
    packet.playerId = playerId;
    this.client.bus!.send(packet);
  }

  removeMember(playerId: number): void {
    const packet = new PartyRemoveClientPacket();
    packet.playerId = playerId;
    this.client.bus!.send(packet);
  }

  refresh(): void {
    if (this.members.length === 0) {
      return;
    }

    const packet = new PartyTakeClientPacket();
    packet.membersCount = this.members.length;
    this.client.bus!.send(packet);
  }

  notifyAlreadyInAnotherParty(name: string) {
    const message = `${capitalize(name)} ${this.client.getResourceString(EOResourceID.STATUS_LABEL_PARTY_IS_ALREADY_IN_ANOTHER_PARTY)}`;
    this.client.toastController.showWarning(message);
    this.client.emit('chat', {
      channel: ChatChannels.System,
      icon: ChatIcon.Error,
      message,
    });
  }

  notifyAlreadyInYourParty(name: string) {
    const message = `${capitalize(name)} ${this.client.getResourceString(EOResourceID.STATUS_LABEL_PARTY_IS_ALREADY_MEMBER)}`;
    this.client.toastController.showWarning(message);
    this.client.emit('chat', {
      channel: ChatChannels.System,
      icon: ChatIcon.Error,
      message,
    });
  }

  notifyPartyIsFull() {
    const message = this.client.getResourceString(
      EOResourceID.STATUS_LABEL_PARTY_THE_PARTY_IS_FULL,
    );
    this.client.toastController.showWarning(message);
    this.client.emit('chat', {
      channel: ChatChannels.System,
      icon: ChatIcon.Error,
      message,
    });
  }

  notifyInvitation(playerId: number, name: string, type: PartyRequestType) {
    if (
      this.client.configController.partyRequests === 'none' ||
      (this.client.configController.partyRequests === 'friends' &&
        !this.client.socialController.isFriend(name)) ||
      this.client.socialController.isIgnored(name)
    ) {
      return;
    }

    const strings = this.client.getDialogStrings(
      type === PartyRequestType.Invite
        ? DialogResourceID.PARTY_GROUP_SEND_INVITATION
        : DialogResourceID.PARTY_GROUP_REQUEST_TO_JOIN,
    );

    this.client.alertController.showConfirm(
      strings[0],
      `${capitalize(name)} ${strings[1]}`,
      (confirmed) => {
        if (confirmed) {
          this.acceptPartyRequest(playerId, type);
        }
      },
    );
  }

  private acceptPartyRequest(
    playerId: number,
    requestType: PartyRequestType,
  ): void {
    const packet = new PartyAcceptClientPacket();
    packet.inviterPlayerId = playerId;
    packet.requestType = requestType;
    this.client.bus!.send(packet);
  }

  notifyJoinedParty(members: PartyMember[]) {
    this.members = members;
    this.client.audioController.playById(SfxId.JoinParty);
    const message = this.client.getResourceString(
      EOResourceID.STATUS_LABEL_PARTY_YOU_JOINED,
    );
    this.client.toastController.show(message);
    this.client.emit('chat', {
      channel: ChatChannels.System,
      icon: ChatIcon.PlayerParty,
      message,
    });
    this.notifySubscribers();
  }

  notifyMemberJoined(member: PartyMember) {
    this.members.push(member);
    const message = `${capitalize(member.name)} ${this.client.getResourceString(EOResourceID.STATUS_LABEL_PARTY_JOINED_YOUR)}`;
    this.client.toastController.show(message);
    this.client.emit('chat', {
      channel: ChatChannels.System,
      icon: ChatIcon.PlayerParty,
      message,
    });
    this.notifySubscribers();
  }

  notifyMemberLeft(playerId: number) {
    const name = this.members.find((m) => m.playerId === playerId)?.name;
    if (!name) {
      return;
    }

    this.client.audioController.playById(SfxId.MemberLeftParty);

    const message = `${capitalize(name)} ${this.client.getResourceString(EOResourceID.STATUS_LABEL_PARTY_LEFT_THE_PARTY)}`;
    this.client.toastController.show(message);
    this.client.emit('chat', {
      channel: ChatChannels.System,
      icon: ChatIcon.PlayerParty,
      message,
    });

    this.members = this.members.filter((m) => m.playerId !== playerId);

    if (this.members.length === 1) {
      this.members = [];
    }

    this.notifySubscribers();
  }

  notifyLeftParty() {
    this.members = [];
    const message = `${this.client.locale.wordYou} ${this.client.getResourceString(EOResourceID.STATUS_LABEL_PARTY_LEFT_THE_PARTY)}`;
    this.client.toastController.show(message);
    this.client.emit('chat', {
      channel: ChatChannels.System,
      icon: ChatIcon.Error,
      message,
    });
    this.notifySubscribers();
  }

  notifyMembersUpdated(members: PartyMember[]) {
    this.members = members;
    this.notifySubscribers();
  }

  notifyMemberHpUpdated(playerId: number, hpPercentage: number) {
    const member = this.members.find((m) => m.playerId === playerId);
    if (member) {
      member.hpPercentage = hpPercentage;
    }
    this.notifySubscribers();
  }

  notifyExperienceGains(gains: PartyExpShare[]) {
    for (const gain of gains) {
      if (gain.playerId === this.client.playerId) {
        this.client.experience += gain.experience;
        if (gain.levelUp) {
          this.client.level = gain.levelUp;
        }

        const message = this.client.getExpShareMessage(
          gain.experience,
          !!gain.levelUp,
        );

        this.client.toastController.show(message);
        this.client.emit('chat', {
          message,
          icon: ChatIcon.Star,
          channel: ChatChannels.System,
        });

        this.client.emit('statsUpdate', undefined);
      }

      if (gain.levelUp) {
        const memberCharacter = this.client.getCharacterById(gain.playerId);
        if (memberCharacter) {
          this.client.audioController.playAtPosition(
            SfxId.LevelUp,
            memberCharacter.coords,
          );

          this.client.animationController.characterEmotes.set(
            gain.playerId,
            new Emote(EmoteType.LevelUp),
          );
        }

        const member = this.members.find((m) => m.playerId === gain.playerId);

        if (member) {
          member.level = gain.levelUp;
        }
      }
    }
    this.notifySubscribers();
  }
}
