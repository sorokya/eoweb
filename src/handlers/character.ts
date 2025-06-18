import {
  AccountCreateClientPacket,
  AccountReply,
  AccountReplySequenceStart,
  AccountReplyServerPacket,
  CharacterCreateClientPacket,
  CharacterReply,
  CharacterReplyServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';

function handleCharacterReply(client: Client, reader: EoReader) {
  const packet = CharacterReplyServerPacket.deserialize(reader);
  switch (packet.replyCode) {
    case CharacterReply.Exists:
      client.showError('A character with that name already exists');
      return;
    case CharacterReply.NotApproved:
      client.showError('That character name is not approved');
      return;
    case CharacterReply.Full:
      client.showError('You have too many characters');
      return;
    case CharacterReply.Deleted:
      client.showError('Your character has been deleted', 'Success');
      return;
    case CharacterReply.Ok: {
      const data =
        packet.replyCodeData as CharacterReplyServerPacket.ReplyCodeDataOk;
      client.emit('characterCreated', data.characters);
      return;
    }
    default: {
      const characterData = client.characterCreateData;
      if (!characterData) {
        return;
      }

      const reply = new CharacterCreateClientPacket();
      reply.sessionId = packet.replyCode as number;
      reply.name = characterData.name;
      reply.gender = characterData.gender;
      reply.hairColor = characterData.hairColor;
      reply.hairStyle = characterData.hairStyle;
      reply.skin = characterData.skin;

      client.bus.send(reply);
      break;
    }
  }
}

export function registerCharacterHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Character,
    PacketAction.Reply,
    (reader) => handleCharacterReply(client, reader),
  );
}
