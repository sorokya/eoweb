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
import { ChatTab, type Client } from '../client';
import { DialogResourceID, EOResourceID } from '../edf';
import { Emote } from '../render/emote';
import { playSfxById, SfxId } from '../sfx';
import { ChatIcon } from '../ui/chat';
import { capitalize } from '../utils/capitalize';

function handlePartyReply(client: Client, reader: EoReader) {
  const packet = PartyReplyServerPacket.deserialize(reader);
  switch (packet.replyCode) {
    case PartyReplyCode.AlreadyInAnotherParty: {
      client.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_WARNING,
        client.getResourceString(
          EOResourceID.STATUS_LABEL_PARTY_IS_ALREADY_IN_ANOTHER_PARTY,
        ),
      );
      return;
    }
    case PartyReplyCode.AlreadyInYourParty: {
      client.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
        client.getResourceString(
          EOResourceID.STATUS_LABEL_PARTY_IS_ALREADY_MEMBER,
        ),
      );
      return;
    }
    case PartyReplyCode.PartyIsFull: {
      client.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_WARNING,
        client.getResourceString(
          EOResourceID.STATUS_LABEL_PARTY_THE_PARTY_IS_FULL,
        ),
      );
      return;
    }
  }
}

function handlePartyRequest(client: Client, reader: EoReader) {
  const packet = PartyRequestServerPacket.deserialize(reader);
  const inviter = client.getCharacterById(packet.inviterPlayerId);
  if (!inviter) {
    client.requestCharacterRange([packet.inviterPlayerId]);
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
      client.acceptPartyRequest(packet.inviterPlayerId, packet.requestType);
    },
  );
}

function handlePartyCreate(client: Client, reader: EoReader) {
  const packet = PartyCreateServerPacket.deserialize(reader);
  client.partyMembers = packet.members;
  playSfxById(SfxId.JoinParty);
  client.setStatusLabel(
    EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
    client.getResourceString(EOResourceID.STATUS_LABEL_PARTY_YOU_JOINED),
  );
  client.emit('chat', {
    tab: ChatTab.System,
    icon: ChatIcon.PlayerParty,
    message: client.getResourceString(
      EOResourceID.STATUS_LABEL_PARTY_YOU_JOINED,
    ),
  });
  client.emit('partyUpdated', undefined);
}

function handlePartyAdd(client: Client, reader: EoReader) {
  const packet = PartyAddServerPacket.deserialize(reader);
  client.partyMembers.push(packet.member);
  client.setStatusLabel(
    EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
    `${capitalize(packet.member.name)} ${client.getResourceString(EOResourceID.STATUS_LABEL_PARTY_JOINED_YOUR)}`,
  );
  client.emit('chat', {
    tab: ChatTab.System,
    icon: ChatIcon.PlayerParty,
    message: `${capitalize(packet.member.name)} ${client.getResourceString(
      EOResourceID.STATUS_LABEL_PARTY_YOU_JOINED,
    )}`,
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

  client.setStatusLabel(
    EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
    `${capitalize(member.name)} ${client.getResourceString(EOResourceID.STATUS_LABEL_PARTY_LEFT_YOUR)}`,
  );
  client.emit('chat', {
    tab: ChatTab.System,
    icon: ChatIcon.PlayerParty,
    message: `${capitalize(member.name)} ${client.getResourceString(
      EOResourceID.STATUS_LABEL_PARTY_LEFT_YOUR,
    )}`,
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
    const member = client.partyMembers.find(
      (m) => m.playerId === gain.playerId,
    );
    if (!member) {
      continue;
    }

    if (member.playerId === client.playerId) {
      client.experience += gain.experience;
      client.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
        `${client.getResourceString(EOResourceID.STATUS_LABEL_YOU_GAINED_EXP)} ${gain.experience} EXP`,
      );
      client.emit('chat', {
        message: `${client.getResourceString(EOResourceID.STATUS_LABEL_YOU_GAINED_EXP)} ${gain.experience} EXP`,
        icon: ChatIcon.Star,
        tab: ChatTab.System,
      });

      if (gain.levelUp) {
        client.level = gain.levelUp;
      }
      client.emit('statsUpdate', undefined);
    }

    if (gain.levelUp) {
      member.level = gain.levelUp;
      const memberCharacter = client.getCharacterById(member.playerId);
      if (memberCharacter) {
        playSfxById(SfxId.LevelUp);
        client.characterEmotes.set(
          member.playerId,
          new Emote(EmoteType.LevelUp),
        );
      }
    }
  }

  client.emit('partyUpdated', undefined);
}

export function registerPartyHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Party,
    PacketAction.Reply,
    (reader) => handlePartyReply(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Party,
    PacketAction.Request,
    (reader) => handlePartyRequest(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Party,
    PacketAction.Create,
    (reader) => handlePartyCreate(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Party,
    PacketAction.Add,
    (reader) => handlePartyAdd(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Party,
    PacketAction.Remove,
    (reader) => handlePartyRemove(client, reader),
  );
  client.bus.registerPacketHandler(PacketFamily.Party, PacketAction.Close, () =>
    handlePartyClose(client),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Party,
    PacketAction.List,
    (reader) => handlePartyList(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Party,
    PacketAction.Agree,
    (reader) => handlePartyAgree(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Party,
    PacketAction.TargetGroup,
    (reader) => handlePartyTargetGroup(client, reader),
  );
}
