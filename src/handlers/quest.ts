import {
  type EoReader,
  NpcType,
  PacketAction,
  PacketFamily,
  QuestDialogServerPacket,
  QuestListServerPacket,
  QuestPage,
  QuestReportServerPacket,
} from 'eolib';
import type { Client } from '@/client';

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

  client.questController.handleDialogOpened({
    npcName: record.name,
    dialogId: packet.dialogId,
    questId: packet.questId,
    quests: packet.questEntries,
    dialogEntries: packet.dialogEntries,
  });
}

function handleQuestList(client: Client, reader: EoReader) {
  const packet = QuestListServerPacket.deserialize(reader);
  if (packet.page === QuestPage.Progress) {
    const entries =
      (
        packet.pageData as InstanceType<
          typeof QuestListServerPacket.PageDataProgress
        >
      ).questProgressEntries ?? [];
    client.questController.handleQuestListReceived(
      QuestPage.Progress,
      entries,
      [],
    );
  } else {
    const names =
      (
        packet.pageData as InstanceType<
          typeof QuestListServerPacket.PageDataHistory
        >
      ).completedQuests ?? [];
    client.questController.handleQuestListReceived(
      QuestPage.History,
      [],
      names,
    );
  }
}

function handleQuestReport(client: Client, reader: EoReader) {
  const packet = QuestReportServerPacket.deserialize(reader);
  client.npcController.queuedNpcChats.set(packet.npcIndex, packet.messages);
}

export function registerQuestHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Quest,
    PacketAction.Dialog,
    (reader) => handleQuestDialog(client, reader),
  );

  client.bus!.registerPacketHandler(
    PacketFamily.Quest,
    PacketAction.List,
    (reader) => handleQuestList(client, reader),
  );

  client.bus!.registerPacketHandler(
    PacketFamily.Quest,
    PacketAction.Report,
    (reader) => handleQuestReport(client, reader),
  );
}
