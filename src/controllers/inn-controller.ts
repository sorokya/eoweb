import {
  CitizenAcceptClientPacket,
  CitizenRemoveClientPacket,
  CitizenReplyClientPacket,
  CitizenRequestClientPacket,
  InnUnsubscribeReply,
} from 'eolib';
import type { Client } from '@/client';
import { GOLD_ITEM_ID } from '@/consts';
import { EOResourceID } from '@/edf';
import { ChatIcon } from '@/ui/enums';

type OpenedSubscriber = (
  npcName: string,
  currentHomeId: number,
  questions: string[],
) => void;
type CloseSubscriber = () => void;

export class InnController {
  private client: Client;
  npcName = '';
  behaviorId = 0;
  currentHomeId = 0;
  sessionId = 0;
  questions: string[] = [];

  private openedSubscribers: OpenedSubscriber[] = [];
  private closeSubscribers: CloseSubscriber[] = [];

  constructor(client: Client) {
    this.client = client;
  }

  subscribeOpened(cb: OpenedSubscriber): void {
    this.openedSubscribers.push(cb);
  }

  unsubscribeOpened(cb: OpenedSubscriber): void {
    this.openedSubscribers = this.openedSubscribers.filter((s) => s !== cb);
  }

  subscribeClose(cb: CloseSubscriber): void {
    this.closeSubscribers.push(cb);
  }

  unsubscribeClose(cb: CloseSubscriber): void {
    this.closeSubscribers = this.closeSubscribers.filter((s) => s !== cb);
  }

  handleOpened(
    behaviorId: number,
    currentHomeId: number,
    sessionId: number,
    questions: string[],
  ): void {
    this.behaviorId = behaviorId;
    this.currentHomeId = currentHomeId;
    this.sessionId = sessionId;
    this.questions = questions;

    const npc = this.client.getNpcByIndex(
      this.client.npcController.interactNpcIndex,
    );
    const record = npc ? this.client.getEnfRecordById(npc.id) : null;
    this.npcName = record?.name ?? this.client.locale.innKeeper.title;

    for (const cb of this.openedSubscribers)
      cb(this.npcName, currentHomeId, questions);
  }

  handleCitizenshipResult(questionsWrong: number): void {
    if (questionsWrong === 0) {
      this.currentHomeId = this.behaviorId;
      const msg = this.client.locale.innKeeper.becameCitizenMsg;
      this.client.toastController.showSuccess(msg);
      this.client.chatController.notifyServerChat({
        message: msg,
        icon: ChatIcon.Star,
      });
      for (const cb of this.closeSubscribers) cb();
    } else {
      const msg = this.client.locale.innKeeper.wrongAnswersMsg;
      this.client.toastController.showError(msg);
      this.client.chatController.notifyServerChat({
        message: msg,
        icon: ChatIcon.DotDotDotDot,
      });
    }
  }

  handleSleepCost(cost: number): void {
    this.client.alertController.showConfirm(
      this.client.getResourceString(EOResourceID.INN_SLEEP),
      `${this.client.getResourceString(EOResourceID.INN_A_GOOD_NIGHT_REST_WILL_COST_YOU)} ${cost.toLocaleString()} ${this.client.locale.shared.wordGold}?`,
      (ok) => {
        if (ok) this.sleepAccept();
      },
    );
  }

  handleSleepConfirmed(goldAmount: number): void {
    this.client.inventoryController.setItem(GOLD_ITEM_ID, goldAmount);
    const msg = this.client.locale.innKeeper.sleptMsg;
    this.client.toastController.showSuccess(msg);
    this.client.chatController.notifyServerChat({
      message: msg,
      icon: ChatIcon.Star,
    });
    this.client.hp = this.client.maxHp;
    this.client.tp = this.client.maxTp;
    this.client.statsController.notifyStatsUpdated();
    for (const cb of this.closeSubscribers) cb();
  }

  handleRemoved(replyCode: InnUnsubscribeReply): void {
    if (replyCode === InnUnsubscribeReply.Unsubscribed) {
      this.currentHomeId = 0;
      const msg = this.client.locale.innKeeper.gaveUpCitizenshipMsg;
      this.client.toastController.showSuccess(msg);
      this.client.chatController.notifyServerChat({
        message: msg,
        icon: ChatIcon.Star,
      });
      for (const cb of this.closeSubscribers) cb();
    } else {
      const msg = this.client.locale.innKeeper.notCitizenMsg;
      this.client.toastController.showError(msg);
      this.client.chatController.notifyServerChat({
        message: msg,
        icon: ChatIcon.DotDotDotDot,
      });
    }
  }

  becomeCitizen(answers: string[]): void {
    const packet = new CitizenReplyClientPacket();
    packet.sessionId = this.sessionId;
    packet.behaviorId = this.behaviorId;
    packet.answers = answers;
    this.client.bus!.send(packet);
  }

  giveUpCitizenship(): void {
    this.client.alertController.showConfirm(
      this.client.locale.innKeeper.confirmGiveUpTitle,
      this.client.locale.innKeeper.confirmGiveUpMsg,
      (confirmed) => {
        if (confirmed) {
          const packet = new CitizenRemoveClientPacket();
          packet.behaviorId = this.behaviorId;
          this.client.bus!.send(packet);
        }
      },
    );
  }

  sleepRequest(): void {
    const packet = new CitizenRequestClientPacket();
    packet.sessionId = this.sessionId;
    packet.behaviorId = this.behaviorId;
    this.client.bus!.send(packet);
  }

  private sleepAccept(): void {
    const packet = new CitizenAcceptClientPacket();
    packet.sessionId = this.sessionId;
    packet.behaviorId = this.behaviorId;
    this.client.bus!.send(packet);
  }
}
