import { DialogReply, QuestAcceptClientPacket } from 'eolib';

import type { Client } from '@/client';

export class QuestController {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  questReply(questId: number, dialogId: number, action: number | null): void {
    const packet = new QuestAcceptClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.questId = questId;
    packet.npcIndex = this.client.npcController.interactNpcIndex;
    packet.dialogId = dialogId;
    packet.replyType = action !== null ? DialogReply.Link : DialogReply.Ok;
    if (action !== null) {
      packet.replyTypeData = new QuestAcceptClientPacket.ReplyTypeDataLink();
      packet.replyTypeData.action = action;
    } else {
      packet.replyTypeData = new QuestAcceptClientPacket.ReplyTypeDataOk();
    }
    this.client.bus!.send(packet);
  }
}
