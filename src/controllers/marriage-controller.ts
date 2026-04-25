import {
  MarriageReply,
  MarriageRequestClientPacket,
  MarriageRequestType,
  PriestAcceptClientPacket,
  PriestReply,
  PriestRequestClientPacket,
  PriestUseClientPacket,
} from 'eolib';
import type { Client } from '@/client';
import { DialogResourceID, EOResourceID } from '@/edf';
import { capitalize } from '@/utils';

const EDF_MARRIAGE_REPLY_MAP: Record<number, DialogResourceID> = {
  [MarriageReply.AlreadyMarried]: DialogResourceID.WEDDING_YOU_ALREADY_MARRIED,
  [MarriageReply.NotMarried]:
    DialogResourceID.WEDDING_CANNOT_DIVORCE_NO_PARTNER,
  [MarriageReply.NotEnoughGold]: DialogResourceID.WARNING_YOU_HAVE_NOT_ENOUGH,
  [MarriageReply.WrongName]: DialogResourceID.WEDDING_PARTNER_NOT_MATCH,
  [MarriageReply.ServiceBusy]: DialogResourceID.WEDDING_REGISTRATION_TOO_BUSY,
  [MarriageReply.DivorceNotification]:
    DialogResourceID.WEDDING_DIVORCE_NO_MORE_PARTNER,
};

const EDF_PRIEST_REPLY_MAP: Record<number, DialogResourceID> = {
  [PriestReply.NotDressed]: DialogResourceID.WEDDING_NEED_PROPER_CLOTHES,
  [PriestReply.LowLevel]: DialogResourceID.WEDDING_NEED_HIGHER_LEVEL,
  [PriestReply.PartnerNotPresent]: DialogResourceID.WEDDING_PARTNER_IS_MISSING,
  [PriestReply.PartnerNotDressed]:
    DialogResourceID.WEDDING_PARTNER_NEED_CLOTHES,
  [PriestReply.Busy]: DialogResourceID.WEDDING_PRIEST_IS_BUSY,
  [PriestReply.DoYou]: DialogResourceID.WEDDING_DO_YOU_ACCEPT,
  [PriestReply.PartnerAlreadyMarried]:
    DialogResourceID.WEDDING_PARTNER_ALREADY_MARRIED,
  [PriestReply.NoPermission]:
    DialogResourceID.WEDDING_NO_PERMISSION_TO_COMPLETE,
};

export class MarriageController {
  constructor(private client: Client) {}

  private sessionId = 0;
  npcName = '';

  private lawyerOpenSubscribers: ((name: string) => void)[] = [];
  private weddingApprovalSubscribers: (() => void)[] = [];

  subscribeLawyerOpen(cb: (name: string) => void) {
    this.lawyerOpenSubscribers.push(cb);
  }

  unsubscribeLawyerOpen(cb: (name: string) => void) {
    this.lawyerOpenSubscribers = this.lawyerOpenSubscribers.filter(
      (s) => s !== cb,
    );
  }

  subscribeWeddingApproval(cb: () => void) {
    this.weddingApprovalSubscribers.push(cb);
  }

  unsubscribeWeddingApproval(cb: () => void) {
    this.weddingApprovalSubscribers = this.weddingApprovalSubscribers.filter(
      (s) => s !== cb,
    );
  }

  notifyLawyerOpened(sessionId: number) {
    this.sessionId = sessionId;
    const npc = this.client.getNpcByIndex(
      this.client.npcController.interactNpcIndex,
    );
    const record = npc ? this.client.getEnfRecordById(npc.id) : null;
    this.npcName = record?.name ?? '';
    for (const cb of this.lawyerOpenSubscribers) {
      cb(this.npcName);
    }
  }

  notifyPriestOpened(sessionId: number) {
    this.sessionId = sessionId;

    const strings = this.client.getDialogStrings(
      DialogResourceID.WEDDING_PRIEST_CAN_PERFORM,
    );
    this.client.alertController.showConfirm(
      strings[0],
      strings[1],
      (confirmed) => {
        if (confirmed) {
          this.askForPartnerName();
        }
      },
    );
  }

  private askForPartnerName() {
    const strings = this.client.getDialogStrings(
      DialogResourceID.WEDDING_PRIEST_CAN_PERFORM,
    );
    this.client.alertController.showInput(
      strings[0],
      this.client.getResourceString(EOResourceID.WEDDING_PLEASE_ENTER_NAME),
      (name) => {
        if (name?.trim()) {
          this.requestMarriage(name.trim());
        }
      },
    );
  }

  private requestMarriage(name: string) {
    const packet = new PriestRequestClientPacket();
    packet.sessionId = this.sessionId;
    packet.name = name;
    this.client.bus!.send(packet);
  }

  notifyMarriageApproved(goldAmount: number) {
    this.client.inventoryController.setItem(1, goldAmount);
    const strings = this.client.getDialogStrings(
      DialogResourceID.WEDDING_REGISTRATION_COMPLETE,
    );
    this.client.alertController.show(strings[0], strings[1]);

    for (const cb of this.weddingApprovalSubscribers) {
      cb();
    }
  }

  notifyMarriageReply(replyCode: MarriageReply) {
    const strings = this.client.getDialogStrings(
      EDF_MARRIAGE_REPLY_MAP[replyCode]!,
    );
    this.client.alertController.show(
      strings[0],
      `${strings[1]}${replyCode === MarriageReply.NotEnoughGold ? ` ${this.client.locale.wordGold}` : ''}`,
    );
  }

  notifyPriestReply(replyCode: PriestReply) {
    const strings = this.client.getDialogStrings(
      EDF_PRIEST_REPLY_MAP[replyCode]!,
    );

    if (replyCode === PriestReply.DoYou) {
      this.client.alertController.showConfirm(
        strings[0],
        strings[1],
        (confirmed) => {
          if (confirmed) {
            this.sayIDo();
          }
        },
      );
      return;
    }

    this.client.alertController.show(strings[0], strings[1]);
  }

  notifyMarriageRequested(sessionId: number, partnerName: string) {
    const strings = this.client.getDialogStrings(
      DialogResourceID.WEDDING_DO_YOU_ACCEPT,
    );
    this.client.alertController.showConfirm(
      strings[0],
      `${capitalize(partnerName)} ${this.client.getResourceString(EOResourceID.WEDDING_IS_ASKING_YOU_TO_MARRY)}`,
      (confirmed) => {
        if (confirmed) {
          this.sessionId = sessionId;
          this.acceptMarriageRequest();
        }
      },
    );
  }

  private acceptMarriageRequest() {
    const packet = new PriestAcceptClientPacket();
    packet.sessionId = this.sessionId;
    this.client.bus!.send(packet);
  }

  private sayIDo() {
    const packet = new PriestUseClientPacket();
    packet.sessionId = this.sessionId;
    this.client.bus!.send(packet);
  }

  private request(name: string, type: MarriageRequestType) {
    const packet = new MarriageRequestClientPacket();
    packet.sessionId = this.sessionId;
    packet.name = name;
    packet.requestType = type;
    this.client.bus!.send(packet);
  }

  requestMarriageApproval(name: string) {
    this.request(name, MarriageRequestType.MarriageApproval);
  }

  requestDivorce(name: string) {
    this.request(name, MarriageRequestType.Divorce);
  }
}
