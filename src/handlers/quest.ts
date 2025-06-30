import {
  type EoReader,
  NpcType,
  PacketAction,
  PacketFamily,
  QuestDialogServerPacket,
} from 'eolib';
import type { Client } from '../client';

function handleQuestDialog(client: Client, reader: EoReader) {
  const packet = QuestDialogServerPacket.deserialize(reader);
  const record = client.getEnfRecordByBehaviorId(
    NpcType.Quest,
    packet.behaviorId,
  );
  if (!record) {
    return;
  }

  client.sessionId = packet.sessionId;

  client.emit('openQuestDialog', {
    name: record.name,
    questId: packet.questId,
    quests: packet.questEntries,
    dialog: packet.dialogEntries,
  });
}

export function registerQuestHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Quest,
    PacketAction.Dialog,
    (reader) => handleQuestDialog(client, reader),
  );
}
