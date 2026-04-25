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
type TrackedQuestChangedSubscriber = (names: string[]) => void;

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

  private sessionId = 0;

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

  // Tracked quests — up to 3, persisted per character (FIFO)
  trackedQuestNames: string[] = [];

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
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.trackedQuestNames = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        this.trackedQuestNames = [];
      }
    } catch {
      this.trackedQuestNames = [];
    }
  }

  /** Toggle tracking for a quest. FIFO — oldest slot evicted when at max 3. */
  toggleTrackedQuest(name: string): void {
    const idx = this.trackedQuestNames.indexOf(name);
    if (idx !== -1) {
      this.trackedQuestNames = this.trackedQuestNames.filter((n) => n !== name);
    } else {
      const next = [...this.trackedQuestNames, name];
      this.trackedQuestNames =
        next.length > 3 ? next.slice(next.length - 3) : next;
    }
    const key = trackedQuestKey(this.client.characterId);
    try {
      if (this.trackedQuestNames.length > 0) {
        localStorage.setItem(key, JSON.stringify(this.trackedQuestNames));
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      // ignore storage errors
    }
    for (const cb of this.trackedQuestChangedSubscribers) {
      cb(this.trackedQuestNames);
    }
  }

  // ── Handlers called by packet handlers ──────────────────────────────────

  handleDialogOpened(
    data: Omit<QuestDialogState, 'pendingQuests'>,
    sessionId: number,
  ): void {
    this.sessionId = sessionId;
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
      if (!alreadyTracked && this.trackedQuestNames.length < 3) {
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
        this.trackedQuestNames.length < 3
      ) {
        this._pendingAutoTrack = false;
        this.toggleTrackedQuest(progress[0].name);
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
    packet.sessionId = this.sessionId;
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

  private _refreshDebounce?: number;
  refreshQuestProgress(): void {
    if (this._refreshDebounce !== undefined) {
      clearTimeout(this._refreshDebounce);
    }
    this._refreshDebounce = setTimeout(() => {
      this.sendRefreshProgressPacket();
    }, 100);
  }

  private sendRefreshProgressPacket(): void {
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
