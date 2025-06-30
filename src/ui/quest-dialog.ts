import {
  type DialogEntry,
  DialogEntryType,
  type DialogQuestEntry,
} from 'eolib';
import mitt from 'mitt';
import { playSfxById, SfxId } from '../sfx';
import { Base } from './base-ui';

type Events = {
  reply: { questId: number; dialogId: number; action: number | null };
};

export class QuestDialog extends Base {
  protected container = document.getElementById('quest-dialog');
  private emitter = mitt<Events>();
  private cover: HTMLDivElement = document.querySelector('#cover');
  private txtTitle: HTMLSpanElement = this.container.querySelector('.title');
  private btnQuestSelect: HTMLButtonElement = this.container.querySelector(
    'button[data-id="quest-select"]',
  );
  private entries: HTMLUListElement = this.container.querySelector('.entries');
  private btnCancel: HTMLButtonElement = this.container.querySelector(
    'button[data-id="cancel"]',
  );
  private btnBack: HTMLButtonElement = this.container.querySelector(
    'button[data-id="back"]',
  );
  private btnNext: HTMLButtonElement = this.container.querySelector(
    'button[data-id="next"]',
  );
  private btnOk: HTMLButtonElement = this.container.querySelector(
    'button[data-id="ok"]',
  );

  private questId = 0;
  private name = '';
  private title = '';
  private quests: DialogQuestEntry[] = [];
  private dialog: DialogEntry[] = [];
  private dialogIndex = 0;
  private state: 'dialog' | 'quest-picker' = 'dialog';

  on<Event extends keyof Events>(
    event: Event,
    handler: (data: Events[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }

  setData(
    questId: number,
    name: string,
    quests: DialogQuestEntry[],
    dialog: DialogEntry[],
  ) {
    this.questId = questId;
    this.name = name;
    this.quests = quests;
    this.dialog = dialog;
    this.dialogIndex = 0;
    this.updateQuestTitle();

    this.btnQuestSelect.classList.add('hidden');
    if (this.quests.length > 1) {
      this.btnQuestSelect.classList.remove('hidden');
    }

    this.render();
  }

  private updateQuestTitle() {
    const quest = this.quests.find((q) => q.questId === this.questId);
    if (!quest) {
      this.title = 'Unknown';
      return;
    }

    this.title = `${this.name} - ${quest.questName}`;
  }

  private render() {
    this.entries.innerHTML = '';
    this.btnBack.classList.add('hidden');
    this.btnCancel.classList.add('hidden');
    this.btnOk.classList.add('hidden');
    this.btnNext.classList.add('hidden');

    if (this.state === 'dialog') {
      this.renderDialog();
    } else {
      this.renderQuestPicker();
    }
  }

  private renderDialog() {
    this.txtTitle.innerText = this.title;

    const entry = this.dialog[this.dialogIndex];
    if (!entry) {
      return;
    }

    const li = document.createElement('li');
    li.innerText = entry.line;
    this.entries.appendChild(li);

    let i = 1;
    while (true) {
      const nextEntry = this.dialog[this.dialogIndex + i];
      if (!nextEntry || nextEntry.entryType === DialogEntryType.Text) {
        break;
      }

      if (i === 1) {
        const blank = document.createElement('li');
        blank.innerText = '\xa0';
        this.entries.appendChild(blank);
      }

      const link = document.createElement('li');
      link.classList.add('link');
      link.innerText = nextEntry.line;
      const data = nextEntry.entryTypeData as DialogEntry.EntryTypeDataLink;
      link.addEventListener('click', () => {
        playSfxById(SfxId.ButtonClick);
        this.hide();
        this.emitter.emit('reply', {
          questId: this.questId,
          dialogId: this.dialogIndex,
          action: data.linkId,
        });
      });
      this.entries.appendChild(link);

      i++;
    }

    if (this.dialogIndex === 0) {
      this.btnCancel.classList.remove('hidden');
    } else {
      this.btnBack.classList.remove('hidden');
    }

    const textDialogsCount = this.dialog.filter(
      (d) => d.entryType === DialogEntryType.Text,
    ).length;
    if (this.dialogIndex === textDialogsCount - 1) {
      this.btnOk.classList.remove('hidden');
    } else {
      this.btnNext.classList.remove('hidden');
    }
  }

  private renderQuestPicker() {
    this.txtTitle.innerText = 'Select a quest';
    this.btnCancel.classList.remove('hidden');
  }

  show(): void {
    this.cover.classList.remove('hidden');
    this.container.classList.remove('hidden');
    this.container.style.left = `${Math.floor(window.innerWidth / 2 - this.container.clientWidth / 2)}px`;
    this.container.style.top = `${Math.floor(window.innerHeight / 2 - this.container.clientHeight / 2)}px`;
  }

  constructor() {
    super();

    this.btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.hide();
    });

    this.btnBack.addEventListener('click', () => {
      playSfxById(SfxId.TextBoxFocus);
      this.dialogIndex = Math.max(this.dialogIndex - 1, 0);
      this.render();
    });

    this.btnNext.addEventListener('click', () => {
      playSfxById(SfxId.TextBoxFocus);
      this.dialogIndex = Math.min(this.dialogIndex + 1, this.dialog.length - 1);
      this.render();
    });

    this.btnOk.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('reply', {
        questId: this.questId,
        dialogId: this.dialogIndex,
        action: null,
      });
      this.hide();
    });
  }
}
