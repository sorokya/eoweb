import {
  CharacterCreateClientPacket,
  CharacterPlayerServerPacket,
  CharacterReply,
  CharacterReplyServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';
import { DialogResourceID } from '../edf';
import { playSfxById, SfxId } from '../sfx';

function handleCharacterReply(client: Client, reader: EoReader) {
  const packet = CharacterReplyServerPacket.deserialize(reader);
  switch (packet.replyCode) {
    case CharacterReply.Exists: {
      const text = client.getDialogStrings(
        DialogResourceID.CHARACTER_CREATE_NAME_EXISTS,
      );
      client.showError(text[1], text[0]);
      return;
    }
    case CharacterReply.NotApproved: {
      const text = client.getDialogStrings(
        DialogResourceID.CHARACTER_CREATE_NAME_NOT_APPROVED,
      );
      client.showError(text[1], text[0]);
      return;
    }
    case CharacterReply.Full:
      {
        const text = client.getDialogStrings(
          DialogResourceID.CHARACTER_CREATE_TOO_MANY_CHARS,
        );
        client.showError(text[1], text[0]);
      }
      return;
    case CharacterReply.Deleted: {
      const data =
        packet.replyCodeData as CharacterReplyServerPacket.ReplyCodeDataDeleted;
      client.emit('characterDeleted', data.characters);
      playSfxById(SfxId.DeleteCharacter);
      return;
    }
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

function handleCharacterPlayer(client: Client, reader: EoReader) {
  const packet = CharacterPlayerServerPacket.deserialize(reader);
  client.sessionId = packet.sessionId;
}

export function registerCharacterHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Character,
    PacketAction.Reply,
    (reader) => handleCharacterReply(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Character,
    PacketAction.Player,
    (reader) => handleCharacterPlayer(client, reader),
  );
}
