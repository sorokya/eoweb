import {
  Emote as EmoteType,
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
  PartyRequestType,
  PartyTargetGroupServerPacket,
} from 'eolib';
import type { Client } from '@/client';
import { DialogResourceID, EOResourceID } from '@/edf';
import { Emote } from '@/render';
import { playSfxById, SfxId } from '@/sfx';
import { ChatChannels, ChatIcon } from '@/ui/enums';
import { capitalize } from '@/utils';

function handlePartyReply(client: Client, reader: EoReader) {
  const packet = PartyReplyServerPacket.deserialize(reader);
  switch (packet.replyCode) {
    case PartyReplyCode.AlreadyInAnotherParty: {
      const data =
        packet.replyCodeData as PartyReplyServerPacket.ReplyCodeDataAlreadyInAnotherParty;
      const message = `${capitalize(data.playerName)} ${client.getResourceString(EOResourceID.STATUS_LABEL_PARTY_IS_ALREADY_IN_ANOTHER_PARTY)}`;
      client.toastController.showWarning(message);
      client.emit('chat', {
        channel: ChatChannels.System,
        icon: ChatIcon.Error,
        message,
      });
      return;
    }
    case PartyReplyCode.AlreadyInYourParty: {
      const data =
        packet.replyCodeData as PartyReplyServerPacket.ReplyCodeDataAlreadyInYourParty;
      const message = `${capitalize(data.playerName)} ${client.getResourceString(EOResourceID.STATUS_LABEL_PARTY_IS_ALREADY_MEMBER)}`;
      client.toastController.showWarning(message);
      client.emit('chat', {
        channel: ChatChannels.System,
        icon: ChatIcon.Error,
        message,
      });
      return;
    }
    case PartyReplyCode.PartyIsFull: {
      const message = client.getResourceString(
        EOResourceID.STATUS_LABEL_PARTY_THE_PARTY_IS_FULL,
      );
      client.toastController.showWarning(message);
      client.emit('chat', {
        channel: ChatChannels.System,
        icon: ChatIcon.Error,
        message,
      });
      return;
    }
  }
}

function handlePartyRequest(client: Client, reader: EoReader) {
  const packet = PartyRequestServerPacket.deserialize(reader);
  const inviter = client.getCharacterById(packet.inviterPlayerId);
  if (!inviter) {
    client.sessionController.requestCharacterRange([packet.inviterPlayerId]);
  }

  const strings = client.getDialogStrings(
    packet.requestType === PartyRequestType.Invite
      ? DialogResourceID.PARTY_GROUP_SEND_INVITATION
      : DialogResourceID.PARTY_GROUP_REQUEST_TO_JOIN,
  );

  client.showConfirmation(
    `${capitalize(packet.playerName)} ${strings[1]}`,
    strings[0],
    () => {
      client.socialController.acceptPartyRequest(
        packet.inviterPlayerId,
        packet.requestType,
      );
    },
  );
}

function handlePartyCreate(client: Client, reader: EoReader) {
  const packet = PartyCreateServerPacket.deserialize(reader);
  client.partyMembers = packet.members;
  playSfxById(SfxId.JoinParty);
  const message = client.getResourceString(
    EOResourceID.STATUS_LABEL_PARTY_YOU_JOINED,
  );
  client.toastController.show(message);
  client.emit('chat', {
    channel: ChatChannels.System,
    icon: ChatIcon.PlayerParty,
    message,
  });
  client.emit('partyUpdated', undefined);
}

function handlePartyAdd(client: Client, reader: EoReader) {
  const packet = PartyAddServerPacket.deserialize(reader);
  client.partyMembers.push(packet.member);
  const message = `${capitalize(packet.member.name)} ${client.getResourceString(EOResourceID.STATUS_LABEL_PARTY_JOINED_YOUR)}`;
  client.toastController.show(message);
  client.emit('chat', {
    channel: ChatChannels.System,
    icon: ChatIcon.PlayerParty,
    message,
  });
  client.emit('partyUpdated', undefined);
}

function handlePartyRemove(client: Client, reader: EoReader) {
  const packet = PartyRemoveServerPacket.deserialize(reader);
  const member = client.partyMembers.find(
    (m) => m.playerId === packet.playerId,
  );
  if (!member) {
    return;
  }

  playSfxById(SfxId.MemberLeftParty);

  const message = `${capitalize(member.name)} ${client.getResourceString(EOResourceID.STATUS_LABEL_PARTY_LEFT_YOUR)}`;
  client.toastController.show(message);
  client.emit('chat', {
    channel: ChatChannels.System,
    icon: ChatIcon.PlayerParty,
    message,
  });

  client.partyMembers = client.partyMembers.filter(
    (m) => m.playerId !== packet.playerId,
  );

  if (client.partyMembers.length === 1) {
    client.partyMembers = [];
  }

  client.emit('partyUpdated', undefined);
}

function handlePartyClose(client: Client) {
  client.partyMembers = [];
  client.emit('partyUpdated', undefined);
}

function handlePartyList(client: Client, reader: EoReader) {
  const packet = PartyListServerPacket.deserialize(reader);
  client.partyMembers = packet.members;
  client.emit('partyUpdated', undefined);
}

function handlePartyAgree(client: Client, reader: EoReader) {
  const packet = PartyAgreeServerPacket.deserialize(reader);
  const member = client.partyMembers.find(
    (m) => m.playerId === packet.playerId,
  );
  if (!member) {
    return;
  }

  member.hpPercentage = packet.hpPercentage;
  client.emit('partyUpdated', undefined);
}

function handlePartyTargetGroup(client: Client, reader: EoReader) {
  const packet = PartyTargetGroupServerPacket.deserialize(reader);
  for (const gain of packet.gains) {
    if (gain.playerId === client.playerId) {
      client.experience += gain.experience;
      if (gain.levelUp) {
        client.level = gain.levelUp;
      }

      const message = client.getExpShareMessage(
        gain.experience,
        !!gain.levelUp,
      );

      client.toastController.show(message);
      client.emit('chat', {
        message,
        icon: ChatIcon.Star,
        channel: ChatChannels.System,
      });

      client.emit('statsUpdate', undefined);
    }

    if (gain.levelUp) {
      const memberCharacter = client.getCharacterById(gain.playerId);
      if (memberCharacter) {
        playSfxById(SfxId.LevelUp);
        client.animationController.characterEmotes.set(
          gain.playerId,
          new Emote(EmoteType.LevelUp),
        );
      }

      const member = client.partyMembers.find(
        (m) => m.playerId === gain.playerId,
      );

      if (member) {
        member.level = gain.levelUp;
      }
    }
  }

  client.emit('partyUpdated', undefined);
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
