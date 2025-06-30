import {
  type EoReader,
  NpcType,
  PacketAction,
  PacketFamily,
  QuestDialogServerPacket,
  QuestReportServerPacket,
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

function handleQuestReport(client: Client, reader: EoReader) {
  const packet = QuestReportServerPacket.deserialize(reader);
  client.queuedNpcChats.set(packet.npcIndex, packet.messages);
}

export function registerQuestHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Quest,
    PacketAction.Dialog,
    (reader) => handleQuestDialog(client, reader),
  );

  client.bus.registerPacketHandler(
    PacketFamily.Quest,
    PacketAction.Report,
    (reader) => handleQuestReport(client, reader),
  );
}
