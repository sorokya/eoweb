import {
  type DialogEntry,
  type DialogQuestEntry,
  DialogReply,
  QuestAcceptClientPacket,
  QuestListClientPacket,
  QuestPage,
  type QuestProgressEntry,
  QuestUseClientPacket,
} from 'eolib';

import type { Client } from '@/client';

type DialogOpenedSubscriber = (data: QuestDialogState) => void;
type DialogUpdatedSubscriber = (data: QuestDialogState) => void;
type QuestListSubscriber = (
  page: QuestPage,
  progress: QuestProgressEntry[],
  history: string[],
) => void;
type BookOpenedSubscriber = (questNames: string[]) => void;
type TrackedQuestChangedSubscriber = (name: string | null) => void;

export type QuestDialogState = {
  npcName: string;
  questId: number;
  dialogId: number;
  quests: DialogQuestEntry[];
  pendingQuests: DialogQuestEntry[];
  dialogEntries: DialogEntry[];
};

function trackedQuestKey(characterId: number): string {
  return `eoweb:tracked-quest:${characterId}`;
}

export class QuestController {
  private client: Client;

  // Current NPC dialog state
  npcName = '';
  questId = 0;
  dialogId = 0;
  quests: DialogQuestEntry[] = [];
  pendingQuests: DialogQuestEntry[] = [];
  dialogEntries: DialogEntry[] = [];

  // Cached quest progress / history
  progressQuests: QuestProgressEntry[] = [];
  historyQuests: string[] = [];

  // Book (completed quests shown in character dialog)
  bookQuestNames: string[] = [];

  // Tracked quest (persisted per character)
  trackedQuestName: string | null = null;

  private dialogOpenedSubscribers: DialogOpenedSubscriber[] = [];
  private dialogUpdatedSubscribers: DialogUpdatedSubscriber[] = [];
  private questListSubscribers: QuestListSubscriber[] = [];
  private bookOpenedSubscribers: BookOpenedSubscriber[] = [];
  private trackedQuestChangedSubscribers: TrackedQuestChangedSubscriber[] = [];

  constructor(client: Client) {
    this.client = client;
  }

  // ── Persistence ──────────────────────────────────────────────────────────

  loadTrackedQuest(): void {
    const key = trackedQuestKey(this.client.characterId);
    try {
      this.trackedQuestName = localStorage.getItem(key) ?? null;
    } catch {
      this.trackedQuestName = null;
    }
  }

  setTrackedQuest(name: string | null): void {
    this.trackedQuestName = name;
    const key = trackedQuestKey(this.client.characterId);
    try {
      if (name !== null) {
        localStorage.setItem(key, name);
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      // ignore storage errors
    }
    for (const cb of this.trackedQuestChangedSubscribers) {
      cb(name);
    }
  }

  // ── Handlers called by packet handlers ──────────────────────────────────

  handleDialogOpened(data: Omit<QuestDialogState, 'pendingQuests'>): void {
    this.npcName = data.npcName;
    this.questId = data.questId;
    this.dialogId = data.dialogId;
    this.quests = data.quests;
    this.dialogEntries = data.dialogEntries;

    if (data.quests.length > 0) {
      this.pendingQuests = data.quests;
    }

    // Auto-track when we first see dialog content for a new quest
    if (data.dialogEntries.length > 0) {
      const alreadyTracked = this.progressQuests.some(
        (q) => q.name === data.npcName,
      );
      if (!alreadyTracked && this.trackedQuestName === null) {
        this._pendingAutoTrack = true;
      }
    }

    const full: QuestDialogState = {
      ...data,
      quests: this.quests,
      pendingQuests: this.pendingQuests,
    };

    for (const cb of this.dialogOpenedSubscribers) {
      cb(full);
    }
  }

  private _pendingAutoTrack = false;

  handleDialogUpdated(data: Omit<QuestDialogState, 'pendingQuests'>): void {
    this.questId = data.questId;
    this.dialogId = data.dialogId;
    this.quests = data.quests;
    this.dialogEntries = data.dialogEntries;

    const full: QuestDialogState = {
      ...data,
      pendingQuests: this.pendingQuests,
    };
    for (const cb of this.dialogUpdatedSubscribers) {
      cb(full);
    }
  }

  handleQuestListReceived(
    page: QuestPage,
    progress: QuestProgressEntry[],
    history: string[],
  ): void {
    if (page === QuestPage.Progress) {
      this.progressQuests = progress;

      // Auto-track the first new quest if pending
      if (
        this._pendingAutoTrack &&
        progress.length > 0 &&
        this.trackedQuestName === null
      ) {
        this._pendingAutoTrack = false;
        this.setTrackedQuest(progress[0].name);
      } else {
        this._pendingAutoTrack = false;
      }
    } else {
      this.historyQuests = history;
    }
    for (const cb of this.questListSubscribers) {
      cb(page, progress, history);
    }
  }

  handleBookOpened(questNames: string[]): void {
    this.bookQuestNames = questNames;
    for (const cb of this.bookOpenedSubscribers) {
      cb(questNames);
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  resetDialog(): void {
    this.pendingQuests = [];
    this.quests = [];
    this.dialogEntries = [];
  }

  // Select a quest from the NPC's quest list (sends QuestUseClientPacket with specific questId)
  selectQuest(questId: number): void {
    const packet = new QuestUseClientPacket();
    packet.npcIndex = this.client.npcController.interactNpcIndex;
    packet.questId = questId;
    this.client.bus!.send(packet);
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
    // Refresh progress after advancing the dialog
    this.refreshQuestProgress();
  }

  refreshQuestProgress(): void {
    const packet = new QuestListClientPacket();
    packet.page = QuestPage.Progress;
    this.client.bus!.send(packet);
  }

  refreshQuestHistory(): void {
    const packet = new QuestListClientPacket();
    packet.page = QuestPage.History;
    this.client.bus!.send(packet);
  }

  // ── Subscribe / Unsubscribe ───────────────────────────────────────────────

  subscribeDialogOpened(cb: DialogOpenedSubscriber): void {
    this.dialogOpenedSubscribers.push(cb);
  }
  unsubscribeDialogOpened(cb: DialogOpenedSubscriber): void {
    this.dialogOpenedSubscribers = this.dialogOpenedSubscribers.filter(
      (s) => s !== cb,
    );
  }

  subscribeDialogUpdated(cb: DialogUpdatedSubscriber): void {
    this.dialogUpdatedSubscribers.push(cb);
  }
  unsubscribeDialogUpdated(cb: DialogUpdatedSubscriber): void {
    this.dialogUpdatedSubscribers = this.dialogUpdatedSubscribers.filter(
      (s) => s !== cb,
    );
  }

  subscribeQuestListReceived(cb: QuestListSubscriber): void {
    this.questListSubscribers.push(cb);
  }
  unsubscribeQuestListReceived(cb: QuestListSubscriber): void {
    this.questListSubscribers = this.questListSubscribers.filter(
      (s) => s !== cb,
    );
  }

  subscribeBookOpened(cb: BookOpenedSubscriber): void {
    this.bookOpenedSubscribers.push(cb);
  }
  unsubscribeBookOpened(cb: BookOpenedSubscriber): void {
    this.bookOpenedSubscribers = this.bookOpenedSubscribers.filter(
      (s) => s !== cb,
    );
  }

  subscribeTrackedQuestChanged(cb: TrackedQuestChangedSubscriber): void {
    this.trackedQuestChangedSubscribers.push(cb);
  }
  unsubscribeTrackedQuestChanged(cb: TrackedQuestChangedSubscriber): void {
    this.trackedQuestChangedSubscribers =
      this.trackedQuestChangedSubscribers.filter((s) => s !== cb);
  }
}
